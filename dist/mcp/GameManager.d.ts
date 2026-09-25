import Check4, { MoveInput, PlayerNum } from "../Check4";
import { Xorshift32 } from "./random";
/**
 * The built-in random opponent: picks uniformly from the engine's legal
 * move list with the fuzz-contract PRNG, so a seeded bot game is exactly
 * reproducible.
 */
interface Bot {
    player: PlayerNum;
    rng: Xorshift32;
    seed: number;
}
/** One hosted game. */
export interface GameSession {
    id: string;
    game: Check4;
    bot: Bot | null;
    /** The last move applied to the board, if any. */
    lastMove: MoveInput | null;
}
export interface NewGameOptions {
    /**
     * Give this seat to the built-in random bot. Omit for a game where the
     * caller drives both seats (self-play, or an external orchestrator).
     */
    botPlayer?: PlayerNum;
    /** PRNG seed for the bot (coerced to non-zero u32). Default 1. */
    seed?: number;
}
export interface GameSummary {
    id: string;
    turn: PlayerNum;
    turnCount: number;
    winner: PlayerNum | null;
    botPlayer: PlayerNum | null;
}
export type WaitResult = "your-turn" | "game-over" | "timeout";
/**
 * Hosts Check4 games for one MCP connection: creates sessions, applies
 * moves (letting the bot reply on its turns), and parks `wait_for_turn`
 * long-polls until the board comes back around.
 *
 * The stdio transport is single-client, so seats need no authentication —
 * the caller says which player it is acting as. Ed25519 key-backed seats
 * arrive with the napi protocol binding.
 */
export declare class GameManager {
    private games;
    private waiters;
    private nextId;
    /**
     * Create a game. If the bot holds seat 1 it opens immediately, so the
     * caller always receives a board where it is their turn (or the game is
     * over).
     */
    newGame(options?: NewGameOptions): GameSession;
    /** Look up a session or throw. */
    get(id: string): GameSession;
    /**
     * Apply the caller's move, then let the bot answer if it holds the next
     * turn. Engine exceptions (illegal move, wrong turn, game over)
     * propagate to the caller untouched.
     * @returns The bot's reply move, if it made one.
     */
    makeMove(id: string, move: MoveInput): MoveInput | null;
    /** Resign the game for a seat the caller holds. */
    resign(id: string, player: PlayerNum): void;
    /**
     * Resolve when it is `player`'s turn or the game ends — immediately if
     * either already holds. Never make a model poll.
     */
    waitForTurn(id: string, player: PlayerNum, timeoutMs: number): Promise<WaitResult>;
    /** Summaries of every hosted game, oldest first. */
    listGames(): GameSummary[];
    /** If the bot holds the current turn, play its random legal move. */
    private botReply;
    /** Wake waiters whose turn has arrived (or whose game just ended). */
    private notify;
    private dropWaiter;
}
export {};
