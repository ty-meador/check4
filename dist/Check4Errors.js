"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameOverException = exports.PlayerTurnException = exports.IllegalMoveException = exports.GameException = void 0;
/**
 * @class
 * Any game exceptions extend this class so that we can easily check
 * for rule-breaks
 */
class GameException extends Error {
    constructor(msg = "GAME_EXCEPTION") {
        super(msg);
        this.name = this.constructor.name;
    }
}
exports.GameException = GameException;
/**
 * @class
 * Represents a requested move that is not allowed
 */
class IllegalMoveException extends GameException {
    constructor(msg = "ILLEGAL_MOVE", data = null) {
        super(msg);
        this.name = this.constructor.name;
        this.data = data;
    }
}
exports.IllegalMoveException = IllegalMoveException;
/**
 * @class
 * Represents a requested move made by the wrong player
 */
class PlayerTurnException extends GameException {
    constructor(msg = "WRONG_TURN", data = null) {
        super(msg);
        this.name = this.constructor.name;
        this.data = data;
    }
}
exports.PlayerTurnException = PlayerTurnException;
/**
 * @class
 * Represents a game that is already over
 */
class GameOverException extends GameException {
    constructor(msg = "GAME_OVER", data = null) {
        super(msg);
        this.name = this.constructor.name;
        this.data = data;
    }
}
exports.GameOverException = GameOverException;
exports.default = {
    "IllegalMoveException": IllegalMoveException,
    "PlayerTurnException": PlayerTurnException,
    "GameException": GameException,
    "GameOverException": GameOverException
};
