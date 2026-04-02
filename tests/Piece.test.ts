"use strict";

import {
	Piece
} from "../src/Pieces";

test( "Piece properly initializes", () => {
	const P = new Piece({});
});

test( "Initializing a piece with NaN coordinates throws an error", () => {
	let err: Error | null = null;
	try {
		// @ts-expect-error - testing runtime validation of invalid input
		const P = new Piece({ x: "a", y: 0 });
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
	err = null;

	try {
		// @ts-expect-error - testing runtime validation of invalid input
		const P = new Piece({ x: 0, y: "a" });
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
	err = null;

	try {
		// @ts-expect-error - testing runtime validation of invalid input
		const P = new Piece({ x: "a", y: "a" });
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
});

test( "Piece.move accepts null for either coordinate", () => {
	const P = new Piece();

	expect( () => {
		P.move( null, 0 );
	}).not.toThrow();

	expect( () => {
		P.move( 0, null );
	}).not.toThrow();

	expect( () => {
		P.move( null, null );
	}).not.toThrow();
});

test( "move throws error if either coordinate is NaN", () => {
	const P = new Piece();
	let err: Error | null = null;
	try {
		// @ts-expect-error - testing runtime validation of invalid input
		P.move( "X", 0 );
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
	err = null;

	try {
		// @ts-expect-error - testing runtime validation of invalid input
		P.move( 0, "y" );
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
	err = null;

	try {
		// @ts-expect-error - testing runtime validation of invalid input
		P.move( "x", "y" );
	} catch ( e ) {
		err = e as Error;
	}

	expect( err!.message ).toBe( "Coordinates must be integers or null" );
});

test( "setResetCoords changes the initial coordinates", () => {
	let P = new Piece({ x: 4, y: 4 });
	P.setResetCoords( 2, 2 );
	expect( P.initCoords[0] ).toBe( 2 );
	expect( P.initCoords[1] ).toBe( 2 );

	P = new Piece();
	P.setResetCoords( 2, 2 );
	expect( P.initCoords[0] ).toBe( 2 );
	expect( P.initCoords[1] ).toBe( 2 );
});

test( "calling setResetCoords with NaN parameter throws an error", () => {
	const P = new Piece();

	let err: Error | null = null;
	try {
		// @ts-expect-error - testing runtime validation of invalid input
		P.setResetCoords( "x", 0 );
	} catch ( e ) {
		err = e as Error;
	}
	expect( err!.message ).toBe( "Coordinates must be integers or null" );

	err = null;
	try {
		// @ts-expect-error - testing runtime validation of invalid input
		P.setResetCoords( 0, "x" );
	} catch ( e ) {
		err = e as Error;
	}
	expect( err!.message ).toBe( "Coordinates must be integers or null" );
});

test( "Initializing a piece with only 1 coordinate does not throw error", () => {
	let err: Error | null = null;
	let P: Piece | undefined;

	try {
		P = new Piece({ x: 5 });
	} catch ( e ) {
		err = e as Error;
	}
	expect( err ).toBe( null );
	expect( P!.x() ).toBe( 5 );
	expect( P!.y() ).toBe( undefined );

	err = null;
	try {
		P = new Piece({ y: 5 });
	} catch ( e ) {
		err = e as Error;
	}
	expect( err ).toBe( null );
	expect( P!.y() ).toBe( 5 );
	expect( P!.x() ).toBe( undefined );
});

test( "Piece can be initialized with coordinates", () => {
	const P = new Piece({ x: 2, y: 4 });

	expect( P.coords[0] ).toBe( 2 );
	expect( P.coords[1] ).toBe( 4 );
});

test( "Piece can be instantiated with name property", () => {
	const NAME = "MY PIECE";
	const P = new Piece({ name: NAME });
	expect( P.name ).toBe( NAME );
});

test( "Piece can be instantiated with skin property", () => {
	const SKIN = "MY_CUSTOM_SKIN_NAME";
	const P = new Piece({ skin: SKIN });
	expect( P.skin ).toBe( SKIN );
});

test( "Piece can be instantiated with type property", () => {
	const TYPE = "QUEEN";
	const P = new Piece({ type: TYPE });
	expect( P.type ).toBe( TYPE );
});

test( "Piece sets initCoords based on x and y props", () => {
	const P = new Piece({ x: 2, y: 5 });
	expect( P.initCoords[0] ).toBe( 2 );
	expect( P.initCoords[1] ).toBe( 5 );
});

test( "Piece.move sets the pieces coordinates to those specified", () => {
	const P = new Piece({ x: 0, y: 0 });
	P.move( 3, 5 );
	expect( P.coords[0] ).toBe( 3 );
	expect( P.coords[1] ).toBe( 5 );
});

test( "Piece.canMove returns false", () => {
	const P = new Piece();
	expect( P.canMove( 0, 0 ) ).toBe( false );
});

test( "Piece.reset changes the current coordinates back to the initial coordinates", () => {
	const P = new Piece({ x: 0, y: 0 });

	P.move( 3, 5 );
	expect( P.coords[0] ).toBe( 3 );
	expect( P.coords[1] ).toBe( 5 );

	P.reset();
	expect( P.coords[0] ).toBe( 0 );
	expect( P.coords[1] ).toBe( 0 );
});

test( "Piece.x() and Piece.y() return current coordinates", () => {
	const P = new Piece({ x: 0, y: 1 });

	expect( P.x() ).toBe( 0 );
	expect( P.x() ).toBe( P.coords[0] );
	expect( P.y() ).toBe( 1 );
	expect( P.y() ).toBe( P.coords[1] );

	P.move( 3, 5 );
	expect( P.x() ).toBe( 3 );
	expect( P.x() ).toBe( P.coords[0] );
	expect( P.y() ).toBe( 5 );
	expect( P.y() ).toBe( P.coords[1] );
});
