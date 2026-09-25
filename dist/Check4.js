"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Pieces_1 = require("./Pieces");
const Check4Errors_1 = require("./Check4Errors");
const PIECE_NAMES = ["pawn", "rook", "bishop", "knight"];
const BOARD_SIZE = 4;
/**
 * The Check4 game engine.
 *
 * A two-player 4x4 abstract strategy game. Each player controls 4 chess-flavored
 * pieces (Pawn, Rook, Knight, Bishop) and wins by aligning all four pieces
 * horizontally, vertically, or diagonally.
 *
 * All pieces start in the gutter (off the board). A piece in the gutter may be
 * placed on any empty square. Captured pieces return to the gutter. A piece may
 * never move straight back to the square it just left; the gutter counts as a
 * position, so capture wipes that memory and a freshly dropped piece moves
 * unrestricted.
 */
class Check4 {
    /**
     * Create a new Check4 game instance.
     * @param props - Player configurations. Both p1 and p2 are required.
     * @throws {Error} If either player is missing.
     */
    constructor(props) {
        if (!(props === null || props === void 0 ? void 0 : props.p1) || !(props === null || props === void 0 ? void 0 : props.p2)) {
            throw new Error("You can't create a game without players!");
        }
        this._winCallback = () => { };
        this.state = {
            turn: 1,
            turnCount: 0,
            winner: null,
            p1: this._createPlayer(props.p1, false),
            p2: this._createPlayer(props.p2, true)
        };
        this._resetAllPieces();
    }
    /**
     * Register a callback to be invoked when the game ends.
     * @param fn - Called with the final game state when a winner is declared.
     */
    onWin(fn) {
        this._winCallback = fn;
    }
    /**
     * Execute a move. Throws a GameException subclass if the move is invalid.
     * @param input - The move to attempt.
     * @throws {PlayerTurnException} If it is not this player's turn.
     * @throws {GameOverException} If the game is already over.
     * @throws {IllegalMoveException} If the move violates game rules.
     */
    takeTurn(input) {
        const move = this._normalize(input);
        this._validateMove(move);
        this._applyMove(move);
        this._finalizeTurn(move);
    }
    /**
     * Check whether a move is valid without mutating game state.
     * @param input - The move to validate.
     * @returns `true` if the move is legal, `false` otherwise.
     */
    moveIsValid(input) {
        try {
            this._validateMove(this._normalize(input));
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Enumerate every legal move for the player whose turn it is.
     * @returns An array of legal MoveInput objects (empty if the game is over).
     */
    legalMoves() {
        const moves = [];
        if (this.state.winner !== null)
            return moves;
        for (const piece of PIECE_NAMES) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (let y = 0; y < BOARD_SIZE; y++) {
                    const input = { player: this.state.turn, piece, x, y };
                    if (this.moveIsValid(input))
                        moves.push(input);
                }
            }
        }
        return moves;
    }
    /**
     * Forfeit the game. The current player (or the specified player) loses.
     * @param player - The player forfeiting. Defaults to the player whose turn it is.
     */
    forfeit(player) {
        const loser = player !== null && player !== void 0 ? player : this.state.turn;
        const winner = loser === 1 ? 2 : 1;
        this._declareWinner(winner);
    }
    /**
     * Returns a serializable snapshot of the current game state, including
     * each piece's move memory and the pawns' directions. Feeding this back
     * into setState() reproduces the game exactly.
     */
    getState() {
        const coord = (c) => (c == null ? null : c);
        const pieceSnapshot = (p) => ({
            x: coord(p.x()),
            y: coord(p.y()),
            prev: { x: coord(p.prevCoords[0]), y: coord(p.prevCoords[1]) }
        });
        const playerSnapshot = (p) => ({
            pawn: { ...pieceSnapshot(p.pawn), direction: p.pawn.getDirection() },
            rook: pieceSnapshot(p.rook),
            bishop: pieceSnapshot(p.bishop),
            knight: pieceSnapshot(p.knight)
        });
        return {
            turn: this.state.turn,
            turnCount: this.state.turnCount,
            winner: this.state.winner,
            p1: playerSnapshot(this.state.p1),
            p2: playerSnapshot(this.state.p2)
        };
    }
    /**
     * Returns a canonical string identifying the current position: turn,
     * winner, every piece's coordinates and move memory, and pawn directions.
     * Two states with the same key are identical for rules purposes (the same
     * moves are legal from both). turnCount is deliberately excluded so the
     * key can be used for repetition detection by higher layers.
     */
    stateKey() {
        var _a;
        const c = (v) => (v == null ? "-" : String(v));
        const pieceKey = (p) => `${c(p.x())}${c(p.y())}${c(p.prevCoords[0])}${c(p.prevCoords[1])}`;
        const playerKey = (p) => PIECE_NAMES.map(name => pieceKey(p[name])).join(",") +
            `,${p.pawn.getDirection() === "up" ? "u" : "d"}`;
        return [
            `t${this.state.turn}`,
            `w${(_a = this.state.winner) !== null && _a !== void 0 ? _a : "-"}`,
            playerKey(this.state.p1),
            playerKey(this.state.p2)
        ].join("|");
    }
    /**
     * Overwrite the game state. Validates all fields; throws if malformed.
     * Useful for restoring a saved game.
     *
     * Pieces updated without an explicit `prev` have their move memory cleared
     * (no square is forbidden to them). Pass the `prev` from getState() to
     * restore a game exactly.
     * @param s - The new state to apply.
     * @throws {GameException} If any field is invalid.
     */
    setState(s) {
        const data = s;
        if (data["turn"] !== 1 && data["turn"] !== 2)
            throw new Check4Errors_1.GameException("Invalid turn value");
        const tc = data["turnCount"];
        if (typeof tc !== "number" || !Number.isFinite(tc) || tc < 0)
            throw new Check4Errors_1.GameException("Invalid turnCount value");
        const w = data["winner"];
        if (w !== null && w !== 1 && w !== 2)
            throw new Check4Errors_1.GameException("Invalid winner value");
        this.state.turn = s.turn;
        this.state.turnCount = s.turnCount;
        const updatePlayer = (player, ps) => {
            var _a, _b, _c, _d;
            if (!ps)
                return;
            for (const name of PIECE_NAMES) {
                const input = ps[name];
                if (input === undefined)
                    continue;
                const piece = player[name];
                piece.move(input.x, input.y);
                piece.setPrevCoords((_b = (_a = input.prev) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : null, (_d = (_c = input.prev) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : null);
                if (input.direction !== undefined && piece instanceof Pieces_1.Pawn) {
                    piece.setDirection(input.direction);
                }
            }
        };
        updatePlayer(this.state.p1, s.p1);
        updatePlayer(this.state.p2, s.p2);
        if (s.winner !== null) {
            this._declareWinner(s.winner);
        }
        else {
            this.state.winner = null;
        }
    }
    /* =========================
       Core Move Pipeline
    ========================= */
    /** Normalize and validate raw move input into an internal Move object. */
    _normalize(input) {
        const data = input;
        const player = data["player"];
        const piece = data["piece"];
        const x = data["x"];
        const y = data["y"];
        if (player == null)
            throw new TypeError("No player specified");
        if (player !== 1 && player !== 2)
            throw new TypeError("Invalid player");
        if (piece == null)
            throw new TypeError("No piece specified");
        if (!PIECE_NAMES.includes(piece))
            throw new TypeError(`Unknown piece ${piece} specified`);
        if (!Number.isInteger(x) || !Number.isInteger(y))
            throw new Check4Errors_1.IllegalMoveException("Coordinates must be integers");
        if (x < 0 || y < 0 || x > 3 || y > 3)
            throw new Check4Errors_1.IllegalMoveException("Out of bounds");
        const playerNum = player;
        const pieceName = piece;
        const playerState = playerNum === 1 ? this.state.p1 : this.state.p2;
        return {
            playerNum,
            player: playerState,
            piece: playerState[pieceName],
            x: x,
            y: y
        };
    }
    /**
     * Run the full rules check for a move without mutating state. Throws a
     * GameException subclass describing the first violated rule. Shared by
     * takeTurn, moveIsValid, and legalMoves so the rules live in one place.
     */
    _validateMove(move) {
        this._assertGameActive();
        this._assertTurn(move);
        if (this._inGutter(move.piece)) {
            if (this._occupied(move.x, move.y)) {
                throw new Check4Errors_1.IllegalMoveException("Pieces moved from the gutter must be placed on an empty square");
            }
            return;
        }
        this._assertCanMove(move);
        this._assertNoJumping(move);
        this._assertNotSelfCapture(move);
        this._assertNoBacktrack(move);
    }
    /** Throw if the game is already over. */
    _assertGameActive() {
        if (this.state.winner !== null) {
            throw new Check4Errors_1.GameOverException("Game is already over", this.state);
        }
    }
    /** Throw if it is not this player's turn. */
    _assertTurn(move) {
        if (move.playerNum !== this.state.turn) {
            throw new Check4Errors_1.PlayerTurnException("It's not your turn!");
        }
    }
    /** Throw if the piece's movement rules disallow the target square. */
    _assertCanMove(move) {
        if (!move.piece.canMove(move.x, move.y, !!this._occupied(move.x, move.y))) {
            throw new Check4Errors_1.IllegalMoveException(`${move.piece.name} cannot move to (${move.x},${move.y})`);
        }
    }
    /** Throw if a rook or bishop would need to jump over another piece. */
    _assertNoJumping(move) {
        if (move.piece.name === "bishop")
            this._assertBishopPath(move);
        if (move.piece.name === "rook")
            this._assertRookPath(move);
    }
    /** Throw if the target square holds one of the moving player's own pieces. */
    _assertNotSelfCapture(move) {
        const occupied = this._occupied(move.x, move.y);
        if (occupied && occupied.playerNum === move.playerNum) {
            throw new Check4Errors_1.IllegalMoveException("You cannot capture your own piece");
        }
    }
    /**
     * Throw if the piece is moving straight back to the square it just left.
     * A piece's memory is one square deep and the gutter counts as a position,
     * so captured and freshly dropped pieces are unrestricted.
     */
    _assertNoBacktrack(move) {
        if (move.piece.prevCoords[0] === move.x && move.piece.prevCoords[1] === move.y) {
            throw new Check4Errors_1.IllegalMoveException("A piece cannot move back to the square it just left");
        }
    }
    _assertBishopPath(move) {
        let x = move.piece.x();
        let y = move.piece.y();
        const dx = Math.sign(move.x - x);
        const dy = Math.sign(move.y - y);
        x += dx;
        y += dy;
        while (x !== move.x) {
            if (this._occupied(x, y)) {
                throw new Check4Errors_1.IllegalMoveException("Bishops cannot jump over other pieces");
            }
            x += dx;
            y += dy;
        }
    }
    _assertRookPath(move) {
        const px = move.piece.x();
        const py = move.piece.y();
        if (px === move.x) {
            const [start, end] = [py, move.y].sort((a, b) => a - b);
            for (let i = start + 1; i < end; i++) {
                if (this._occupied(px, i)) {
                    throw new Check4Errors_1.IllegalMoveException("Rooks cannot jump over other pieces");
                }
            }
        }
        else {
            const [start, end] = [px, move.x].sort((a, b) => a - b);
            for (let i = start + 1; i < end; i++) {
                if (this._occupied(i, py)) {
                    throw new Check4Errors_1.IllegalMoveException("Rooks cannot jump over other pieces");
                }
            }
        }
    }
    /**
     * Apply an already-validated move: capture the occupying enemy piece if
     * the square is taken (it returns to the gutter), then move the piece.
     */
    _applyMove(move) {
        const occupied = this._occupied(move.x, move.y);
        if (occupied)
            occupied.piece.reset();
        move.piece.move(move.x, move.y);
    }
    /** Orient the pawn, advance the turn, and check for a win. */
    _finalizeTurn(move) {
        this._orientPawn(move);
        this._endTurn();
        this._checkWin(move);
    }
    /* =========================
       Helpers
    ========================= */
    _occupied(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y))
            throw new TypeError("Coordinates must be integers");
        for (const pNum of [1, 2]) {
            const player = pNum === 1 ? this.state.p1 : this.state.p2;
            for (const name of PIECE_NAMES) {
                const piece = player[name];
                if (piece.x() === x && piece.y() === y) {
                    return { playerNum: pNum, piece };
                }
            }
        }
        return null;
    }
    _inGutter(piece) {
        if (!(piece instanceof Pieces_1.Piece))
            throw new TypeError("Expected a Piece instance");
        return !piece.onBoard();
    }
    _orientPawn(move) {
        if (!(move.piece instanceof Pieces_1.Pawn))
            return;
        if (move.piece.y() === 0)
            move.piece.setDirection("up");
        if (move.piece.y() === 3)
            move.piece.setDirection("down");
    }
    _endTurn() {
        this.state.turn = this.state.turn === 1 ? 2 : 1;
        this.state.turnCount++;
    }
    _checkWin(move) {
        const pieces = [
            move.player.pawn,
            move.player.rook,
            move.player.bishop,
            move.player.knight
        ];
        if (pieces.some(p => this._inGutter(p)))
            return;
        const x0 = pieces[0].x();
        const y0 = pieces[0].y();
        // Horizontal: all pieces share the same row
        if (pieces.every(p => p.y() === y0))
            return this._declareWinner(move.playerNum);
        // Vertical: all pieces share the same column
        if (pieces.every(p => p.x() === x0))
            return this._declareWinner(move.playerNum);
        // Diagonal (\): all pieces share the same x - y value
        const diag = x0 - y0;
        if (pieces.every(p => p.x() - p.y() === diag))
            return this._declareWinner(move.playerNum);
        // Anti-diagonal (/): all pieces share the same x + y value
        const anti = x0 + y0;
        if (pieces.every(p => p.x() + p.y() === anti))
            return this._declareWinner(move.playerNum);
    }
    _declareWinner(player) {
        this.state.winner = player;
        this._winCallback(this.state);
    }
    _createPlayer(input, reversed) {
        var _a, _b, _c, _d, _e;
        return {
            name: (_a = input.name) !== null && _a !== void 0 ? _a : "",
            pawn: (_b = input.pawn) !== null && _b !== void 0 ? _b : new Pieces_1.Pawn({ ...Pieces_1.OFF_BOARD_COORDS, reversed }),
            rook: (_c = input.rook) !== null && _c !== void 0 ? _c : new Pieces_1.Rook({ ...Pieces_1.OFF_BOARD_COORDS }),
            bishop: (_d = input.bishop) !== null && _d !== void 0 ? _d : new Pieces_1.Bishop({ ...Pieces_1.OFF_BOARD_COORDS }),
            knight: (_e = input.knight) !== null && _e !== void 0 ? _e : new Pieces_1.Knight({ ...Pieces_1.OFF_BOARD_COORDS })
        };
    }
    _resetAllPieces() {
        for (const player of [this.state.p1, this.state.p2]) {
            player.pawn.setResetCoords(Pieces_1.OFF_BOARD_COORDS.x, Pieces_1.OFF_BOARD_COORDS.y);
            player.rook.setResetCoords(Pieces_1.OFF_BOARD_COORDS.x, Pieces_1.OFF_BOARD_COORDS.y);
            player.bishop.setResetCoords(Pieces_1.OFF_BOARD_COORDS.x, Pieces_1.OFF_BOARD_COORDS.y);
            player.knight.setResetCoords(Pieces_1.OFF_BOARD_COORDS.x, Pieces_1.OFF_BOARD_COORDS.y);
        }
    }
}
exports.default = Check4;
