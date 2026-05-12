"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Pieces_1 = require("./Pieces");
const Check4Errors_1 = require("./Check4Errors");
/**
 * The Check4 game engine.
 *
 * A two-player 4x4 abstract strategy game. Each player controls 4 chess-flavored
 * pieces (Pawn, Rook, Knight, Bishop) and wins by aligning all four pieces
 * horizontally, vertically, or diagonally.
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
        this._assertGameActive();
        this._assertTurn(move);
        if (this._handleGutterMove(move))
            return;
        this._assertCanMove(move);
        this._assertNoJumping(move);
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
            const move = this._normalize(input);
            this._assertGameActive();
            this._assertTurn(move);
            if (this._isGutterMoveValid(move))
                return true;
            this._assertCanMove(move);
            this._assertNoJumping(move);
            return true;
        }
        catch (_a) {
            return false;
        }
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
     * Returns a serializable snapshot of the current game state.
     */
    getState() {
        const snapshot = (p) => ({
            pawn: { x: p.pawn.x(), y: p.pawn.y() },
            rook: { x: p.rook.x(), y: p.rook.y() },
            bishop: { x: p.bishop.x(), y: p.bishop.y() },
            knight: { x: p.knight.x(), y: p.knight.y() }
        });
        return {
            turn: this.state.turn,
            turnCount: this.state.turnCount,
            winner: this.state.winner,
            p1: snapshot(this.state.p1),
            p2: snapshot(this.state.p2)
        };
    }
    /**
     * Overwrite the game state. Validates all fields; throws if malformed.
     * Useful for restoring a saved game.
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
            if (!ps)
                return;
            for (const name of ["pawn", "rook", "bishop", "knight"]) {
                const coords = ps[name];
                if (coords !== undefined)
                    player[name].move(coords.x, coords.y);
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
        const validPieces = ["pawn", "rook", "bishop", "knight"];
        if (!validPieces.includes(piece))
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
    /** Handle placement from the gutter. Returns true if the move was handled. */
    _handleGutterMove(move) {
        if (!this._inGutter(move.piece))
            return false;
        if (this._occupied(move.x, move.y)) {
            throw new Check4Errors_1.IllegalMoveException("Pieces moved from the gutter must be placed on an empty square");
        }
        move.piece.move(move.x, move.y);
        this._orientPawn(move);
        this._endTurn();
        this._checkWin(move);
        return true;
    }
    /** Validate a gutter placement without mutating state. */
    _isGutterMoveValid(move) {
        if (!this._inGutter(move.piece))
            return false;
        if (this._occupied(move.x, move.y)) {
            throw new Check4Errors_1.IllegalMoveException("Pieces moved from the gutter must be placed on an empty square");
        }
        return true;
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
    /** Apply a move, capturing the occupying piece if the square is taken. */
    _applyMove(move) {
        const occupied = this._occupied(move.x, move.y);
        if (occupied) {
            if (occupied.playerNum === move.playerNum) {
                throw new Check4Errors_1.IllegalMoveException("You cannot capture your own piece");
            }
            occupied.piece.reset();
        }
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
            for (const name of ["pawn", "rook", "bishop", "knight"]) {
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
        return piece.x() === null && piece.y() === null;
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
            pawn: (_b = input.pawn) !== null && _b !== void 0 ? _b : new Pieces_1.Pawn({ x: null, y: null, reversed }),
            rook: (_c = input.rook) !== null && _c !== void 0 ? _c : new Pieces_1.Rook({ x: null, y: null }),
            bishop: (_d = input.bishop) !== null && _d !== void 0 ? _d : new Pieces_1.Bishop({ x: null, y: null }),
            knight: (_e = input.knight) !== null && _e !== void 0 ? _e : new Pieces_1.Knight({ x: null, y: null })
        };
    }
    _resetAllPieces() {
        for (const player of [this.state.p1, this.state.p2]) {
            player.pawn.setResetCoords(null, null);
            player.rook.setResetCoords(null, null);
            player.bishop.setResetCoords(null, null);
            player.knight.setResetCoords(null, null);
        }
    }
}
exports.default = Check4;
