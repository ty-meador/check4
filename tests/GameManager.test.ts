import { GameOverException, IllegalMoveException, PlayerTurnException } from "../src/Check4Errors";
import { GameManager } from "../src/mcp/GameManager";

describe( "GameManager sessions", () => {
	it( "hosts independent games with sequential ids", () => {
		const manager = new GameManager();
		const a = manager.newGame();
		const b = manager.newGame();
		expect( a.id ).toBe( "g1" );
		expect( b.id ).toBe( "g2" );

		manager.makeMove( a.id, { player: 1, piece: "pawn", x: 0, y: 0 } );
		expect( a.game.state.turnCount ).toBe( 1 );
		expect( b.game.state.turnCount ).toBe( 0 );
	} );

	it( "throws a helpful error for unknown games", () => {
		expect( () => new GameManager().get( "g9" ) ).toThrow( "no such game: g9" );
	} );

	it( "summarizes hosted games", () => {
		const manager = new GameManager();
		manager.newGame();
		manager.newGame( { botPlayer: 2 } );
		manager.resign( "g1", 1 );

		expect( manager.listGames() ).toEqual( [
			{ id: "g1", turn: 1, turnCount: 0, winner: 2, botPlayer: null },
			{ id: "g2", turn: 1, turnCount: 0, winner: null, botPlayer: 2 }
		] );
	} );
} );

describe( "GameManager moves", () => {
	it( "propagates engine exceptions untouched", () => {
		const manager = new GameManager();
		const { id } = manager.newGame();

		expect( () => manager.makeMove( id, { player: 2, piece: "pawn", x: 0, y: 0 } ) )
			.toThrow( PlayerTurnException );

		manager.makeMove( id, { player: 1, piece: "pawn", x: 0, y: 0 } );
		expect( () => manager.makeMove( id, { player: 2, piece: "pawn", x: 0, y: 0 } ) )
			.toThrow( IllegalMoveException );

		manager.resign( id, 2 );
		expect( () => manager.makeMove( id, { player: 1, piece: "rook", x: 3, y: 3 } ) )
			.toThrow( GameOverException );
	} );

	it( "records the last move applied", () => {
		const manager = new GameManager();
		const session = manager.newGame();
		expect( session.lastMove ).toBeNull();

		manager.makeMove( session.id, { player: 1, piece: "bishop", x: 2, y: 2 } );
		expect( session.lastMove ).toEqual( { player: 1, piece: "bishop", x: 2, y: 2 } );
	} );

	it( "rejects resigning a finished game", () => {
		const manager = new GameManager();
		const { id } = manager.newGame();
		manager.resign( id, 1 );
		expect( () => manager.resign( id, 2 ) ).toThrow( "already over" );
	} );
} );

describe( "GameManager bot", () => {
	it( "replies immediately after the caller's move", () => {
		const manager = new GameManager();
		const session = manager.newGame( { botPlayer: 2, seed: 42 } );

		const reply = manager.makeMove( session.id, { player: 1, piece: "pawn", x: 0, y: 0 } );
		expect( reply ).not.toBeNull();
		expect( reply?.player ).toBe( 2 );
		expect( session.game.state.turn ).toBe( 1 );
		expect( session.game.state.turnCount ).toBe( 2 );
		expect( session.lastMove ).toEqual( reply );
	} );

	it( "opens immediately when it holds seat 1", () => {
		const manager = new GameManager();
		const session = manager.newGame( { botPlayer: 1, seed: 42 } );
		expect( session.game.state.turnCount ).toBe( 1 );
		expect( session.game.state.turn ).toBe( 2 );
		expect( session.lastMove?.player ).toBe( 1 );
	} );

	it( "is reproducible from its seed", () => {
		const play = (): string => {
			const manager = new GameManager();
			const session = manager.newGame( { botPlayer: 2, seed: 1337 } );
			manager.makeMove( session.id, { player: 1, piece: "pawn", x: 1, y: 1 } );
			manager.makeMove( session.id, { player: 1, piece: "rook", x: 0, y: 0 } );
			return session.game.stateKey();
		};
		expect( play() ).toBe( play() );
	} );

	it( "guards its own seat from the caller", () => {
		const manager = new GameManager();
		const { id } = manager.newGame( { botPlayer: 2 } );
		expect( () => manager.makeMove( id, { player: 2, piece: "pawn", x: 0, y: 0 } ) )
			.toThrow( "bot's seat" );
		expect( () => manager.resign( id, 2 ) ).toThrow( "bot's seat" );
	} );

	it( "does not reply once the caller's move wins the game", () => {
		const manager = new GameManager();
		const session = manager.newGame( { botPlayer: 2, seed: 7 } );

		// Drive P1 toward a column-0 alignment; the seeded bot plays its
		// own random moves in between. If the bot ever occupies or captures
		// on column 0 this seed would need changing - the assertions below
		// would catch that, not silently pass.
		const drops: Array<[ "pawn" | "rook" | "bishop" | "knight", number ]> = [
			[ "pawn", 0 ], [ "rook", 1 ], [ "bishop", 2 ], [ "knight", 3 ]
		];
		let lastReply = null;
		for ( const [ piece, y ] of drops ) {
			lastReply = manager.makeMove( session.id, { player: 1, piece, x: 0, y } );
		}

		expect( session.game.state.winner ).toBe( 1 );
		expect( lastReply ).toBeNull();
		expect( session.lastMove ).toEqual( { player: 1, piece: "knight", x: 0, y: 3 } );
	} );
} );

describe( "GameManager waitForTurn", () => {
	it( "resolves immediately when it is already your turn", async () => {
		const manager = new GameManager();
		const { id } = manager.newGame();
		await expect( manager.waitForTurn( id, 1, 1000 ) ).resolves.toBe( "your-turn" );
	} );

	it( "resolves immediately when the game is over", async () => {
		const manager = new GameManager();
		const { id } = manager.newGame();
		manager.resign( id, 1 );
		await expect( manager.waitForTurn( id, 1, 1000 ) ).resolves.toBe( "game-over" );
	} );

	it( "wakes when the opponent moves", async () => {
		const manager = new GameManager();
		const { id } = manager.newGame();

		const waiting = manager.waitForTurn( id, 2, 5000 );
		manager.makeMove( id, { player: 1, piece: "pawn", x: 0, y: 0 } );
		await expect( waiting ).resolves.toBe( "your-turn" );
	} );

	it( "wakes with game-over when the opponent's move ends the game", async () => {
		const manager = new GameManager();
		const { id } = manager.newGame();

		const waiting = manager.waitForTurn( id, 2, 5000 );
		manager.resign( id, 1 );
		await expect( waiting ).resolves.toBe( "game-over" );
	} );

	it( "times out without leaking the waiter", async () => {
		const manager = new GameManager();
		const { id } = manager.newGame();

		await expect( manager.waitForTurn( id, 2, 10 ) ).resolves.toBe( "timeout" );

		// After the timeout the next wake still works (no dead waiter left
		// behind swallowing the notification).
		const waiting = manager.waitForTurn( id, 2, 5000 );
		manager.makeMove( id, { player: 1, piece: "pawn", x: 0, y: 0 } );
		await expect( waiting ).resolves.toBe( "your-turn" );
	} );
} );
