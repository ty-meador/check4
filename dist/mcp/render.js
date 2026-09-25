"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveText = moveText;
exports.renderBoard = renderBoard;
exports.renderState = renderState;
exports.renderLegalMoves = renderLegalMoves;
const PIECE_NAMES = ["pawn", "rook", "bishop", "knight"];
const GLYPHS = {
    pawn: "P",
    rook: "R",
    bishop: "B",
    knight: "N"
};
/**
 * Token-lean text rendering of a game state for LLM seats.
 *
 * Layout decisions (deliberate, keep stable — models key on consistency):
 * - Rows print y=3 down to y=0 so "up" (+y, Player 1's starting pawn
 *   direction) is visually up.
 * - Player 1 pieces are UPPERCASE, Player 2 lowercase; `.` is empty.
 * - A one-line legend rides along so raw-mode models never lose the
 *   mapping.
 * - Status lines (gutter, pawn directions, no-backtrack blocks) are
 *   omitted when empty rather than printed blank.
 */
function glyph(player, piece) {
    const g = GLYPHS[piece];
    return player === 1 ? g : g.toLowerCase();
}
/** The move in canonical text form, e.g. `pawn@01`. */
function moveText(move) {
    return `${move.piece}@${move.x}${move.y}`;
}
function eachPiece(snapshot, fn) {
    for (const player of [1, 2]) {
        const side = player === 1 ? snapshot.p1 : snapshot.p2;
        for (const piece of PIECE_NAMES)
            fn(player, piece, side[piece]);
    }
}
/** The 4x4 board with axis labels. */
function renderBoard(snapshot) {
    const cells = Array.from({ length: 4 }, () => [".", ".", ".", "."]);
    eachPiece(snapshot, (player, piece, state) => {
        if (state.x !== null && state.y !== null) {
            cells[state.y][state.x] = glyph(player, piece);
        }
    });
    const rows = [];
    for (let y = 3; y >= 0; y--) {
        rows.push(`${y} ${cells[y].join(" ")}`);
    }
    rows.push("  0 1 2 3");
    return rows.join("\n");
}
/** Full state text: status, board, legend, and situational lines. */
function renderState(snapshot) {
    const lines = [];
    if (snapshot.winner !== null) {
        lines.push(`winner: P${snapshot.winner} (ply ${snapshot.turnCount})`);
    }
    else {
        lines.push(`turn: P${snapshot.turn} (ply ${snapshot.turnCount})`);
    }
    lines.push(renderBoard(snapshot));
    lines.push("P1=UPPER P2=lower P/p=pawn R/r=rook B/b=bishop N/n=knight .=empty");
    const gutter = [[], []];
    const blocked = [[], []];
    eachPiece(snapshot, (player, piece, state) => {
        if (state.x === null) {
            gutter[player - 1].push(glyph(player, piece));
        }
        else if (state.prev.x !== null) {
            blocked[player - 1].push(`${glyph(player, piece)}!=(${state.prev.x},${state.prev.y})`);
        }
    });
    if (gutter[0].length || gutter[1].length) {
        const parts = gutter
            .map((g, i) => (g.length ? `P${i + 1} [${g.join(",")}]` : null))
            .filter((p) => p !== null);
        lines.push(`gutter (drop on any empty square): ${parts.join(" ")}`);
    }
    lines.push(`pawn directions: P1 ${snapshot.p1.pawn.direction} P2 ${snapshot.p2.pawn.direction}`);
    if (blocked[0].length || blocked[1].length) {
        const parts = blocked
            .map((b, i) => (b.length ? `P${i + 1} ${b.join(" ")}` : null))
            .filter((p) => p !== null);
        lines.push(`no-backtrack (piece cannot return to that square): ${parts.join(" | ")}`);
    }
    return lines.join("\n");
}
/** Legal moves as canonical text, e.g. `pawn@01 pawn@21 rook@00 ...`. */
function renderLegalMoves(moves) {
    if (!moves.length)
        return "(none - game over)";
    return moves.map(moveText).join(" ");
}
