import { MoveInput, StateSnapshot } from "../Check4";
/** The move in canonical text form, e.g. `pawn@01`. */
export declare function moveText(move: MoveInput): string;
/** The 4x4 board with axis labels. */
export declare function renderBoard(snapshot: StateSnapshot): string;
/** Full state text: status, board, legend, and situational lines. */
export declare function renderState(snapshot: StateSnapshot): string;
/** Legal moves as canonical text, e.g. `pawn@01 pawn@21 rook@00 ...`. */
export declare function renderLegalMoves(moves: MoveInput[]): string;
