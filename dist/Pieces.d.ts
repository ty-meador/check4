/**
 * A board coordinate component. `null`/`undefined` mean the piece is off the
 * board (in the gutter).
 */
export type Coord = number | null | undefined;
export declare const OFF_BOARD_COORDS: {
    x: Coord;
    y: Coord;
};
export interface PieceProps {
    x?: Coord;
    y?: Coord;
    name?: string;
    skin?: string;
    type?: string;
}
/**
 * A base class from which all other pieces are derived
 */
export declare class Piece {
    name: string | undefined;
    skin: string | undefined;
    type: string | undefined;
    coords: [Coord, Coord];
    initCoords: [Coord, Coord];
    /**
     * The coordinates this piece occupied before its most recent move. Game
     * rules forbid moving a piece straight back to this square. The gutter
     * counts as a position: a captured piece's memory is wiped (reset to the
     * gutter), and a freshly dropped piece remembers the gutter, so neither
     * carries a forbidden square.
     */
    prevCoords: [Coord, Coord];
    constructor(props?: PieceProps);
    canMove(_x: number, _y: number, _isAttack?: boolean): boolean;
    /**
     * Moves the piece to the specified coordinates and remembers the square it
     * left in `prevCoords`.
     * @param x - The x coordinate to move to (null for the gutter)
     * @param y - The y coordinate to move to (null for the gutter)
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    move(x: Coord, y: Coord): void;
    /**
     * Overwrites the piece's move memory. Used when restoring a saved game.
     * @param x - The x coordinate the piece is remembered to have left
     * @param y - The y coordinate the piece is remembered to have left
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    setPrevCoords(x: Coord, y: Coord): void;
    /**
     * Sets the coordinates the piece will be moved to when .reset() is called
     * @param x - The x coordinate
     * @param y - The y coordinate
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    setResetCoords(x: Coord, y: Coord): void;
    /**
     * Moves the piece back to its initial coordinates and wipes its move
     * memory. These coordinates can be changed with setResetCoords( x, y )
     */
    reset(): void;
    /**
     * Returns the current x coordinate of this piece
     */
    x(): Coord;
    /**
     * Returns the current y coordinate of this piece
     */
    y(): Coord;
    /**
     * Returns true if this piece is on the board (has numeric coordinates)
     */
    onBoard(): boolean;
}
export interface PawnProps extends PieceProps {
    reversed?: boolean;
}
/**
 * Represents a single Pawn piece
 * @extends {Piece}
 */
export declare class Pawn extends Piece {
    reversed: boolean;
    constructor(props?: PawnProps);
    /**
     * Toggles the pawns direction between up and down
     */
    reverseDirection(): void;
    /**
     * Sets the direction of the pawn
     * @param dir - The direction you want the pawn to face
     * @throws Error - Throws an error if passed any parameter other than "up" or "down"
     */
    setDirection(dir: "up" | "down"): void;
    /**
     * Gets the direction of the pawn
     */
    getDirection(): "up" | "down";
    /**
     * Determines whether the pawn can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @param isAttack - Whether or not this move is an attempt to capture an opponent's piece
     * @override
     */
    canMove(x: number, y: number, isAttack?: boolean): boolean;
    /**
     * Checks if the pawn is trying to move 1 tile in a diagonal direction.
     * NOTE: If the move is diagonal but is more than 1 tile, function returns false
     * @private
     */
    _moveIsDiagnoal(x: number, y: number): boolean;
}
/**
 * Represents a single Rook piece
 * @extends {Piece}
 */
export declare class Rook extends Piece {
    constructor(props?: PieceProps);
    /**
     * Determines whether the rook can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x: number, y: number): boolean;
}
/**
 * Represents a single Knight piece
 * @extends {Piece}
 */
export declare class Knight extends Piece {
    constructor(props?: PieceProps);
    /**
     * Determines whether the knight can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x: number, y: number): boolean;
}
/**
 * Represents a single Bishop piece
 * @extends {Piece}
 */
export declare class Bishop extends Piece {
    constructor(props?: PieceProps);
    /**
     * Determines whether the bishop can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x: number, y: number): boolean;
}
declare const _default: {
    Piece: typeof Piece;
    Pawn: typeof Pawn;
    Rook: typeof Rook;
    Knight: typeof Knight;
    Bishop: typeof Bishop;
};
export default _default;
