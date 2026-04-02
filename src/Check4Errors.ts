"use strict";

/**
 * @class
 * Any game exceptions extend this class so that we can easily check
 * for rule-breaks
 */
export class GameException extends Error {
	constructor( msg = "GAME_EXCEPTION" ) {
		super( msg );
		this.name = this.constructor.name;
	}
}

/**
 * @class
 * Represents a requested move that is not allowed
 */
export class IllegalMoveException<T = unknown> extends GameException {
	readonly data: T | null;

	constructor( msg = "ILLEGAL_MOVE", data: T | null = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

/**
 * @class
 * Represents a requested move made by the wrong player
 */
export class PlayerTurnException<T = unknown> extends GameException {
	readonly data: T | null;

	constructor( msg = "WRONG_TURN", data: T | null = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

/**
 * @class
 * Represents a game that is already over
 */
export class GameOverException<T = unknown> extends GameException {
	readonly data: T | null;

	constructor( msg = "GAME_OVER", data: T | null = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

export default {
	"IllegalMoveException": IllegalMoveException,
	"PlayerTurnException": PlayerTurnException,
	"GameException": GameException,
	"GameOverException": GameOverException
};
