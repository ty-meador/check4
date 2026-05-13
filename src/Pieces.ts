"use strict";

const GUTTER_X = -1;
const GUTTER_Y = -1;
export type Coord = number | null | undefined;

export interface PieceProps {
	x: number;
	y: number;
	name?: string;
	skin?: string;
	type?: string;
}

/**
 * A base class from which all other pieces are derived
 */
export class Piece {
	name: string | undefined;
	skin: string | undefined;
	type: string | undefined;
	coords: [number, number];
	initCoords: [number, number];

	constructor( props: PieceProps ) {
		if ( Number.isNaN( props.x ) || Number.isNaN( props.y ) )
			throw new Error( "Coordinates must be integers or null" );

		this.name = props.name;
		this.skin = props.skin;
		this.type = props.type;
		this.coords = [props.x, props.y];
		this.initCoords = [props.x, props.y];
	}

	canMove( _x: number, _y: number, _isAttack?: boolean ): boolean {
		return false;
	}

	/**
	 * Moves the piece to the specified coordinates
	 * @param x - The x coordinate to move to
	 * @param y - The y coordinate to move to
	 */
	move( x: number | null, y: number | null ): void {
		if ( x == null ) x = -1;
		if ( y == null ) y = -1;
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );

		if ( Number.isNaN( x ) || Number.isNaN( y ) )
			throw new Error( "Coordinates must be integers or null" );

		this.coords[ 0 ] = x;
		this.coords[ 1 ] = y;
	}

	/**
	 * Sets the coordinates the piece will be moved to when .reset() is called
	 * @param x - The x coordinate
	 * @param y - The y coordinate
	 * @throws TypeError - Throws an error if either coordinate is not a parseable int
	 */
	setResetCoords( x: number | null, y: number | null ): void {
		if ( x == null ) x = -1;
		if ( y == null ) y = -1;
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) )
			throw new TypeError( "Coordinates must be integers or null" );

		this.initCoords = [x, y];
	}

	/**
	 * Moves the piece back to its initial coordinates. These coordinates can be
	 * changed with setResetCoords( x, y )
	 */
	reset(): void {
		this.coords = [...this.initCoords];
	}

	/**
	 * Returns the current x coordinate of this piece
	 */
	x(): Coord {
		return this.coords[ 0 ];
	}

	/**
	 * Returns the current y coordinate of this piece
	 */
	y(): Coord {
		return this.coords[ 1 ];
	}
}

export interface PawnProps extends PieceProps {
	reversed?: boolean;
}

/**
 * Represents a single Pawn piece
 * @extends {Piece}
 */
export class Pawn extends Piece {
	reversed: boolean;

	constructor( props: PawnProps | undefined ) {
		if( !props ) props = {x: GUTTER_X, y: GUTTER_Y};
		props.name = props.name ?? "pawn";
		props.type = props.type ?? "pawn";
		super( props );
		this.reversed = props.reversed || false;
	}

	/**
	 * Toggles the pawns direction between up and down
	 */
	reverseDirection(): void {
		this.reversed = !this.reversed;
	}

	/**
	 * Sets the direction of the pawn
	 * @param dir - The direction you want the pawn to face
	 * @throws Error - Throws an error if passed any parameter other than "up" or "down"
	 */
	setDirection( dir: "up" | "down" ): void {
		if ( dir === "up" ) this.reversed = false;
		else if ( dir === "down" ) this.reversed = true;
		else throw new Error( "Pawn direction must be up or down" );
	}

	/**
	 * Gets the direction of the pawn
	 */
	getDirection(): "up" | "down" {
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
	canMove( x: number, y: number, isAttack = false ): boolean {
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;

		// The number of tiles the requested move is in either direction
		const diffY = y - ( this.y() as number );
		const diffX = x - ( this.x() as number );

		// Pawn can NEVER move more than 1 block
		if ( Math.abs( diffY ) > 1 || Math.abs( diffX ) > 1 ) return false;

		if ( this.reversed ) {
			// Piece cannot move up at all
			if ( diffY !== -1 ) return false;

			// Allow pawn to attack diagonally
			if ( this._moveIsDiagnoal( x, y ) && isAttack ) return true;
		} else {
			// Piece cannot move down at all
			if ( diffY !== 1 ) return false;
			// Allow pawn to attack diagonally
			if ( this._moveIsDiagnoal( x, y ) && isAttack ) return true;
		}
		// Pawn can never move sideways
		if ( x != this.x() ) return false;

		// Pawns cannot attack forward
		if ( isAttack ) return false;

		// Pawn is moving forward to an empty tile
		return true;
	}

	/**
	 * Checks if the pawn is trying to move 1 tile in a diagonal direction.
	 * NOTE: If the move is diagonal but is more than 1 tile, function returns false
	 * @private
	 */
	_moveIsDiagnoal( x: number, y: number ): boolean {
		const diffX = Math.abs( x - ( this.x() as number ) );
		const diffY = Math.abs( y - ( this.y() as number ) );
		return diffX === 1 && diffY === 1;
	}
}

/**
 * Represents a single Rook piece
 * @extends {Piece}
 */
export class Rook extends Piece {
	constructor( props: PieceProps | undefined ) {
		if( !props ) props = {x: GUTTER_X, y: GUTTER_Y};
		props.name = props.name ?? "rook";
		props.type = props.type ?? "rook";
		super( props );
	}

	/**
	 * Determines whether the rook can move from its current coordinates to the
	 * specified coordinates
	 * @param x - The x coordinate to move to
	 * @param y - The y coordinate to move to
	 * @override
	 */
	canMove( x: number, y: number ): boolean {
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;

		// Horizontal move
		if ( x === this.x() ) return true;
		// Vertical move
		else if ( y === this.y() ) return true;
		// Diagonal move
		else return false;
	}
}

/**
 * Represents a single Knight piece
 * @extends {Piece}
 */
export class Knight extends Piece {
	constructor( props: PieceProps = {x: GUTTER_X, y: GUTTER_Y}) {
		props.name = props.name ?? "knight";
		props.type = props.type ?? "knight";
		super( props );
	}

	/**
	 * Determines whether the knight can move from its current coordinates to the
	 * specified coordinates
	 * @param x - The x coordinate to move to
	 * @param y - The y coordinate to move to
	 * @override
	 */
	canMove( x: number, y: number ): boolean {
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;
		/**
		 * We know the Knights move is valid if the absolute value of the difference in
		 * one value is 2 and the absolute value of the difference of the other is 1
		 */
		return (
			( Math.abs( x - ( this.x() as number ) ) == 2 && Math.abs( y - ( this.y() as number ) ) == 1 ) ||
			( Math.abs( x - ( this.x() as number ) ) == 1 && Math.abs( y - ( this.y() as number ) ) == 2 )
		);
	}
}

/**
 * Represents a single Bishop piece
 * @extends {Piece}
 */
export class Bishop extends Piece {
	constructor( props: PieceProps | undefined ) {
		if( !props ) props = {x: GUTTER_X, y: GUTTER_Y};
		props.name = props.name ?? "bishop";
		props.type = props.type ?? "bishop";
		super( props );
	}

	/**
	 * Determines whether the bishop can move from its current coordinates to the
	 * specified coordinates
	 * @param x - The x coordinate to move to
	 * @param y - The y coordinate to move to
	 * @override
	 */
	canMove( x: number, y: number ): boolean {
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) return false;
		/**
		 * A Bishop's move is valid if the absolute value of the difference in x's is
		 * equal to the absolute value of the difference in y's ie, a diagnoal move.
		 */
		return Math.abs( x - ( this.x() as number ) ) === Math.abs( y - ( this.y() as number ) );
	}
}

export default {
	"Piece": Piece,
	"Pawn": Pawn,
	"Rook": Rook,
	"Knight": Knight,
	"Bishop": Bishop
};
