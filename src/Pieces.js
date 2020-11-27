"use strict";

/**
 * A base class from which all other pieces are derived
 * @unrestricted
 */
export class Piece {
	constructor( props = {}) {
		if ( props.x && props.x !== null ) props.x = parseInt( props.x );
		if ( props.y && props.y !== null ) props.y = parseInt( props.y );
		if ( Number.isNaN( props.x ) || Number.isNaN( props.y ) )
			throw new Error( "Coordinates must be integers or null" );

		this.name = props.name;
		this.skin = props.skin;
		this.type = props.type;
		this.coords = [props.x, props.y];
		this.initCoords = [props.x, props.y];
	}

	canMove() {
		return false;
	}

	/**
	 * Moves the piece to the specified coordinates
	 * @param {number} x - The x coodinate to move to
	 * @param {number} y - The y coordinate to move to
	 */
	move( x, y ) {
		if ( x !== null ) x = parseInt( x );
		if ( y !== null ) y = parseInt( y );

		if ( Number.isNaN( x ) || Number.isNaN( y ) )
			throw new Error( "Coordinates must be integers or null" );

		this.coords[0] = x;
		this.coords[1] = y;
	}

	/**
	 * Sets the coordinates the the piece will be moved to when .reset() is called
	 * @param {number} x - The x coordinate
	 * @param {number} y - The y coordinate
	 * @throws TypeError - Throws an error if either coordinate is not a parseable int
	 */
	setResetCoords( x, y ) {
		if ( x !== null ) x = parseInt( x );
		if ( y !== null ) y = parseInt( y );

		if ( Number.isNaN( x ) || Number.isNaN( y ) )
			throw new TypeError( "Coordinates must be integers or null" );

		this.initCoords = [x, y];
	}

	/**
	 * Moves the piece back to its initial coordinates. These coordinates can be
	 * chagned with setResetCoords( x, y )
	 */
	reset() {
		this.coords = this.initCoords;
	}

	/**
	 * Returns the current x coordinate of this piece
	 * @returns {number} The pieces current x coordinate
	 */
	x() {
		return this.coords[0];
	}

	/**
	 * Returns the current y coordinate of this piece
	 * @returns {number} The pieces current y coordinate
	 */
	y() {
		return this.coords[1];
	}
}

/**
 * Represents a single Pawn piece
 * @unrestricted
 * @extends {Piece}
 */
export class Pawn extends Piece {
	constructor( props = {}) {
		props.name = props.name || "pawn";
		super( props );
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
	 * @param {('up'|'down')} - The direction you want the pawn to face
	 * @throws Error - Throws an error if its passed any parameter other and "up" or "down"
	 */
	setDirection( dir ) {
		if ( dir === "up" ) this.reversed = false;
		else if ( dir === "down" ) this.reversed = true;
		else throw new Error( "Pawn direction must be up or down" );
	}

	/**
	 * Gets the direction of the pawn
	 * @returns String - "up" or "down"
	 */
	getDirection() {
		return this.reversed ? "down" : "up";
	}

	/**
	 * Determines whether the pawn can move from its current coordinates to the
	 * specified coordinates
	 * @param {number} x - The x coordinate to move to
	 * @param {number} y - The y coordinate to move to
	 * @param {boolean} [isAttack=false] - Whether or not this move is an attempt
	 * to capture an opponents piece
	 * @returns {boolean} - True if the move is legal, false if not
	 * @override
	 */
	canMove( x, y, isAttack = false ) {
		x = parseInt( x );
		y = parseInt( y );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;
		//if ( !isAttack ) isAttack = false;

		// The number of tiles the requested move is in either direction
		let diffY = y - this.y();
		let diffX = x - this.x();

		// Pawn can NEVER move more than 1 block
		if ( Math.abs( diffY ) > 1 || Math.abs( diffX ) > 1 ) return false;

		// console.log( "Is diagonal: ", this._moveIsDiagnoal( move.x, move.y ), "\nis attack: ", move.isAttack );

		if ( this.reversed ) {
			// Piece cannot move up at all
			if ( diffY !== -1 ) return false;

			// Allow pawn to attack diagnoally
			if ( this._moveIsDiagnoal( x, y ) && isAttack ) return true;
		} else {
			// Piece can not move down at all
			if ( diffY !== 1 ) return false;
			// Allow pawn to attack diagnoally
			if ( this._moveIsDiagnoal( x, y ) && isAttack ) return true;
		}
		// Pawn can never move sideways
		if ( x != this.x() ) return false;

		// pawns cannot attack forward
		if ( isAttack ) return false;

		// Pawn is moving forward to an empty tile
		return true;
	}

	/**
	 * Checks if the pawn is trying to move 1 tile in a diagnoal direction.
	 * NOTE: If the move is diagonal but is more than 1 tile, function returns
	 * false
	 * @private
	 * @param {number} x - The x coordinate
	 * @param {number} y - The y coordinate
	 * @returns {boolean} - Only returns true if the move is exactly 1 tile diagnoally
	 */
	_moveIsDiagnoal( x, y ) {
		let diffX = Math.abs( x - this.x() );
		let diffY = Math.abs( y - this.y() );
		return diffX === 1 && diffY === 1;
	}
}

/**
 * Represents a single Rook piece
 * @unrestricted
 * @extends {Piece}
 */
export class Rook extends Piece {
	constructor( props = {}) {
		props.name = props.name || "rook";
		super( props );
	}

	/**
	 * Determines whether the rook can move from its current coordinates to the
	 * specified coordinates
	 * @param {number} x - The x coordinate to move to
	 * @param {number} y - The y coordinate to move to
	 * @returns {boolean} - True if the move is legal, false if not
	 * @override
	 */
	canMove( x, y ) {
		x = parseInt( x );
		y = parseInt( y );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;

		// Horizontal move
		if ( x === this.x() ) return true;
		// Veritcal Move
		else if ( y === this.y() ) return true;
		// Diagonal move
		else return false;
	}
}

/**
 * Represents a single Knight piece
 * @unrestricted
 * @extends {Piece}
 */
export class Knight extends Piece {
	constructor( props = {}) {
		props.name = props.name || "knight";
		super( props );
	}

	/**
	 * Determines whether the knight can move from its current coordinates to the
	 * specified coordinates
	 * @param {number} x - The x coordinate to move to
	 * @param {number} y - The y coordinate to move to
	 * @returns {boolean} - True if the move is legal, false if not
	 * @override
	 */
	canMove( x, y ) {
		x = parseInt( x );
		y = parseInt( y );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;
		/**
		 * We know the Knights move is valid if the absolute value of the difference in
		 * one value is 2 and the absolute value of the difference of the other is 1
		 */
		return (
			( Math.abs( x - this.x() ) == 2 && Math.abs( y - this.y() ) == 1 ) ||
			( Math.abs( x - this.x() ) == 1 && Math.abs( y - this.y() ) == 2 )
		);
	}
}

/**
 * Represents a single Bishop piece
 * @unrestricted
 * @extends {Piece}
 */
export class Bishop extends Piece {
	constructor( props = {}) {
		props.name = props.name || "bishop";
		super( props );
	}

	/**
	 * Determines whether the bishop can move from its current coordinates to the
	 * specified coordinates
	 * @param {number} x - The x coordinate to move to
	 * @param {number} y - The y coordinate to move to
	 * @returns {boolean} - True if the move is legal, false if not
	 * @override
	 */
	canMove( x, y ) {
		x = parseInt( x );
		y = parseInt( y );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;
		/**
		 * A Bishops move is valid if the absolute value of the difference in x's is
		 * equal to the absolute value of the difference in y's
		 */
		return Math.abs( x - this.x() ) === Math.abs( y - this.y() );
	}
}

export default {
	"Piece": Piece,
	"Pawn": Pawn,
	"Rook": Rook,
	"Knight": Knight,
	"Bishop": Bishop
};
