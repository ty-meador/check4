"use strict";
import {
	Rook,
	Piece
} from "./Pieces.js";

test( "rook is subclass of Piece", () => {
	const R = new Rook();
	expect( R instanceof Piece ).toBe( true );
});

test( "Rook can move up any number of spaces", () => {
	const from = {
		x: 0,
		y: 2
	};
	const to = {
		near: {
			x: 0,
			y: 3
		},
		far: {
			x: 0,
			y: 9
		}
	};
	const R = new Rook( from );

	expect( R.canMove( to.near.x, to.near.y )).toBe( true );
	expect( R.canMove( to.far.x, to.near.y )).toBe( true );
});

test( "Rook can move left any number of spaces", () => {
	const from = {
		x: 2,
		y: 2
	};
	const to = {
		near: {
			x: 1,
			y: 2
		},
		far: {
			x: 0,
			y: 2
		}
	};
	const R = new Rook( from );

	expect( R.canMove( to.near.x, to.near.y )).toBe( true );
	expect( R.canMove( to.far.x, to.near.y )).toBe( true );
});

test( "Rook can move down any number of spaces", () => {
	const from = {
		x: 2,
		y: 2
	};
	const to = {
		near: {
			x: 2,
			y: 1
		},
		far: {
			x: 2,
			y: 0
		}
	};
	const R = new Rook( from );

	expect( R.canMove( to.near.x, to.near.y )).toBe( true );
	expect( R.canMove( to.far.x, to.far.y )).toBe( true );
});

test( "Rook can move right any number of spaces", () => {
	const from = {
		x: 2,
		y: 2
	};
	const to = {
		near: {
			x: 3,
			y: 2
		},
		far: {
			x: 6,
			y: 2
		}
	};
	const R = new Rook( from );

	expect( R.canMove( to.near.x, to.near.y )).toBe( true );
	expect( R.canMove( to.far.x, to.far.y )).toBe( true );
});

test( "Rook cannot move diagnoally", () => {
	const from = {
		x: 2,
		y: 1
	};
	const to = {
		ne: {
			x: 3,
			y: 2
		},
		nw: {
			x: 1,
			y: 2
		},
		se: {
			x: 3,
			y: 0
		},
		sw: {
			x: 1,
			y: 0
		}
	};
	const R = new Rook( from );

	expect( R.canMove( to.ne.x, to.ne.y )).toBe( false );
	expect( R.canMove( to.nw.x, to.nw.y )).toBe( false );
	expect( R.canMove( to.se.x, to.se.y )).toBe( false );
	expect( R.canMove( to.sw.x, to.sw.y )).toBe( false );
});

test( "Rook cannot hop across the board", () => {
	const from = {
		x: 0,
		y: 0
	};
	const to = {
		x: 5,
		y: 5
	};
	const R = new Rook( from );

	expect( R.canMove( to )).toBe( false );
});

test( "canMove returns false if a coordinate is NaN", () => {
	const R = new Rook();

	expect( R.canMove( 0, "fooBar" )).toBe( false );
	expect( R.canMove( "fooBar", 0 )).toBe( false );

});
