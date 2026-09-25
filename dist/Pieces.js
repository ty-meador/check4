"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bishop = exports.Knight = exports.Rook = exports.Pawn = exports.Piece = exports.OFF_BOARD_COORDS = void 0;
exports.OFF_BOARD_COORDS = {
    x: null, y: null
};
/**
 * Parse a coordinate value. `null`/`undefined` pass through untouched (they
 * mean "off the board"); anything else must parse to an integer.
 * @throws {TypeError} If the value is neither null-ish nor a parseable int.
 */
function parseCoord(value) {
    if (value == null)
        return value;
    const parsed = parseInt(String(value));
    if (Number.isNaN(parsed))
        throw new TypeError("Coordinates must be integers or null");
    return parsed;
}
/**
 * A base class from which all other pieces are derived
 */
class Piece {
    constructor(props = {}) {
        this.name = props.name;
        this.skin = props.skin;
        this.type = props.type;
        this.coords = [parseCoord(props.x), parseCoord(props.y)];
        this.initCoords = [this.coords[0], this.coords[1]];
        this.prevCoords = [null, null];
    }
    canMove(_x, _y, _isAttack) {
        return false;
    }
    /**
     * Moves the piece to the specified coordinates and remembers the square it
     * left in `prevCoords`.
     * @param x - The x coordinate to move to (null for the gutter)
     * @param y - The y coordinate to move to (null for the gutter)
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    move(x, y) {
        const px = parseCoord(x);
        const py = parseCoord(y);
        this.prevCoords = [this.coords[0], this.coords[1]];
        this.coords[0] = px;
        this.coords[1] = py;
    }
    /**
     * Overwrites the piece's move memory. Used when restoring a saved game.
     * @param x - The x coordinate the piece is remembered to have left
     * @param y - The y coordinate the piece is remembered to have left
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    setPrevCoords(x, y) {
        this.prevCoords = [parseCoord(x), parseCoord(y)];
    }
    /**
     * Sets the coordinates the piece will be moved to when .reset() is called
     * @param x - The x coordinate
     * @param y - The y coordinate
     * @throws {TypeError} If either coordinate is not a parseable int or null
     */
    setResetCoords(x, y) {
        this.initCoords = [parseCoord(x), parseCoord(y)];
    }
    /**
     * Moves the piece back to its initial coordinates and wipes its move
     * memory. These coordinates can be changed with setResetCoords( x, y )
     */
    reset() {
        this.coords = [...this.initCoords];
        this.prevCoords = [null, null];
    }
    /**
     * Returns the current x coordinate of this piece
     */
    x() {
        return this.coords[0];
    }
    /**
     * Returns the current y coordinate of this piece
     */
    y() {
        return this.coords[1];
    }
    /**
     * Returns true if this piece is on the board (has numeric coordinates)
     */
    onBoard() {
        return this.coords[0] != null && this.coords[1] != null;
    }
}
exports.Piece = Piece;
/**
 * Represents a single Pawn piece
 * @extends {Piece}
 */
class Pawn extends Piece {
    constructor(props = { ...exports.OFF_BOARD_COORDS }) {
        var _a, _b;
        props.name = (_a = props.name) !== null && _a !== void 0 ? _a : "pawn";
        props.type = (_b = props.type) !== null && _b !== void 0 ? _b : "pawn";
        super(props);
        this.reversed = props.reversed || false;
    }
    /**
     * Toggles the pawns direction between up and down
     */
    reverseDirection() {
        this.reversed = !this.reversed;
    }
    /**
     * Sets the direction of the pawn
     * @param dir - The direction you want the pawn to face
     * @throws Error - Throws an error if passed any parameter other than "up" or "down"
     */
    setDirection(dir) {
        if (dir === "up")
            this.reversed = false;
        else if (dir === "down")
            this.reversed = true;
        else
            throw new Error("Pawn direction must be up or down");
    }
    /**
     * Gets the direction of the pawn
     */
    getDirection() {
        return this.reversed ? "down" : "up";
    }
    /**
     * Determines whether the pawn can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @param isAttack - Whether or not this move is an attempt to capture an opponent's piece
     * @override
     */
    canMove(x, y, isAttack = false) {
        if (!this.onBoard())
            return false;
        x = parseInt(String(x));
        y = parseInt(String(y));
        // The number of tiles the requested move is in either direction
        const diffY = y - this.y();
        const diffX = x - this.x();
        // Pawn can NEVER move more than 1 block
        if (Math.abs(diffY) > 1 || Math.abs(diffX) > 1)
            return false;
        if (this.reversed) {
            // Piece cannot move up at all
            if (diffY !== -1)
                return false;
            // Allow pawn to attack diagonally
            if (this._moveIsDiagnoal(x, y) && isAttack)
                return true;
        }
        else {
            // Piece cannot move down at all
            if (diffY !== 1)
                return false;
            // Allow pawn to attack diagonally
            if (this._moveIsDiagnoal(x, y) && isAttack)
                return true;
        }
        // Pawn can never move sideways
        if (x != this.x())
            return false;
        // Pawns cannot attack forward
        if (isAttack)
            return false;
        // Pawn is moving forward to an empty tile
        return true;
    }
    /**
     * Checks if the pawn is trying to move 1 tile in a diagonal direction.
     * NOTE: If the move is diagonal but is more than 1 tile, function returns false
     * @private
     */
    _moveIsDiagnoal(x, y) {
        const diffX = Math.abs(x - this.x());
        const diffY = Math.abs(y - this.y());
        return diffX === 1 && diffY === 1;
    }
}
exports.Pawn = Pawn;
/**
 * Represents a single Rook piece
 * @extends {Piece}
 */
class Rook extends Piece {
    constructor(props = { ...exports.OFF_BOARD_COORDS }) {
        var _a, _b;
        props.name = (_a = props.name) !== null && _a !== void 0 ? _a : "rook";
        props.type = (_b = props.type) !== null && _b !== void 0 ? _b : "rook";
        super(props);
    }
    /**
     * Determines whether the rook can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x, y) {
        if (!this.onBoard())
            return false;
        x = parseInt(String(x));
        y = parseInt(String(y));
        // Horizontal move
        if (x === this.x())
            return true;
        // Vertical move
        else if (y === this.y())
            return true;
        // Diagonal move
        else
            return false;
    }
}
exports.Rook = Rook;
/**
 * Represents a single Knight piece
 * @extends {Piece}
 */
class Knight extends Piece {
    constructor(props = { ...exports.OFF_BOARD_COORDS }) {
        var _a, _b;
        props.name = (_a = props.name) !== null && _a !== void 0 ? _a : "knight";
        props.type = (_b = props.type) !== null && _b !== void 0 ? _b : "knight";
        super(props);
    }
    /**
     * Determines whether the knight can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x, y) {
        if (!this.onBoard())
            return false;
        x = parseInt(String(x));
        y = parseInt(String(y));
        /**
         * We know the Knights move is valid if the absolute value of the difference in
         * one value is 2 and the absolute value of the difference of the other is 1
         */
        return ((Math.abs(x - this.x()) == 2 && Math.abs(y - this.y()) == 1) ||
            (Math.abs(x - this.x()) == 1 && Math.abs(y - this.y()) == 2));
    }
}
exports.Knight = Knight;
/**
 * Represents a single Bishop piece
 * @extends {Piece}
 */
class Bishop extends Piece {
    constructor(props = { ...exports.OFF_BOARD_COORDS }) {
        var _a, _b;
        props.name = (_a = props.name) !== null && _a !== void 0 ? _a : "bishop";
        props.type = (_b = props.type) !== null && _b !== void 0 ? _b : "bishop";
        super(props);
    }
    /**
     * Determines whether the bishop can move from its current coordinates to the
     * specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     * @override
     */
    canMove(x, y) {
        if (!this.onBoard())
            return false;
        x = parseInt(String(x));
        y = parseInt(String(y));
        /**
         * A Bishop's move is valid if the absolute value of the difference in x's is
         * equal to the absolute value of the difference in y's ie, a diagnoal move.
         */
        return Math.abs(x - this.x()) === Math.abs(y - this.y());
    }
}
exports.Bishop = Bishop;
exports.default = {
    "Piece": Piece,
    "Pawn": Pawn,
    "Rook": Rook,
    "Knight": Knight,
    "Bishop": Bishop
};
