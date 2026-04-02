"use strict";

import {
	GameException,
	PlayerTurnException,
	IllegalMoveException,
	GameOverException
} from "../src/Check4Errors";

describe( "GameException", () => {
	test( "message defaults to 'GAME_EXCEPTION'", () => {
		const e = new GameException();
		expect( e.message ).toBe( "GAME_EXCEPTION" );
	});

	test( "message is set to string passed to constructor", () => {
		const e = new GameException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});
});

describe( "PlayerTurnException", () => {
	test( "extends GameException", () => {
		const e = new PlayerTurnException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'WRONG_TURN'", () => {
		const e = new PlayerTurnException();
		expect( e.message ).toBe( "WRONG_TURN" );
	});

	test( "message is set to string passed to constructor", () => {
		const e = new PlayerTurnException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		const e = new PlayerTurnException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		const e = new PlayerTurnException<{ foo: string }>( "", { foo: "bar" });
		expect( e.data ).not.toBe( undefined );
		expect( e.data!.foo ).toBe( "bar" );
	});
});

describe( "IllegalMoveException", () => {
	test( "extends GameException", () => {
		const e = new IllegalMoveException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'ILLEGAL_MOVE'", () => {
		const e = new IllegalMoveException();
		expect( e.message ).toBe( "ILLEGAL_MOVE" );
	});

	test( "message is set to string passed to constructor", () => {
		const e = new IllegalMoveException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		const e = new IllegalMoveException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		const e = new IllegalMoveException<{ foo: string }>( "", { foo: "bar" });
		expect( e.data ).not.toBe( undefined );
		expect( e.data!.foo ).toBe( "bar" );
	});
});

describe( "GameOverException", () => {
	test( "extends GameException", () => {
		const e = new GameOverException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'GAME_OVER'", () => {
		const e = new GameOverException();
		expect( e.message ).toBe( "GAME_OVER" );
	});

	test( "message is set to string passed to constructor", () => {
		const e = new GameOverException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		const e = new GameOverException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		const e = new GameOverException<{ foo: string }>( "", { foo: "bar" });
		expect( e.data ).not.toBe( undefined );
		expect( e.data!.foo ).toBe( "bar" );
	});
});
