"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bishop = exports.Knight = exports.Rook = exports.Pawn = exports.Piece = void 0;
/**
 * A base class from which all other pieces are derived
 */
class Piece {
    constructor(props = {}) {
        if (props.x && props.x !== null)
            props.x = parseInt(String(props.x));
        if (props.y && props.y !== null)
            props.y = parseInt(String(props.y));
        if (Number.isNaN(props.x) || Number.isNaN(props.y))
            throw new Error("Coordinates must be integers or null");
        this.name = props.name;
        this.skin = props.skin;
        this.type = props.type;
        this.coords = [props.x, props.y];
        this.initCoords = [props.x, props.y];
    }
    canMove(_x, _y, _isAttack) {
        return false;
    }
    /**
     * Moves the piece to the specified coordinates
     * @param x - The x coordinate to move to
     * @param y - The y coordinate to move to
     */
    move(x, y) {
        if (x !== null)
            x = parseInt(String(x));
        if (y !== null)
            y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            throw new Error("Coordinates must be integers or null");
        this.coords[0] = x;
        this.coords[1] = y;
    }
    /**
     * Sets the coordinates the piece will be moved to when .reset() is called
     * @param x - The x coordinate
     * @param y - The y coordinate
     * @throws TypeError - Throws an error if either coordinate is not a parseable int
     */
    setResetCoords(x, y) {
        if (x !== null)
            x = parseInt(String(x));
        if (y !== null)
            y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            throw new TypeError("Coordinates must be integers or null");
        this.initCoords = [x, y];
    }
    /**
     * Moves the piece back to its initial coordinates. These coordinates can be
     * changed with setResetCoords( x, y )
     */
    reset() {
        this.coords = [...this.initCoords];
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
}
exports.Piece = Piece;
/**
 * Represents a single Pawn piece
 * @extends {Piece}
 */
class Pawn extends Piece {
    constructor(props = {}) {
        props.name = props.name || "pawn";
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
        x = parseInt(String(x));
        y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            return false;
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
    constructor(props = {}) {
        props.name = props.name || "rook";
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
        x = parseInt(String(x));
        y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            return false;
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
    constructor(props = {}) {
        props.name = props.name || "knight";
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
        x = parseInt(String(x));
        y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            return false;
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
    constructor(props = {}) {
        props.name = props.name || "bishop";
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
        x = parseInt(String(x));
        y = parseInt(String(y));
        if (Number.isNaN(x) || Number.isNaN(y))
            return false;
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
