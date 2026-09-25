"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const Check4_1 = __importDefault(require("../Check4"));
const random_1 = require("./random");
/**
 * Hosts Check4 games for one MCP connection: creates sessions, applies
 * moves (letting the bot reply on its turns), and parks `wait_for_turn`
 * long-polls until the board comes back around.
 *
 * The stdio transport is single-client, so seats need no authentication —
 * the caller says which player it is acting as. Ed25519 key-backed seats
 * arrive with the napi protocol binding.
 */
class GameManager {
    constructor() {
        this.games = new Map();
        this.waiters = new Map();
        this.nextId = 1;
    }
    /**
     * Create a game. If the bot holds seat 1 it opens immediately, so the
     * caller always receives a board where it is their turn (or the game is
     * over).
     */
    newGame(options = {}) {
        var _a, _b;
        const id = `g${this.nextId++}`;
        const session = {
            id,
            game: new Check4_1.default({ p1: { name: "P1" }, p2: { name: "P2" } }),
            bot: options.botPlayer
                ? {
                    player: options.botPlayer,
                    rng: new random_1.Xorshift32((0, random_1.normalizeSeed)((_a = options.seed) !== null && _a !== void 0 ? _a : 1)),
                    seed: (0, random_1.normalizeSeed)((_b = options.seed) !== null && _b !== void 0 ? _b : 1)
                }
                : null,
            lastMove: null
        };
        this.games.set(id, session);
        this.botReply(session);
        return session;
    }
    /** Look up a session or throw. */
    get(id) {
        const session = this.games.get(id);
        if (!session)
            throw new Error(`no such game: ${id} (use new_game, or list_games for open games)`);
        return session;
    }
    /**
     * Apply the caller's move, then let the bot answer if it holds the next
     * turn. Engine exceptions (illegal move, wrong turn, game over)
     * propagate to the caller untouched.
     * @returns The bot's reply move, if it made one.
     */
    makeMove(id, move) {
        const session = this.get(id);
        if (session.bot && move.player === session.bot.player) {
            throw new Error(`player ${move.player} is the bot's seat in ${id}`);
        }
        session.game.takeTurn(move);
        session.lastMove = move;
        const reply = this.botReply(session);
        this.notify(session);
        return reply;
    }
    /** Resign the game for a seat the caller holds. */
    resign(id, player) {
        const session = this.get(id);
        if (session.bot && player === session.bot.player) {
            throw new Error(`player ${player} is the bot's seat in ${id}`);
        }
        if (session.game.state.winner !== null) {
            throw new Error(`${id} is already over`);
        }
        session.game.forfeit(player);
        this.notify(session);
    }
    /**
     * Resolve when it is `player`'s turn or the game ends — immediately if
     * either already holds. Never make a model poll.
     */
    waitForTurn(id, player, timeoutMs) {
        const session = this.get(id);
        if (session.game.state.winner !== null)
            return Promise.resolve("game-over");
        if (session.game.state.turn === player)
            return Promise.resolve("your-turn");
        return new Promise((resolve) => {
            var _a;
            const list = (_a = this.waiters.get(id)) !== null && _a !== void 0 ? _a : [];
            const waiter = {
                player,
                resolve,
                timer: setTimeout(() => {
                    this.dropWaiter(id, waiter);
                    resolve("timeout");
                }, timeoutMs)
            };
            list.push(waiter);
            this.waiters.set(id, list);
        });
    }
    /** Summaries of every hosted game, oldest first. */
    listGames() {
        return [...this.games.values()].map((s) => {
            var _a, _b;
            return ({
                id: s.id,
                turn: s.game.state.turn,
                turnCount: s.game.state.turnCount,
                winner: s.game.state.winner,
                botPlayer: (_b = (_a = s.bot) === null || _a === void 0 ? void 0 : _a.player) !== null && _b !== void 0 ? _b : null
            });
        });
    }
    /** If the bot holds the current turn, play its random legal move. */
    botReply(session) {
        const { bot, game } = session;
        if (!bot || game.state.winner !== null || game.state.turn !== bot.player)
            return null;
        const moves = game.legalMoves();
        // Theoretical stalemate (no legal moves, no winner): the bot simply
        // cannot answer; the harness ply cap adjudicates such games.
        if (!moves.length)
            return null;
        const move = moves[bot.rng.next() % moves.length];
        game.takeTurn(move);
        session.lastMove = move;
        return move;
    }
    /** Wake waiters whose turn has arrived (or whose game just ended). */
    notify(session) {
        const list = this.waiters.get(session.id);
        if (!list)
            return;
        const over = session.game.state.winner !== null;
        const remaining = list.filter((waiter) => {
            if (!over && session.game.state.turn !== waiter.player)
                return true;
            clearTimeout(waiter.timer);
            waiter.resolve(over ? "game-over" : "your-turn");
            return false;
        });
        if (remaining.length)
            this.waiters.set(session.id, remaining);
        else
            this.waiters.delete(session.id);
    }
    dropWaiter(id, waiter) {
        const list = this.waiters.get(id);
        if (!list)
            return;
        const remaining = list.filter((w) => w !== waiter);
        if (remaining.length)
            this.waiters.set(id, remaining);
        else
            this.waiters.delete(id);
    }
}
exports.GameManager = GameManager;
