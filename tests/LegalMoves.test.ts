"use strict";

import Check4, { MoveInput } from "../src/Check4";

const newGame = () => new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

describe( "Check4.legalMoves", () => {
	test( "a fresh game offers every piece on every square", () => {
		const Game = newGame();
		const moves = Game.legalMoves();

		// 4 gutter pieces x 16 empty squares
		expect( moves.length ).toBe( 64 );
		expect( moves.every( m => m.player === 1 ) ).toBe( true );
	});

	test( "occupied squares are excluded for gutter drops", () => {
		const Game = newGame();
		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		const moves = Game.legalMoves();

		// 4 gutter pieces x 15 empty squares
		expect( moves.length ).toBe( 60 );
		expect( moves.every( m => m.player === 2 ) ).toBe( true );
		expect( moves.some( m => m.x === 0 && m.y === 0 ) ).toBe( false );
	});

	test( "backtrack moves are excluded", () => {
		const Game = newGame();
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 1 });

		const rookMoves = Game.legalMoves().filter( m => m.piece === "rook" );
		expect( rookMoves.some( m => m.x === 0 && m.y === 0 ) ).toBe( false );
		expect( rookMoves.some( m => m.x === 0 && m.y === 3 ) ).toBe( true );
	});

	test( "self-captures are excluded", () => {
		const Game = newGame();
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 1 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 1 });

		// p1 rook may not land on its own pawn at (0,1)
		const rookMoves = Game.legalMoves().filter( m => m.piece === "rook" );
		expect( rookMoves.some( m => m.x === 0 && m.y === 1 ) ).toBe( false );
		expect( Game.moveIsValid({ player: 1, piece: "rook", x: 0, y: 1 }) ).toBe( false );
	});

	test( "a finished game has no legal moves", () => {
		const Game = newGame();
		Game.forfeit( 1 );
		expect( Game.legalMoves() ).toEqual( [] );
	});

	test( "every reported legal move is accepted by takeTurn", () => {
		const Game = newGame();
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "knight", x: 1, y: 1 });
		Game.takeTurn({ player: 2, piece: "bishop", x: 2, y: 2 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });

		const snapshot = Game.getState();
		const moves = Game.legalMoves();

		expect( moves.length ).toBeGreaterThan( 0 );

		for ( const move of moves ) {
			const Replay = newGame();
			Replay.setState( snapshot );
			expect( () => Replay.takeTurn( move ) ).not.toThrow();
		}
	});

	test( "legalMoves agrees with moveIsValid over the whole move space", () => {
		const Game = newGame();
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });

		const legal = new Set(
			Game.legalMoves().map( m => `${m.piece}:${m.x},${m.y}` )
		);

		for ( const piece of ["pawn", "rook", "bishop", "knight"] as const ) {
			for ( let x = 0; x < 4; x++ ) {
				for ( let y = 0; y < 4; y++ ) {
					const input: MoveInput = { player: 2, piece, x, y };
					expect( Game.moveIsValid( input ) ).toBe( legal.has( `${piece}:${x},${y}` ) );
				}
			}
		}
	});
});
