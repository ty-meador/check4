import {
	Knight,
	Piece
} from "../src/Pieces";

test( "Knight class extends Piece class", () => {
	const K = new Knight();
	expect( K instanceof Piece ).toBe( true );
});

test( "canMove returns false if a coordinate is NaN", () => {
	const from = { x: 0, y: 2 };
	const to = { x: "a", y: 3 };
	const K = new Knight( from );
	// @ts-expect-error - testing runtime validation of invalid input
	expect( K.canMove( to.x, to.y ) ).toBe( false );
});

test( "Movement test #1", () => {
	const from = { x: 1, y: 1 };
	const to = { x: 2, y: 3 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( true );
});

test( "Movement test #2", () => {
	const from = { x: 2, y: 3 };
	const to = { x: 1, y: 1 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( true );
});

test( "Movement test #3", () => {
	const from = { x: 0, y: 0 };
	const to = { x: 0, y: 1 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( false );
});

test( "Movement test #4", () => {
	const from = { x: 1, y: 1 };
	const to = { x: 3, y: 2 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( true );
});

test( "Movement test #5", () => {
	const from = { x: 3, y: 2 };
	const to = { x: 1, y: 1 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( true );
});

test( "Movement test #6", () => {
	const from = { x: 1, y: 1 };
	const to = { x: 2, y: 2 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( false );
});

test( "Movement test #7", () => {
	const from = { x: 2, y: 3 };
	const to = { x: 0, y: 2 };
	const K = new Knight( from );
	expect( K.canMove( to.x, to.y ) ).toBe( true );
});
