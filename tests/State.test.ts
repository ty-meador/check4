"use strict";

import Check4 from "../src/Check4";
import { IllegalMoveException } from "../src/Check4Errors";

const newGame = () => new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

/**
 * Builds a game with rich state: gutter pieces, dropped pieces, a capture,
 * board moves with live move memory, and both pawns flipped from their
 * starting directions.
 */
const playedGame = () => {
	const Game = newGame();
	Game.takeTurn({ player: 1, piece: "pawn", x: 2, y: 3 });   // p1 pawn flips down
	Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 0 });   // p2 pawn flips up
	Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
	Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 3 });
	Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 3 });   // captures p2 rook
	Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });   // re-drop
	Game.takeTurn({ player: 1, piece: "knight", x: 1, y: 1 });
	Game.takeTurn({ player: 2, piece: "bishop", x: 2, y: 2 });
	Game.takeTurn({ player: 1, piece: "knight", x: 3, y: 2 }); // knight remembers (1,1)
	return Game;
};

describe( "State round-trip", () => {
	test( "getState -> setState reproduces the game exactly", () => {
		const Game = playedGame();
		const snapshot = Game.getState();

		const Restored = newGame();
		Restored.setState( snapshot );

		expect( Restored.getState() ).toEqual( snapshot );
		expect( Restored.stateKey() ).toBe( Game.stateKey() );
		expect( Restored.legalMoves() ).toEqual( Game.legalMoves() );
	});

	test( "restored games enforce the no-backtrack rule", () => {
		const Game = playedGame();

		const Restored = newGame();
		Restored.setState( Game.getState() );

		Restored.takeTurn({ player: 2, piece: "bishop", x: 1, y: 3 });

		// p1 knight moved (1,1) -> (3,2) before the snapshot; the memory survives
		let err: Error | null = null;
		try {
			Restored.takeTurn({ player: 1, piece: "knight", x: 1, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}
		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( "A piece cannot move back to the square it just left" );
	});

	test( "pawn directions survive the round-trip", () => {
		const Game = playedGame();
		const snapshot = Game.getState();

		expect( snapshot.p1.pawn.direction ).toBe( "down" );
		expect( snapshot.p2.pawn.direction ).toBe( "up" );

		const Restored = newGame();
		Restored.setState( snapshot );

		expect( Restored.getState().p1.pawn.direction ).toBe( "down" );
		expect( Restored.getState().p2.pawn.direction ).toBe( "up" );
	});

	test( "setState without prev clears a piece's move memory", () => {
		const Game = playedGame();
		expect( Game.getState().p1.knight.prev ).toEqual({ x: 1, y: 1 });

		Game.setState({
			turn: 2,
			turnCount: 9,
			winner: null,
			p1: { knight: { x: 3, y: 2 } }
		});

		expect( Game.getState().p1.knight.prev ).toEqual({ x: null, y: null });
	});
});

describe( "Check4.stateKey", () => {
	test( "identical games produce identical keys", () => {
		expect( playedGame().stateKey() ).toBe( playedGame().stateKey() );
	});

	test( "turnCount does not affect the key", () => {
		const Game = playedGame();
		const snapshot = Game.getState();

		const Other = newGame();
		Other.setState({ ...snapshot, turnCount: snapshot.turnCount + 10 });

		expect( Other.stateKey() ).toBe( Game.stateKey() );
		expect( Other.getState().turnCount ).toBe( snapshot.turnCount + 10 );
	});

	test( "the key changes when the position changes", () => {
		const Game = playedGame();
		const before = Game.stateKey();

		Game.takeTurn({ player: 2, piece: "knight", x: 1, y: 2 });

		expect( Game.stateKey() ).not.toBe( before );
	});

	test( "the key tracks move memory, not just piece placement", () => {
		const Game = playedGame();
		const snapshot = Game.getState();

		// Same placement, wiped knight memory -> different rules state
		const Other = newGame();
		Other.setState({
			...snapshot,
			p1: { ...snapshot.p1, knight: { x: 3, y: 2 } }
		});

		expect( Other.stateKey() ).not.toBe( Game.stateKey() );
	});
});
