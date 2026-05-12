/**
 * @class
 * Any game exceptions extend this class so that we can easily check
 * for rule-breaks
 */
export declare class GameException extends Error {
    constructor(msg?: string);
}
/**
 * @class
 * Represents a requested move that is not allowed
 */
export declare class IllegalMoveException<T = unknown> extends GameException {
    readonly data: T | null;
    constructor(msg?: string, data?: T | null);
}
/**
 * @class
 * Represents a requested move made by the wrong player
 */
export declare class PlayerTurnException<T = unknown> extends GameException {
    readonly data: T | null;
    constructor(msg?: string, data?: T | null);
}
/**
 * @class
 * Represents a game that is already over
 */
export declare class GameOverException<T = unknown> extends GameException {
    readonly data: T | null;
    constructor(msg?: string, data?: T | null);
}
declare const _default: {
    IllegalMoveException: typeof IllegalMoveException;
    PlayerTurnException: typeof PlayerTurnException;
    GameException: typeof GameException;
    GameOverException: typeof GameOverException;
};
export default _default;
