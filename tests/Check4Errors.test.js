"use strict"

import {
	GameException,
	PlayerTurnException,
	IllegalMoveException,
	GameOverException
} from "./Check4Errors.js"

describe( "GameException", () => {
	test( "message defaults to 'GAME_EXCEPTION'", () => {
		let e = new GameException();
		expect( e.message ).toBe( "GAME_EXCEPTION" );
	});

	test( "message is set to string passed to constructor", () => {
		let e = new GameException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});
})

describe( "PlayerTurnException", () => {
	test( "extends GameException", () => {
		let e = new PlayerTurnException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'WRONG_TURN'", () => {
		let e = new PlayerTurnException();
		expect( e.message ).toBe( "WRONG_TURN" );
	});

	test( "message is set to string passed to constructor", () => {
		let e = new PlayerTurnException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		let e = new PlayerTurnException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		let e = new PlayerTurnException( "", { foo: "bar" } );
		expect( e.data ).not.toBe( undefined );
		expect( e.data.foo ).toBe( "bar" );
	});
});

describe( "IllegalMoveException", () => {
	test( "extends GameException", () => {
		let e = new IllegalMoveException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'ILLEGAL_MOVE'", () => {
		let e = new IllegalMoveException();
		expect( e.message ).toBe( "ILLEGAL_MOVE" );
	});

	test( "message is set to string passed to constructor", () => {
		let e = new IllegalMoveException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		let e = new IllegalMoveException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		let e = new IllegalMoveException( "", { foo: "bar" } );
		expect( e.data ).not.toBe( undefined );
		expect( e.data.foo ).toBe( "bar" );
	});
});

describe( "GameOverException", () => {
	test( "extends GameException", () => {
		let e = new GameOverException();
		expect( e instanceof GameException ).toBe( true );
	});

	test( "message defaults to 'GAME_OVER'", () => {
		let e = new GameOverException();
		expect( e.message ).toBe( "GAME_OVER" );
	});

	test( "message is set to string passed to constructor", () => {
		let e = new GameOverException( "FOO:BAR" );
		expect( e.message ).toBe( "FOO:BAR" );
	});

	test( "data defaults to null", () => {
		let e = new GameOverException();
		expect( e.data ).toBe( null );
	});

	test( "data is set to second parameter", () => {
		let e = new GameOverException( "", { foo: "bar" } );
		expect( e.data ).not.toBe( undefined );
		expect( e.data.foo ).toBe( "bar" );
	});
});
