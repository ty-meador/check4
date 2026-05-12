import { Pawn, Rook, Knight, Bishop } from "./Pieces";
export type PlayerNum = 1 | 2;
export type PieceName = "pawn" | "rook" | "bishop" | "knight";
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
export interface SetStateInput {
    turn: PlayerNum;
    turnCount: number;
    winner: PlayerNum | null;
    p1?: Partial<Record<PieceName, {
        x: number | null;
        y: number | null;
    }>>;
    p2?: Partial<Record<PieceName, {
        x: number | null;
        y: number | null;
    }>>;
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
     * Forfeit the game. The current player (or the specified player) loses.
     * @param player - The player forfeiting. Defaults to the player whose turn it is.
     */
    forfeit(player?: PlayerNum): void;
    /**
     * Returns a serializable snapshot of the current game state.
     */
    getState(): {
        turn: PlayerNum;
        turnCount: number;
        winner: PlayerNum | null;
        p1: {
            pawn: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            rook: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            bishop: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            knight: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
        };
        p2: {
            pawn: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            rook: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            bishop: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
            knight: {
                x: import("./Pieces").Coord;
                y: import("./Pieces").Coord;
            };
        };
    };
    /**
     * Overwrite the game state. Validates all fields; throws if malformed.
     * Useful for restoring a saved game.
     * @param s - The new state to apply.
     * @throws {GameException} If any field is invalid.
     */
    setState(s: SetStateInput): void;
    /** Normalize and validate raw move input into an internal Move object. */
    private _normalize;
    /** Throw if the game is already over. */
    private _assertGameActive;
    /** Throw if it is not this player's turn. */
    private _assertTurn;
    /** Handle placement from the gutter. Returns true if the move was handled. */
    private _handleGutterMove;
    /** Validate a gutter placement without mutating state. */
    private _isGutterMoveValid;
    /** Throw if the piece's movement rules disallow the target square. */
    private _assertCanMove;
    /** Throw if a rook or bishop would need to jump over another piece. */
    private _assertNoJumping;
    private _assertBishopPath;
    private _assertRookPath;
    /** Apply a move, capturing the occupying piece if the square is taken. */
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
