"use strict";

import Check4 from "../src/Check4";
import { IllegalMoveException } from "../src/Check4Errors";

const newGame = () => new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

describe( "No-backtrack rule", () => {
	test( "a piece cannot move back to the square it just left", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( "A piece cannot move back to the square it just left" );
	});

	test( "the old square is forgiven once the piece moves somewhere else", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 3 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 2 });

		// (0,0) was two rook moves ago; only (0,2) is forbidden now
		expect( () => {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		}).not.toThrow();
	});

	test( "move memory is tracked in the state snapshot", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		expect( Game.getState().p1.rook.prev ).toEqual({ x: null, y: null });

		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		expect( Game.getState().p1.rook.prev ).toEqual({ x: 0, y: 0 });
	});

	test( "capture wipes the captured piece's move memory", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 3 });
		// p1 rook captures p2 rook
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 3 });

		const p2Rook = Game.getState().p2.rook;
		expect( p2Rook.x ).toBe( null );
		expect( p2Rook.y ).toBe( null );
		expect( p2Rook.prev ).toEqual({ x: null, y: null });
	});

	test( "a captured piece can re-drop on the square it was captured on", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 3 });
		// p1 rook captures p2 rook on (0,3)...
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 3 });
		Game.takeTurn({ player: 2, piece: "knight", x: 3, y: 0 });
		// ...then vacates the square
		Game.takeTurn({ player: 1, piece: "rook", x: 2, y: 3 });

		// The gutter counts as a position, so the capture square is fair game
		expect( () => {
			Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 3 });
		}).not.toThrow();
	});

	test( "a freshly dropped piece's first move is unrestricted", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });

		// Just dropped: memory reads "gutter", so every rook move is available
		expect( Game.getState().p1.rook.prev ).toEqual({ x: null, y: null });
		expect( () => {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		}).not.toThrow();
	});

	test( "moveIsValid reports a backtrack as invalid", () => {
		const Game = newGame();

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 1 });

		expect( Game.moveIsValid({ player: 1, piece: "rook", x: 0, y: 0 }) ).toBe( false );
		expect( Game.moveIsValid({ player: 1, piece: "rook", x: 0, y: 3 }) ).toBe( true );
	});
});
