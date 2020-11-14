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
export class IllegalMoveException extends GameException {
	constructor( msg = "ILLEGAL_MOVE", data = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

/**
 * @class
 * Represents a requested move made by the wrong player
 */
export class PlayerTurnException extends GameException {
	constructor( msg = "WRONG_TURN", data = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

/**
 * @class
 * Represents a game that is already over
 */
export class GameOverException extends GameException {
	constructor( msg = "GAME_OVER", data = null ) {
		super( msg );
		this.name = this.constructor.name;
		this.data = data;
	}
}

export default {
	IllegalMoveException,
	PlayerTurnException,
	GameException,
	GameOverException
};
