"use strict";

import Check4 from "../src/Check4";

import {
	Pawn,
	Bishop,
	Rook,
	Knight,
	Piece
} from "../src/Pieces";

import {
	GameException,
	PlayerTurnException,
	IllegalMoveException,
	GameOverException
} from "../src/Check4Errors";

const INITIAL_PLAYER_STATE = {
	pawn: { x: null as number | null, y: null as number | null },
	rook: { x: null as number | null, y: null as number | null },
	bishop: { x: null as number | null, y: null as number | null },
	knight: { x: null as number | null, y: null as number | null }
};

describe( "Check4 class", () => {
	test( "creating game without players throws an error", () => {
		try {
			const Game = new Check4();
			(Game as Check4 & { x: number }).x = 0;
		} catch ( e ) {
			expect( (e as Error).message ).toBe( "You can't create a game without players!" );
		}
	});

	test( "defaults all pieces to null coordinates", () => {
		const Game = new Check4({
			p1: { name: "player1" },
			p2: { name: "player2" }
		});

		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.rook.x() ).toBe( null );
		expect( Game.state.p1.knight.x() ).toBe( null );
		expect( Game.state.p1.bishop.x() ).toBe( null );

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.rook.x() ).toBe( null );
		expect( Game.state.p2.knight.x() ).toBe( null );
		expect( Game.state.p2.bishop.x() ).toBe( null );
	});

	test( "Check4 class can be instantiated with existing pieces", () => {
		const Game = new Check4({
			p1: {
				pawn: new Pawn({ x: 0, y: 0 }),
				rook: new Rook({ x: 1, y: 1 }),
				bishop: new Bishop({ x: 2, y: 2 }),
				knight: new Knight({ x: 3, y: 3 })
			},
			p2: {
				pawn: new Pawn({ x: 0, y: 0 }),
				rook: new Rook({ x: 1, y: 1 }),
				bishop: new Bishop({ x: 2, y: 2 }),
				knight: new Knight({ x: 3, y: 3 })
			}
		});

		expect( Game.state.p1.pawn.x() ).toBe( 0 );
		expect( Game.state.p1.pawn.y() ).toBe( 0 );
		expect( Game.state.p1.rook.x() ).toBe( 1 );
		expect( Game.state.p1.rook.y() ).toBe( 1 );
		expect( Game.state.p1.bishop.x() ).toBe( 2 );
		expect( Game.state.p1.bishop.y() ).toBe( 2 );
		expect( Game.state.p1.knight.x() ).toBe( 3 );
		expect( Game.state.p1.knight.y() ).toBe( 3 );

		expect( Game.state.p2.pawn.x() ).toBe( 0 );
		expect( Game.state.p2.pawn.y() ).toBe( 0 );
		expect( Game.state.p2.rook.x() ).toBe( 1 );
		expect( Game.state.p2.rook.y() ).toBe( 1 );
		expect( Game.state.p2.bishop.x() ).toBe( 2 );
		expect( Game.state.p2.bishop.y() ).toBe( 2 );
		expect( Game.state.p2.knight.x() ).toBe( 3 );
		expect( Game.state.p2.knight.y() ).toBe( 3 );
	});

	test( "Check4 class sets reset coordinates of all pieces to (null, null)", () => {
		const Game = new Check4({
			p1: {
				pawn: new Pawn({ x: 0, y: 0 }),
				rook: new Rook({ x: 1, y: 1 }),
				bishop: new Bishop({ x: 2, y: 2 }),
				knight: new Knight({ x: 3, y: 3 })
			},
			p2: {
				pawn: new Pawn({ x: 0, y: 0 }),
				rook: new Rook({ x: 1, y: 1 }),
				bishop: new Bishop({ x: 2, y: 2 }),
				knight: new Knight({ x: 3, y: 3 })
			}
		});

		expect( Game.state.p1.pawn.initCoords[0] ).toBe( null );
		expect( Game.state.p1.pawn.initCoords[1] ).toBe( null );
		expect( Game.state.p1.rook.initCoords[0] ).toBe( null );
		expect( Game.state.p1.rook.initCoords[1] ).toBe( null );
		expect( Game.state.p1.bishop.initCoords[0] ).toBe( null );
		expect( Game.state.p1.bishop.initCoords[1] ).toBe( null );
		expect( Game.state.p1.knight.initCoords[0] ).toBe( null );
		expect( Game.state.p1.knight.initCoords[1] ).toBe( null );

		expect( Game.state.p2.pawn.initCoords[0] ).toBe( null );
		expect( Game.state.p2.pawn.initCoords[1] ).toBe( null );
		expect( Game.state.p2.rook.initCoords[0] ).toBe( null );
		expect( Game.state.p2.rook.initCoords[1] ).toBe( null );
		expect( Game.state.p2.bishop.initCoords[0] ).toBe( null );
		expect( Game.state.p2.bishop.initCoords[1] ).toBe( null );
		expect( Game.state.p2.knight.initCoords[0] ).toBe( null );
		expect( Game.state.p2.knight.initCoords[1] ).toBe( null );
	});

	test( "Check4 class creates default pieces at (null, null)", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });
		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.pawn.y() ).toBe( null );
		expect( Game.state.p1.rook.x() ).toBe( null );
		expect( Game.state.p1.rook.y() ).toBe( null );
		expect( Game.state.p1.bishop.x() ).toBe( null );
		expect( Game.state.p1.bishop.y() ).toBe( null );
		expect( Game.state.p1.knight.x() ).toBe( null );
		expect( Game.state.p1.knight.y() ).toBe( null );

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.pawn.y() ).toBe( null );
		expect( Game.state.p2.rook.x() ).toBe( null );
		expect( Game.state.p2.rook.y() ).toBe( null );
		expect( Game.state.p2.bishop.x() ).toBe( null );
		expect( Game.state.p2.bishop.y() ).toBe( null );
		expect( Game.state.p2.knight.x() ).toBe( null );
		expect( Game.state.p2.knight.y() ).toBe( null );
	});

	test( "Check4.getState returns properly formatted state", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 0 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify( INITIAL_PLAYER_STATE ) );

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 1 );
		expect( S.winner ).toBe( null );
		let expectedState: typeof INITIAL_PLAYER_STATE;
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 0, y: 0 } };
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 2, piece: "rook", x: 1, y: 1 });

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 2 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, rook: { x: 1, y: 1 } };
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 1, piece: "bishop", x: 2, y: 2 });

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 3 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 0, y: 0 }, bishop: { x: 2, y: 2 } };
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 2, piece: "knight", x: 3, y: 3 });

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 4 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, rook: { x: 1, y: 1 }, knight: { x: 3, y: 3 } };
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 2 });

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 5 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 0, y: 0 }, rook: { x: 3, y: 2 }, bishop: { x: 2, y: 2 } };
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 3 });

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 6 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 1, y: 3 }, rook: { x: 1, y: 1 }, knight: { x: 3, y: 3 } };
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 1, piece: "knight", x: 2, y: 1 });

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 7 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 0, y: 0 }, rook: { x: 3, y: 2 }, bishop: { x: 2, y: 2 }, knight: { x: 2, y: 1 } };
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify( expectedState ) );

		Game.takeTurn({ player: 2, piece: "bishop", x: 1, y: 2 });

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 8 );
		expect( S.winner ).toBe( null );
		expectedState = { ...INITIAL_PLAYER_STATE, pawn: { x: 1, y: 3 }, rook: { x: 1, y: 1 }, bishop: { x: 1, y: 2 }, knight: { x: 3, y: 3 } };
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify( expectedState ) );
	});
});

describe( "Turn control", () => {
	test( "Cant take turn if it is not your turn", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let CORRECT_ERROR_THROWN = false;
		let errMessage: string | null = null;
		try {
			Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 0 });
		} catch ( e ) {
			if ( e instanceof PlayerTurnException ) {
				CORRECT_ERROR_THROWN = true;
				errMessage = e.message;
			}
		}

		expect( CORRECT_ERROR_THROWN ).toBe( true );
		expect( errMessage ).toBe( "It's not your turn!" );
	});

	test( "Can take turn if it is your turn", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( () => {
			Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });
		}).not.toThrow();
	});

	test( "Taking turn advances game to next turn", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });

		expect( Game.state.turn ).toBe( 2 );
	});

	test( "Each turn alternates players", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( Game.state.turn ).toBe( 1 );

		Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });

		expect( Game.state.turn ).toBe( 2 );
		Game.takeTurn({ player: 2, piece: "knight", x: 0, y: 1 });
		expect( Game.state.turn ).toBe( 1 );
	});
});

describe( "Turn counter", () => {
	test( "increments on each successful turn", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( Game.state.turnCount ).toBe( 0 );

		Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });

		expect( Game.state.turnCount ).toBe( 1 );

		Game.takeTurn({ player: 2, piece: "knight", x: 0, y: 1 });

		expect( Game.state.turnCount ).toBe( 2 );
	});

	test( "does not increment on unsuccessful turns", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( Game.state.turnCount ).toBe( 0 );

		Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });

		expect( Game.state.turnCount ).toBe( 1 );

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( Game.state.turnCount ).toBe( 1 );
		expect( err instanceof PlayerTurnException ).toBe( true );
	});
});

describe( "Movements from the gutter", () => {
	test( "Any piece can move from the gutter to any empty square", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( () => {
			Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 0 });
			Game.takeTurn({ player: 2, piece: "knight", x: 0, y: 1 });
			Game.takeTurn({ player: 1, piece: "bishop", x: 0, y: 2 });
			Game.takeTurn({ player: 2, piece: "bishop", x: 0, y: 3 });
			Game.takeTurn({ player: 1, piece: "rook", x: 1, y: 0 });
			Game.takeTurn({ player: 2, piece: "rook", x: 1, y: 1 });
			Game.takeTurn({ player: 1, piece: "pawn", x: 3, y: 3 });
			Game.takeTurn({ player: 2, piece: "pawn", x: 3, y: 0 });
		}).not.toThrow();
	});

	test( "Piece cannot attack from the gutter", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let GAME_THREW = false;
		let GAME_THREW_MOVEMENT_ERROR = false;
		let ERR_MSG: string | null = null;

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });

		try {
			Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 0 });
		} catch ( e ) {
			GAME_THREW = true;
			if ( e instanceof IllegalMoveException ) {
				GAME_THREW_MOVEMENT_ERROR = true;
				ERR_MSG = e.message;
			}
		}

		expect( GAME_THREW ).toBe( true );
		expect( GAME_THREW_MOVEMENT_ERROR ).toBe( true );
		expect( ERR_MSG ).toBe( "Pieces moved from the gutter must be placed on an empty square" );
	});
});

describe( "Attacks", () => {
	test( "Captured pieces are moved back to the gutter", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 0, y: 1 });

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 1 });

		expect( Game.state.p2.rook.x() ).toBe( null );
		expect( Game.state.p2.rook.y() ).toBe( null );
	});

	test( "Player cannot attack themself", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 3, y: 3 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 1 });
		Game.takeTurn({ player: 2, piece: "knight", x: 3, y: 2 });

		let ERR: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		} catch ( e ) {
			ERR = e as Error;
		}

		expect( ERR instanceof IllegalMoveException ).toBe( true );
		expect( ERR!.message ).toBe( "You cannot capture your own piece" );
	});
});

describe( "Rook and Bishop cannot jump other pieces", () => {
	const rookMsg = "Rooks cannot jump over other pieces";
	const bishMsg = "Bishops cannot jump over other pieces";

	test( "next is called if the piece is not a rook or bishop", () => {

	});

	test( "rook cannot jump a piece above it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece below it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 0 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece to the left of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "rook", x: 2, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece to the right of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( rookMsg );
	});

	test( "bishop cannot jump a piece to the NW of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "bishop", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "bishop", x: 2, y: 2 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 3 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err!.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the NE of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "bishop", x: 1, y: 3 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err!.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the SW of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 3 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "bishop", x: 0, y: 0 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err!.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the SE of it", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "bishop", x: 1, y: 3 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err!.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});
});

describe( "Pawn movement", () => {
	test( "pawn can attack to the NW", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 1, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });

		expect( () => {
			Game.takeTurn({ player: 1, piece: "pawn", x: 2, y: 2 });
		}).not.toThrow();

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.pawn.y() ).toBe( null );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
	});

	test( "pawn can attack to the NE", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 1, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 2 });

		expect( () => {
			Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 2 });
		}).not.toThrow();

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.pawn.y() ).toBe( null );
		expect( Game.state.p1.pawn.x() ).toBe( 0 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
	});

	test( "pawn cannot attack SW", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 2, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "pawn", x: 1, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( "pawn cannot move to (1,1)" );
	});

	test( "pawn cannot attack SE", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 2, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 3, y: 1 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "pawn", x: 3, y: 1 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 3 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err!.message ).toBe( "pawn cannot move to (3,1)" );
	});

	test( "reversed pawn can attack SW", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 1, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });
		Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 3 });

		// Player 2s pawn is reversed by default, unless placed on opponent's home row
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.pawn.y() ).toBe( null );
	});

	test( "reversed pawn can attack SE", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 3, y: 1 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });
		Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 3 });

		Game.takeTurn({ player: 2, piece: "pawn", x: 3, y: 1 });

		expect( Game.state.p2.pawn.x() ).toBe( 3 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.pawn.y() ).toBe( null );
	});

	test( "reversed pawn cannot attack NW", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 3 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 2 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 0 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err!.message ).toBe( "pawn cannot move to (0,2)" );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "reversed pawn cannot attack NE", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 2, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 1, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 3, y: 3 });

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 2 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err!.message ).toBe( "pawn cannot move to (2,2)" );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "pawns direction changes if moved to enemies home row", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( Game.state.p1.pawn.getDirection() ).toBe( "up" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "down" );

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 1 });
		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 3 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 0 });

		expect( Game.state.p1.pawn.getDirection() ).toBe( "down" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "up" );
	});

	test( "pawn direction changes if placed directly on enemies home row from gutter", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( Game.state.p1.pawn.getDirection() ).toBe( "up" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "down" );

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 3 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 0 });

		expect( Game.state.p1.pawn.getDirection() ).toBe( "down" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "up" );
	});
});

describe( "Win scenarios", () => {
	test( "forfet() declares a winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let WINNER_DECLARED = false;
		Game.onWin( () => { WINNER_DECLARED = true; });
		Game.forfeit();

		expect( WINNER_DECLARED ).toBe( true );
	});

	test( "forfeit() ends the game", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.forfeit();

		let err: Error | null = null;
		try {
			Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof GameOverException ).toBe( true );
	});

	test( "forfeit() as p1 declares p2 as winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let winner: number | null = null;
		Game.onWin( ( gameState ) => { winner = gameState.winner; });

		Game.forfeit();

		expect( winner ).toBe( 2 );
	});

	test( "forfeit() as p2 declares p1 as winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let winner: number | null = null;
		Game.onWin( ( gameState ) => { winner = gameState.winner; });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.forfeit();

		expect( winner ).toBe( 1 );
	});

	test( "forfeit(1) declares p2 as winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let winner: number | null = null;
		Game.onWin( ( gameState ) => { winner = gameState.winner; });

		Game.forfeit( 1 );

		expect( winner ).toBe( 2 );
	});

	test( "forfeit(2) declares p1 as winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let winner: number | null = null;
		Game.onWin( ( gameState ) => { winner = gameState.winner; });

		Game.forfeit( 2 );

		expect( winner ).toBe( 1 );
	});

	test( "horizontal win", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if ( gameState.winner === 1 ) PLAYER_1_WON = true;
		});

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 0, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 1, y: 0 });
		Game.takeTurn({ player: 2, piece: "rook", x: 1, y: 1 });
		Game.takeTurn({ player: 1, piece: "knight", x: 2, y: 0 });
		Game.takeTurn({ player: 2, piece: "knight", x: 2, y: 1 });
		Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 0 });

		expect( PLAYER_1_WON ).toBe( true );
	});

	test( "vertical win", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if ( gameState.winner === 1 ) PLAYER_1_WON = true;
		});

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 0, y: 1 });
		Game.takeTurn({ player: 2, piece: "rook", x: 1, y: 1 });
		Game.takeTurn({ player: 1, piece: "knight", x: 0, y: 2 });
		Game.takeTurn({ player: 2, piece: "knight", x: 3, y: 1 });
		Game.takeTurn({ player: 1, piece: "bishop", x: 0, y: 3 });

		expect( PLAYER_1_WON ).toBe( true );
	});

	test( "diagonal win", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if ( gameState.winner === 1 ) PLAYER_1_WON = true;
		});

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.takeTurn({ player: 2, piece: "pawn", x: 2, y: 1 });
		Game.takeTurn({ player: 1, piece: "rook", x: 1, y: 1 });
		Game.takeTurn({ player: 2, piece: "rook", x: 1, y: 0 });
		Game.takeTurn({ player: 1, piece: "knight", x: 2, y: 2 });
		Game.takeTurn({ player: 2, piece: "knight", x: 3, y: 1 });
		Game.takeTurn({ player: 1, piece: "bishop", x: 3, y: 3 });

		expect( PLAYER_1_WON ).toBe( true );
	});
});

describe( "internal method tests", () => {
	test( "calling _occupied with NaN parameter throws error", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._occupied( "a", 0 );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._occupied( 0, "a" );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._occupied( "a", "a" );
		}).toThrow();
	});

	test( "_inGutter throws an error if it is passed a parameter that is not an instance of Piece", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter( "a" );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter( 0 );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter( null );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter( undefined );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter( [] );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation of invalid input
			Game._inGutter({});
		}).toThrow();

		expect( () => {
			Game._inGutter( new Piece() );
		}).not.toThrow();
	});

	test( "_normalizeData throws an error if an unknown piece is used", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let DID_THROW = false;
		let msg: string | null = null;
		try {
			// @ts-expect-error - testing runtime validation with invalid piece name
			Game._normalizeData({ player: 1, piece: "ABRAKADABRA", x: 0, y: 0 }, () => {});
		} catch ( e ) {
			DID_THROW = true;
			msg = (e as Error).message;
		}

		expect( DID_THROW ).toBe( true );
		expect( msg ).toBe( "Unknown piece ABRAKADABRA specified" );
	});
});

describe( "middleware tests", () => {
	const next = jest.fn();

	test( "_normalizeData throws if a coordinate is not a parseable number", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });
		expect( () => {
			// @ts-expect-error - testing runtime validation with incomplete input
			Game._normalizeData({ player: 1, piece: "pawn", x: 0 }, next );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation with incomplete input
			Game._normalizeData({ player: 1, piece: "pawn", y: 0 }, next );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation with incomplete input
			Game._normalizeData({ player: 1, piece: "pawn" }, next );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation with invalid coordinate
			Game._normalizeData({ player: 1, piece: "pawn", x: "a" }, next );
		}).toThrow();

		expect( () => {
			// @ts-expect-error - testing runtime validation with invalid coordinate
			Game._normalizeData({ player: 1, piece: "pawn", y: "a" }, next );
		}).toThrow();
	});

	test( "_isGameOver throws if the game is over", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		// @ts-expect-error - testing with null data (game not over, next is called)
		expect( () => Game._isGameOver( null, next ) ).not.toThrow();

		Game.state.winner = 1;

		// @ts-expect-error - testing no-arg call (game is over, throws before next)
		expect( () => Game._isGameOver() ).toThrow();
	});

	test( "_normalizeData throws if a player is not specified", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let err: Error | null = null;
		try {
			// @ts-expect-error - testing runtime validation with missing player
			Game._normalizeData({ piece: "pawn", x: 0, y: 0 }, next );
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof TypeError ).toBe( true );
		expect( err!.message ).toBe( "No player specified" );
	});

	test( "_normalizeData throws if no piece is specified", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let err: Error | null = null;
		try {
			// @ts-expect-error - testing runtime validation with missing piece
			Game._normalizeData({ player: 1, x: 0, y: 0 }, next );
		} catch ( e ) {
			err = e as Error;
		}

		expect( err instanceof TypeError ).toBe( true );
		expect( err!.message ).toBe( "No piece specified" );
	});
});

describe( "Check4.setState tests", () => {
	test( "Turn changes with new state", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.turn ).toBe( 2 );

		Game.setState({ turn: 1, turnCount: 1, winner: null, p1: { pawn: { x: 2, y: 2 } } });

		state = Game.getState();
		expect( state.turn ).toBe( 1 );
	});

	test( "turnCount changes with new state", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.turnCount ).toBe( 1 );

		Game.setState({ turn: 2, turnCount: 5, winner: null, p1: { pawn: { x: 2, y: 2 } } });

		state = Game.getState();
		expect( state.turnCount ).toBe( 5 );
	});

	test( "winner changes with new state", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.winner ).toBe( null );

		Game.setState({ turn: 2, turnCount: 1, winner: 1, p1: { pawn: { x: 2, y: 2 } } });

		state = Game.getState();
		expect( state.winner ).toBe( 1 );
	});

	test( "Changing turn does not affect turnCount or winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.turn ).toBe( 2 );
		expect( state.turnCount ).toBe( 1 );
		expect( state.winner ).toBe( null );

		Game.setState({ turn: 1, turnCount: 1, winner: null, p1: { pawn: { x: 2, y: 2 } } });

		state = Game.getState();
		expect( state.turn ).toBe( 1 );
		expect( state.turnCount ).toBe( 1 );
		expect( state.winner ).toBe( null );
	});

	test( "Changing turnCount does not affect turn or winner", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.turn ).toBe( 2 );
		expect( state.turnCount ).toBe( 1 );
		expect( state.winner ).toBe( null );

		Game.setState({ turn: 2, turnCount: 5, winner: null });

		state = Game.getState();
		expect( state.turn ).toBe( 2 );
		expect( state.turnCount ).toBe( 5 );
		expect( state.winner ).toBe( null );
	});

	test( "Changing winner does not affect turn or turnCount", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let state = Game.getState();
		expect( state.turn ).toBe( 2 );
		expect( state.turnCount ).toBe( 1 );
		expect( state.winner ).toBe( null );

		Game.setState({ turn: 2, turnCount: 1, winner: 2 });

		state = Game.getState();
		expect( state.turn ).toBe( 2 );
		expect( state.turnCount ).toBe( 1 );
		expect( state.winner ).toBe( 2 );
	});

	test( "If turn is not 1 or 2 throw GameException", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let TURN_3_DID_THROW = false;
		let ERR_INSTANCE_OF_GAMEEXCEPTION = false;
		try {
			// @ts-expect-error - testing runtime validation with invalid turn value
			Game.setState({ turn: 3, turnCount: 1, winner: null });
		} catch ( e ) {
			TURN_3_DID_THROW = true;
			if ( e instanceof GameException ) ERR_INSTANCE_OF_GAMEEXCEPTION = true;
		}

		expect( TURN_3_DID_THROW ).toBe( true );
		expect( ERR_INSTANCE_OF_GAMEEXCEPTION ).toBe( true );
	});

	test( "If winner is not one of null, 1, or 2 throw GameException", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let NULL_DID_NOT_THROW = true;
		let TWO_DID_NOT_THROW = true;
		let ONE_DID_NOT_THROW = true;
		let THREE_DID_THROW = false;

		try {
			Game.setState({ turn: 1, turnCount: 1, winner: null });
		} catch ( e ) { NULL_DID_NOT_THROW = false; }

		try {
			Game.setState({ turn: 1, turnCount: 1, winner: 1 });
		} catch ( e ) { ONE_DID_NOT_THROW = false; }

		try {
			Game.setState({ turn: 1, turnCount: 1, winner: 2 });
		} catch ( e ) { TWO_DID_NOT_THROW = false; }

		try {
			// @ts-expect-error - testing runtime validation with invalid winner value
			Game.setState({ turn: 1, turnCount: 1, winner: 3 });
		} catch ( e ) { THREE_DID_THROW = true; }

		expect( NULL_DID_NOT_THROW ).toBe( true );
		expect( ONE_DID_NOT_THROW ).toBe( true );
		expect( TWO_DID_NOT_THROW ).toBe( true );
		expect( THREE_DID_THROW ).toBe( true );
	});

	test( "Trying to update state with a negative turn count throws GameException", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let DID_THROW = false;
		let ERR_INSTANCE_OF_GAMEEXCEPTION = false;
		try {
			Game.setState({ turn: 1, turnCount: -1, winner: null });
		} catch ( e ) {
			DID_THROW = true;
			if ( e instanceof GameException ) ERR_INSTANCE_OF_GAMEEXCEPTION = true;
		}

		expect( DID_THROW ).toBe( true );
		expect( ERR_INSTANCE_OF_GAMEEXCEPTION ).toBe( true );
	});

	test( "Trying to update state with a non-number turn count throws GameException", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let A_DID_THROW = false;
		let NULL_DID_THROW = false;
		let ERR_INSTANCE_OF_GAMEEXCEPTION = false;

		try {
			// @ts-expect-error - testing runtime validation with invalid turnCount type
			Game.setState({ turn: 2, turnCount: "a", winner: null });
		} catch ( e ) {
			A_DID_THROW = true;
			if ( e instanceof GameException ) ERR_INSTANCE_OF_GAMEEXCEPTION = true;
		}

		try {
			// @ts-expect-error - testing runtime validation with null turnCount
			Game.setState({ turn: 2, turnCount: null, winner: null });
		} catch ( e ) { NULL_DID_THROW = true; }

		expect( NULL_DID_THROW ).toBe( true );
		expect( A_DID_THROW ).toBe( true );
		expect( ERR_INSTANCE_OF_GAMEEXCEPTION ).toBe( true );
	});

	test( "Using a malformed state throws GameException", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		let DID_THROW = false;
		let ERR_INSTANCE_OF_GAMEEXCEPTION = false;

		try {
			// @ts-expect-error - testing runtime validation with deeply malformed state
			Game.setState({ turn: 0 });
		} catch ( e ) {
			DID_THROW = true;
			if ( e instanceof GameException ) ERR_INSTANCE_OF_GAMEEXCEPTION = true;
		}

		expect( DID_THROW ).toBe( true );
		expect( ERR_INSTANCE_OF_GAMEEXCEPTION ).toBe( true );
	});

	test( "If new state declares winner, Game._declareWinner should be called", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		let _declareWinner_WAS_CALLED = false;
		Game.onWin( () => { _declareWinner_WAS_CALLED = true; });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });
		Game.setState({ turn: 2, turnCount: 1, winner: 1 });

		expect( _declareWinner_WAS_CALLED ).toBe( true );
	});

	test( "P1 pawn is updated with new state", () => {
		const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

		Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

		Game.setState({ turn: 2, turnCount: 1, winner: null, p1: { pawn: { x: 2, y: 2 } } });

		const pawn = Game.getState().p1.pawn;
		expect( pawn.x ).toBe( 2 );
		expect( pawn.y ).toBe( 2 );
	});
});

describe( "moveIsValid tests", () => {
	const Game = new Check4({ p1: { name: "p1" }, p2: { name: "p2" } });

	expect( Game.getState().turnCount ).toBe( 0 );

	let moveIsValid = Game.moveIsValid({ player: 1, piece: "knight", x: 1, y: 1 });

	expect( moveIsValid ).toBe( true );
	expect( Game.getState().turnCount ).toBe( 0 );

	Game.takeTurn({ player: 1, piece: "pawn", x: 0, y: 0 });

	expect( Game.getState().turnCount ).toBe( 1 );

	moveIsValid = Game.moveIsValid({ player: 1, piece: "knight", x: 1, y: 1 });

	expect( Game.getState().turnCount ).toBe( 1 );
	expect( moveIsValid ).toBe( false );

	moveIsValid = Game.moveIsValid({ player: 2, piece: "knight", x: 1, y: 1 });

	expect( Game.getState().turnCount ).toBe( 1 );
	expect( moveIsValid ).toBe( true );

	Game.takeTurn({ player: 2, piece: "knight", x: 1, y: 1 });

	moveIsValid = Game.moveIsValid({ player: 2, piece: "knight", x: 1, y: 1 });

	expect( Game.getState().turnCount ).toBe( 2 );
	expect( moveIsValid ).toBe( false );

	moveIsValid = Game.moveIsValid({ player: 1, piece: "bishop", x: 0, y: 1 });

	expect( Game.getState().turnCount ).toBe( 2 );
	expect( moveIsValid ).toBe( true );
});
