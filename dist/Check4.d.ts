import { Pawn, Rook, Knight, Bishop } from "./Pieces";
export type PlayerNum = 1 | 2;
export type PieceName = "pawn" | "rook" | "bishop" | "knight";
export type PawnDirection = "up" | "down";
export interface PlayerState {
    name: string;
    pawn: Pawn;
    rook: Rook;
    bishop: Bishop;
    knight: Knight;
}
export interface GameState {
    turn: PlayerNum;
    turnCount: number;
    winner: PlayerNum | null;
    p1: PlayerState;
    p2: PlayerState;
}
export interface MoveInput {
    player: PlayerNum;
    piece: PieceName;
    x: number;
    y: number;
}
export interface PieceSnapshot {
    x: number | null;
    y: number | null;
    /** The square this piece occupied before its last move (null = gutter). */
    prev: {
        x: number | null;
        y: number | null;
    };
}
export interface PawnSnapshot extends PieceSnapshot {
    direction: PawnDirection;
}
export interface PlayerSnapshot {
    pawn: PawnSnapshot;
    rook: PieceSnapshot;
    bishop: PieceSnapshot;
    knight: PieceSnapshot;
}
export interface StateSnapshot {
    turn: PlayerNum;
    turnCount: number;
    winner: PlayerNum | null;
    p1: PlayerSnapshot;
    p2: PlayerSnapshot;
}
export interface SetStatePieceInput {
    x: number | null;
    y: number | null;
    prev?: {
        x: number | null;
        y: number | null;
    };
    /** Only meaningful for the pawn; ignored on other pieces. */
    direction?: PawnDirection;
}
export interface SetStateInput {
    turn: PlayerNum;
    turnCount: number;
    winner: PlayerNum | null;
    p1?: Partial<Record<PieceName, SetStatePieceInput>>;
    p2?: Partial<Record<PieceName, SetStatePieceInput>>;
}
export interface Check4Props {
    p1: Partial<PlayerState> & {
        name?: string;
    };
    p2: Partial<PlayerState> & {
        name?: string;
    };
}
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
export default class Check4 {
    /** Live game state — piece objects, turn, winner. */
    state: GameState;
    private _winCallback;
    /**
     * Create a new Check4 game instance.
     * @param props - Player configurations. Both p1 and p2 are required.
     * @throws {Error} If either player is missing.
     */
    constructor(props?: Check4Props);
    /**
     * Register a callback to be invoked when the game ends.
     * @param fn - Called with the final game state when a winner is declared.
     */
    onWin(fn: (state: GameState) => void): void;
    /**
     * Execute a move. Throws a GameException subclass if the move is invalid.
     * @param input - The move to attempt.
     * @throws {PlayerTurnException} If it is not this player's turn.
     * @throws {GameOverException} If the game is already over.
     * @throws {IllegalMoveException} If the move violates game rules.
     */
    takeTurn(input: MoveInput): void;
    /**
     * Check whether a move is valid without mutating game state.
     * @param input - The move to validate.
     * @returns `true` if the move is legal, `false` otherwise.
     */
    moveIsValid(input: MoveInput): boolean;
    /**
     * Enumerate every legal move for the player whose turn it is.
     * @returns An array of legal MoveInput objects (empty if the game is over).
     */
    legalMoves(): MoveInput[];
    /**
     * Forfeit the game. The current player (or the specified player) loses.
     * @param player - The player forfeiting. Defaults to the player whose turn it is.
     */
    forfeit(player?: PlayerNum): void;
    /**
     * Returns a serializable snapshot of the current game state, including
     * each piece's move memory and the pawns' directions. Feeding this back
     * into setState() reproduces the game exactly.
     */
    getState(): StateSnapshot;
    /**
     * Returns a canonical string identifying the current position: turn,
     * winner, every piece's coordinates and move memory, and pawn directions.
     * Two states with the same key are identical for rules purposes (the same
     * moves are legal from both). turnCount is deliberately excluded so the
     * key can be used for repetition detection by higher layers.
     */
    stateKey(): string;
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
    setState(s: SetStateInput): void;
    /** Normalize and validate raw move input into an internal Move object. */
    private _normalize;
    /**
     * Run the full rules check for a move without mutating state. Throws a
     * GameException subclass describing the first violated rule. Shared by
     * takeTurn, moveIsValid, and legalMoves so the rules live in one place.
     */
    private _validateMove;
    /** Throw if the game is already over. */
    private _assertGameActive;
    /** Throw if it is not this player's turn. */
    private _assertTurn;
    /** Throw if the piece's movement rules disallow the target square. */
    private _assertCanMove;
    /** Throw if a rook or bishop would need to jump over another piece. */
    private _assertNoJumping;
    /** Throw if the target square holds one of the moving player's own pieces. */
    private _assertNotSelfCapture;
    /**
     * Throw if the piece is moving straight back to the square it just left.
     * A piece's memory is one square deep and the gutter counts as a position,
     * so captured and freshly dropped pieces are unrestricted.
     */
    private _assertNoBacktrack;
    private _assertBishopPath;
    private _assertRookPath;
    /**
     * Apply an already-validated move: capture the occupying enemy piece if
     * the square is taken (it returns to the gutter), then move the piece.
     */
    private _applyMove;
    /** Orient the pawn, advance the turn, and check for a win. */
    private _finalizeTurn;
    private _occupied;
    private _inGutter;
    private _orientPawn;
    private _endTurn;
    private _checkWin;
    private _declareWinner;
    private _createPlayer;
    private _resetAllPieces;
}
