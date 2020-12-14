"use strict";

import Check4 from "../src/Check4.js";

import {
	Pawn,
	Bishop,
	Rook,
	Knight,
	Piece
} from "../src/Pieces.js";

import {
	PlayerTurnException,
	IllegalMoveException
} from "../src/Check4Errors.js";

describe( "Check4 class", () => {
	test( "creating game without players throws an error", () => {
		try {
			const Game = new Check4();
			Game.x = 0; // Should never get this far
		} catch ( e ) {
			expect( e.message ).toBe( "You can't create a game without players!" );
		}
	});

	test( "defaults all pieces to null coordinates", () => {
		const Game = new Check4({
			p1: {
				name: "player1"
			},
			p2: {
				name: "player2"
			}
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
				pawn: new Pawn({
					x: 0,
					y: 0
				}),
				rook: new Rook({
					x: 1,
					y: 1
				}),
				bishop: new Bishop({
					x: 2,
					y: 2
				}),
				knight: new Knight({
					x: 3,
					y: 3
				})
			},
			p2: {
				pawn: new Pawn({
					x: 0,
					y: 0
				}),
				rook: new Rook({
					x: 1,
					y: 1
				}),
				bishop: new Bishop({
					x: 2,
					y: 2
				}),
				knight: new Knight({
					x: 3,
					y: 3
				})
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
				pawn: new Pawn({
					x: 0,
					y: 0
				}),
				rook: new Rook({
					x: 1,
					y: 1
				}),
				bishop: new Bishop({
					x: 2,
					y: 2
				}),
				knight: new Knight({
					x: 3,
					y: 3
				})
			},
			p2: {
				pawn: new Pawn({
					x: 0,
					y: 0
				}),
				rook: new Rook({
					x: 1,
					y: 1
				}),
				bishop: new Bishop({
					x: 2,
					y: 2
				}),
				knight: new Knight({
					x: 3,
					y: 3
				})
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
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});
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
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 0 );
		expect( S.winner ).toBe( null );
		expect( typeof S.p1 ).toBe( "undefined" );

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 0
		});

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 1 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify({ p: {x:0, y:0 } }) );

		Game.takeTurn({
			player: 2,
			piece: "rook",
			x: 1,
			y: 1
		});

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 2 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify({ r: {x:1, y:1 } }) );

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 2,
			y: 2
		});

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 3 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify({
			p: { x:0, y:0 },
			b: { x:2, y:2 }
		}) );

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 3,
			y: 3
		});

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 4 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify({
			r: { x:1, y:1 },
			k: { x:3, y:3 }
		}) );

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 3,
			y: 2
		});

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 5 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify({
			p: { x:0, y:0 },
			r: { x:3, y:2 },
			b: { x:2, y:2 }
		}) );

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 1,
			y: 3
		});

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 6 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify({
			p: { x:1, y:3 },
			r: { x:1, y:1 },
			k: { x:3, y:3 }
		}) );

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 2,
			y: 1
		});

		S = Game.getState();
		expect( S.turn ).toBe( 2 );
		expect( S.turnCount ).toBe( 7 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p1 ) ).toBe( JSON.stringify({
			p: { x:0, y:0 },
			r: { x:3, y:2 },
			b: { x:2, y:2 },
			k: { x:2, y:1 }
		}) );

		Game.takeTurn({
			player: 2,
			piece: "bishop",
			x: 1,
			y: 2
		});

		S = Game.getState();
		expect( S.turn ).toBe( 1 );
		expect( S.turnCount ).toBe( 8 );
		expect( S.winner ).toBe( null );
		expect( JSON.stringify( S.p2 ) ).toBe( JSON.stringify({
			p: { x:1, y:3 },
			r: { x:1, y:1 },
			b: { x:1, y:2 },
			k: { x:3, y:3 }
		}) );

	});

});


describe( "Turn control", () => {
	test( "Cant take turn if it is not your turn", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		let CORRECT_ERROR_THROWN = false;
		let errMessage = null;
		try{
			Game.takeTurn({
				player: 2,
				piece: "pawn",
				x: 0,
				y: 0
			});
		} catch( e ){
			if( e instanceof PlayerTurnException ){
				CORRECT_ERROR_THROWN = true;
				errMessage = e.message;
			}
		}

		expect( CORRECT_ERROR_THROWN ).toBe( true );
		expect( errMessage ).toBe( "It's not your turn!" );
	});

	test( "Can take turn if it is your turn", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		expect( () => {
			Game.takeTurn({
				player: 1,
				piece: "knight",
				x: 0,
				y: 0
			});
		}).not.toThrow();
	});

	test( "Taking turn advances game to next turn", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 0,
			y: 0
		});

		expect( Game.state.turn ).toBe( 2 );
	});

	test( "Each turn alternates players", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		expect( Game.state.turn ).toBe( 1 );

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 0,
			y: 0
		});

		expect( Game.state.turn ).toBe( 2 );
		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 0,
			y: 1
		});
		expect( Game.state.turn ).toBe( 1 );
	});
});

describe( "Turn counter", () => {
	test( "increments on each sucessful turn", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		expect( Game.state.turnCount ).toBe( 0 );

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 0,
			y: 0
		});

		expect( Game.state.turnCount ).toBe( 1 );

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 0,
			y: 1
		});

		expect( Game.state.turnCount ).toBe( 2 );
	});

	test( "does not increment on unsucessful turns", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		expect( Game.state.turnCount ).toBe( 0 );

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 0,
			y: 0
		});

		expect( Game.state.turnCount ).toBe( 1 );

		let err = null;
		// Turn will fail because it is player2s turn
		try{
			Game.takeTurn({
				player: 1,
				piece: "knight",
				x: 0,
				y: 1
			});
		} catch ( e ){
			err = e;
		}

		expect( Game.state.turnCount ).toBe( 1 );
		expect( err instanceof PlayerTurnException ).toBe( true );
	});
});

describe( "Movements from the gutter" , () => {
	test( "Any piece can move from the gutter to any empty square", () => {

		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		expect( () => {
			Game.takeTurn({
				player: 1,
				piece: "knight",
				x:0,
				y:0
			});

			Game.takeTurn({
				player: 2,
				piece: "knight",
				x:0,
				y:1
			});

			Game.takeTurn({
				player: 1,
				piece: "bishop",
				x: 0,
				y: 2
			});

			Game.takeTurn({
				player: 2,
				piece: "bishop",
				x: 0,
				y: 3
			});

			Game.takeTurn({
				player: 1,
				piece: "rook",
				x:1,
				y:0
			});

			Game.takeTurn({
				player: 2,
				piece: "rook",
				x: 1,
				y: 1
			});

			Game.takeTurn({
				player: 1,
				piece: "pawn",
				x: 3,
				y: 3
			});

			Game.takeTurn({
				player: 2,
				piece: "pawn",
				x: 3,
				y: 0
			});
		}).not.toThrow();
	});

	test( "Piece cannot attack from the gutter", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		// Test flags
		let GAME_THREW = false;
		let GAME_THREW_MOVEMENT_ERROR = false;
		let ERR_MSG = null;

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x:0,
			y:0
		});

		try{
			Game.takeTurn({
				player: 2,
				piece: "rook",
				x:0,
				y:0
			});
		} catch( e ) {
			GAME_THREW = true;
			if( e instanceof IllegalMoveException ){
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
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		// Place rook in bottom left of board
		Game.takeTurn({
			player:1,
			piece: "rook",
			x: 0,
			y: 0
		});

		// Place rook directly above player1s rook
		Game.takeTurn({
			player:2,
			piece:"rook",
			x:0,
			y:1
		});

		// Capture player 2s rook
		Game.takeTurn({
			player:1,
			piece: "rook",
			x:0,
			y:1
		});

		// Expect player 2s rook to be back in the gutter
		expect( Game.state.p2.rook.x() ).toBe( null );
		expect( Game.state.p2.rook.y() ).toBe( null );
	});

	test( "Player cannot attack themself", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x:0,
			y:0,
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 3,
			y: 3
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 0,
			y: 1,
		});

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 3,
			y: 2
		});

		// Attempt to move p1 rook over top of p1 pawn
		let ERR = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "rook",
				x:0,
				y:0
			});
		} catch( e ){
			ERR = e;
		}

		expect( ERR instanceof IllegalMoveException ).toBe( true );
		expect( ERR.message ).toBe( "You cannot capture your own piece" );
	});
});

describe( "Rook and Bishop cannot jump other pieces", () => {
	const rookMsg = "Rooks cannot jump over other pieces";
	const bishMsg = "Bishops cannot jump over other pieces";

	test( "next is called if the piece is not a rook or bishop", () => {

	});

	test( "rook cannot jump a piece above it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 0,
			y: 0,
		});

		Game.takeTurn({
			player:2,
			piece: "pawn",
			x: 0,
			y: 1
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "rook",
				x: 0,
				y: 2
			});
		} catch ( e ) {
			err = e;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece below it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 0,
			y: 2,
		});

		Game.takeTurn({
			player:2,
			piece: "pawn",
			x: 0,
			y: 1
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "rook",
				x: 0,
				y: 0
			});
		} catch ( e ) {
			err = e;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece to the left of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 2,
			y: 1,
		});

		Game.takeTurn({
			player:2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "rook",
				x: 0,
				y: 1
			});
		} catch ( e ) {
			err = e;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( rookMsg );
	});

	test( "rook cannot jump a piece to the right of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 0,
			y: 1,
		});

		Game.takeTurn({
			player:2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "rook",
				x: 3,
				y: 1
			});
		} catch ( e ) {
			err = e;
		}

		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( rookMsg );
	});

	test( "bishop cannot jump a piece to the NW of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 0,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "bishop",
			x: 2,
			y: 2
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "bishop",
				x: 3,
				y: 3
			});
		} catch ( e ){
			err = e;
		}

		expect( err.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the NE of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 3,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "bishop",
				x: 1,
				y: 3
			});
		} catch ( e ){
			err = e;
		}

		expect( err.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the SW of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 3,
			y: 3
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "bishop",
				x: 0,
				y: 0
			});
		} catch ( e ){
			err = e;
		}

		expect( err.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "bishop cannot jump a piece to the SE of it", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 1,
			y: 3
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 1,
				piece: "bishop",
				x: 3,
				y: 1
			});
		} catch ( e ){
			err = e;
		}

		expect( err.message ).toBe( bishMsg );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});
});


describe( "Pawn movement", () => {
	test( "pawn can attack to the NW", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});

		expect( () => {
			Game.takeTurn({
				player: 1,
				piece: "pawn",
				x: 2,
				y: 2
			});
		}).not.toThrow();

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.pawn.y() ).toBe( null );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
	});

	test( "pawn can attack to the NE", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 0,
			y: 2
		});

		expect( () => {
			Game.takeTurn({
				player: 1,
				piece: "pawn",
				x: 0,
				y: 2
			});
		}).not.toThrow();

		expect( Game.state.p2.pawn.x() ).toBe( null );
		expect( Game.state.p2.pawn.y() ).toBe( null );
		expect( Game.state.p1.pawn.x() ).toBe( 0 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
	});

	test( "pawn cannot attack SW", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 2,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		let err = null;
		try {
			Game.takeTurn({
				player: 1,
				piece: "pawn",
				x: 1,
				y: 1
			});
		} catch( e ){
			err = e;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( "pawn cannot move to (1,1)" );
	});

	test( "pawn cannot attack SE", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 2,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 3,
			y: 1
		});

		let err = null;
		try {
			Game.takeTurn({
				player: 1,
				piece: "pawn",
				x: 3,
				y: 1
			});
		} catch( e ){
			err = e;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 3 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err instanceof IllegalMoveException ).toBe( true );
		expect( err.message ).toBe( "pawn cannot move to (3,1)" );
	});

	test( "reversed pawn can attack SW", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});


		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 3,
			y: 3
		});

		// Player 2s pawn is reversed by default, unless it it placed directly
		// on the opponents home row
		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.pawn.y() ).toBe( null );
	});

	test( "reversed pawn can attack SE", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 3,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 2
		});


		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 3,
			y: 3
		});

		// Player 2s pawn is reversed by default, unless it it placed directly
		// on the opponents home row
		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 3,
			y: 1
		});

		expect( Game.state.p2.pawn.x() ).toBe( 3 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( null );
		expect( Game.state.p1.pawn.y() ).toBe( null );
	});

	test( "reversed pawn cannot attack NW", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 3,
			y: 3
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 2,
				piece: "pawn",
				x: 0,
				y: 2
			});
		} catch( e ){
			err = e;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 0 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err.message ).toBe( "pawn cannot move to (0,2)" );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "reversed pawn cannot attack NE", () => {
		const Game = new Check4({
			p1: {
				name: "p1"
			},
			p2: {
				name: "p2"
			}
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 2,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 3,
			y: 3
		});

		let err = null;
		try{
			Game.takeTurn({
				player: 2,
				piece: "pawn",
				x: 2,
				y: 2
			});
		} catch( e ){
			err = e;
		}

		expect( Game.state.p2.pawn.x() ).toBe( 1 );
		expect( Game.state.p2.pawn.y() ).toBe( 1 );
		expect( Game.state.p1.pawn.x() ).toBe( 2 );
		expect( Game.state.p1.pawn.y() ).toBe( 2 );
		expect( err.message ).toBe( "pawn cannot move to (2,2)" );
		expect( err instanceof IllegalMoveException ).toBe( true );
	});

	test( "pawns direction changes if moved to enemies home row", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		expect( Game.state.p1.pawn.getDirection() ).toBe( "up" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "down" );

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 0,
			y: 1
		});

		// Move each pawn to its respective enemies home row
		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 3
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 0,
			y: 0
		});

		expect( Game.state.p1.pawn.getDirection() ).toBe( "down" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "up" );
	});

	test( "pawn direction changes if placed directly on enemies home row from gutter", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		expect( Game.state.p1.pawn.getDirection() ).toBe( "up" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "down" );

		// Move each pawn from the gutter to its respective enemies home row
		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 3
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 0,
			y: 0
		});

		expect( Game.state.p1.pawn.getDirection() ).toBe( "down" );
		expect( Game.state.p2.pawn.getDirection() ).toBe( "up" );
	});
});

describe( "Win scenarios", () => {
	test( "horizontal win", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if( gameState.winner === 1 )
				PLAYER_1_WON = true;
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 0,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 1,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "rook",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 2,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 2,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 3,
			y: 0
		});

		expect( PLAYER_1_WON ).toBe( true );
	});

	test( "vertical win", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if( gameState.winner === 1 )
				PLAYER_1_WON = true;
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 0,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "rook",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 0,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 3,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 0,
			y: 3
		});

		expect( PLAYER_1_WON ).toBe( true );
	});

	test( "diagonal win", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let PLAYER_1_WON = false;
		Game.onWin( ( gameState ) => {
			if( gameState.winner === 1 )
				PLAYER_1_WON = true;
		});

		Game.takeTurn({
			player: 1,
			piece: "pawn",
			x: 0,
			y: 0
		});

		Game.takeTurn({
			player: 2,
			piece: "pawn",
			x: 2,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "rook",
			x: 1,
			y: 1
		});

		Game.takeTurn({
			player: 2,
			piece: "rook",
			x: 1,
			y: 0
		});

		Game.takeTurn({
			player: 1,
			piece: "knight",
			x: 2,
			y: 2
		});

		Game.takeTurn({
			player: 2,
			piece: "knight",
			x: 3,
			y: 1
		});

		Game.takeTurn({
			player: 1,
			piece: "bishop",
			x: 3,
			y: 3
		});

		expect( PLAYER_1_WON ).toBe( true );
	});
});

describe( "internal method tests", () => {
	test( "calling _occupied with NaN parameter throws error", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		expect( () => {
			Game._occupied( "a", 0 );
		}).toThrow();

		expect( () => {
			Game._occupied( 0, "a" );
		}).toThrow();

		expect( () => {
			Game._occupied( "a", "a" );
		}).toThrow();
	});

	test( "_inGutter throws an error if it is passed a parameter that is not an instance of Piece", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		expect( () => {
			Game._inGutter( "a" );
		}).toThrow();

		expect( () => {
			Game._inGutter( 0 );
		}).toThrow();

		expect( () => {
			Game._inGutter( null );
		}).toThrow();

		expect( () => {
			Game._inGutter( undefined );
		}).toThrow();

		expect( () => {
			Game._inGutter( [] );
		}).toThrow();

		expect( () => {
			Game._inGutter({});
		}).toThrow();

		expect( () => {
			Game._inGutter( new Piece() );
		}).not.toThrow();
	});

});

describe( "middleware tests", () => {
	const next = jest.fn(); // Mock a next function

	test( "_normalizeData throws if a coordinate is not a parseable number", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});
		expect( () => {
			Game._normalizeData({
				player:1,
				piece: "pawn",
				x: 0
			}, next );
		}).toThrow();

		expect( () => {
			Game._normalizeData({
				player:1,
				piece: "pawn",
				y: 0
			}, next );
		}).toThrow();

		expect( () => {
			Game._normalizeData({
				player:1,
				piece: "pawn",
			}, next );
		}).toThrow();

		expect( () => {
			Game._normalizeData({
				player:1,
				piece: "pawn",
				x: "a"
			}, next );
		}).toThrow();

		expect( () => {
			Game._normalizeData({
				player:1,
				piece: "pawn",
				y: "a"
			}, next );
		}).toThrow();
	});

	test( "_isGameOver throws if the game is over", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		expect( () => Game._isGameOver( null, next ) ).not.toThrow();

		Game.state.winner=1;

		expect( () => Game._isGameOver() ).toThrow();
	});

	test( "_normalizeData throws if a player is not specified", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let err = null;
		try {
			Game._normalizeData({
				piece: "pawn",
				x:0,
				y:0
			}, next );
		} catch( e ){
			err = e;
		}

		expect( err instanceof TypeError  ).toBe( true );
		expect( err.message ).toBe( "No player specified" );
	});

	test( "_normalizeData throws if no piece is specified", () => {
		const Game = new Check4({
			p1:{ name: "p1" },
			p2:{ name: "p2" }
		});

		let err = null;
		try {
			Game._normalizeData({
				player: 1,
				x:0,
				y:0
			}, next );
		} catch( e ){
			err = e;
		}

		expect( err instanceof TypeError  ).toBe( true );
		expect( err.message ).toBe( "No piece specified" );
	});
});
