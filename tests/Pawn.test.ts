"use strict";

import {
	Pawn,
	Piece
} from "../src/Pieces";

test( "reversed property defaults to false", () => {
	const P = new Pawn();
	expect( P.reversed ).toBe( false );
});

test( "Pawn class extends Piece class", () => {
	const P = new Pawn();
	expect( P instanceof Piece ).toBe( true );
});

test( "canMove returns false if a coordinate is NaN", () => {
	const P = new Pawn();

	// @ts-expect-error - testing runtime validation of invalid input
	expect( P.canMove({ x: 0, y: "fooBar" }) ).toBe( false );
	// @ts-expect-error - testing runtime validation of invalid input
	expect( P.canMove({ x: "fooBar", y: 0 }) ).toBe( false );
});

test( "pawn can be reversed", () => {
	const P = new Pawn();
	expect( P.reversed ).toBe( false );
	P.reverseDirection();
	expect( P.reversed ).toBe( true );
	P.reverseDirection();
	expect( P.reversed ).toBe( false );
});

test( "Pawn.getDirection returns correct value", () => {
	const P = new Pawn();
	expect( P.getDirection() ).toBe( "up" );
	P.reverseDirection();
	expect( P.getDirection() ).toBe( "down" );
});

test( "pawn can be initialized with reverse property", () => {
	const P = new Pawn({ reversed: true });
	expect( P.reversed ).toBe( true );
});

test( "pawn can be initialized with coordinates", () => {
	const P = new Pawn({ x: 0, y: 3 });
	expect( P.x() ).toBe( 0 );
	expect( P.y() ).toBe( 3 );
});

test( "Set direction works", () => {
	const P = new Pawn();
	expect( P.reversed ).toBe( false );
	P.setDirection( "down" );
	expect( P.reversed ).toBe( true );
	P.setDirection( "up" );
	expect( P.reversed ).toBe( false );
});

test( "Setting an invalid direction throws an error", () => {
	const P = new Pawn();
	expect( () => {
		// @ts-expect-error - testing runtime validation of invalid input
		P.setDirection( "foo" );
	}).toThrow();
});

test( "Pawn move test 1", () => {
	const from = { x: 0, y: 2 };
	const to = { x: 2, y: 2 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});

test( "Pawn move test 2", () => {
	const from = { x: 2, y: 2 };
	const to = { x: 0, y: 2 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});

test( "Pawn move test 3", () => {
	const from = { x: 1, y: 1 };
	const to = { x: 2, y: 2 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( true );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});

test( "Pawn move test 4", () => {
	const from = { x: 1, y: 1 };
	const to = { x: 2, y: 0 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( true );
});

test( "Pawn move test 5", () => {
	const from = { x: 2, y: 1 };
	const to = { x: 2, y: 2 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( true );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});

test( "Pawn move test 6", () => {
	const from = { x: 2, y: 2 };
	const to = { x: 2, y: 1 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( true );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});

test( "Pawn move test 7", () => {
	const from = { x: 0, y: 0 };
	const to = { x: 2, y: 4 };
	const P = new Pawn( from );

	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );

	P.reverseDirection();
	expect( P.canMove( to.x, to.y, false ) ).toBe( false );
	expect( P.canMove( to.x, to.y, true ) ).toBe( false );
});
