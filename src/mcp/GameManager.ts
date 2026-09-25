"use strict";

import Check4, { MoveInput, PlayerNum } from "../Check4";
import { Xorshift32, normalizeSeed } from "./random";

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

interface Waiter {
	player: PlayerNum;
	resolve: ( result: WaitResult ) => void;
	timer: NodeJS.Timeout;
}

/**
 * Hosts Check4 games for one MCP connection: creates sessions, applies
 * moves (letting the bot reply on its turns), and parks `wait_for_turn`
 * long-polls until the board comes back around.
 *
 * The stdio transport is single-client, so seats need no authentication —
 * the caller says which player it is acting as. Ed25519 key-backed seats
 * arrive with the napi protocol binding.
 */
export class GameManager {
	private games = new Map<string, GameSession>();
	private waiters = new Map<string, Waiter[]>();
	private nextId = 1;

	/**
	 * Create a game. If the bot holds seat 1 it opens immediately, so the
	 * caller always receives a board where it is their turn (or the game is
	 * over).
	 */
	newGame( options: NewGameOptions = {}): GameSession {
		const id = `g${this.nextId++}`;
		const session: GameSession = {
			id,
			game: new Check4({ p1: { name: "P1" }, p2: { name: "P2" } }),
			bot: options.botPlayer
				? {
					player: options.botPlayer,
					rng: new Xorshift32( normalizeSeed( options.seed ?? 1 ) ),
					seed: normalizeSeed( options.seed ?? 1 )
				}
				: null,
			lastMove: null
		};
		this.games.set( id, session );
		this.botReply( session );
		return session;
	}

	/** Look up a session or throw. */
	get( id: string ): GameSession {
		const session = this.games.get( id );
		if ( !session ) throw new Error( `no such game: ${id} (use new_game, or list_games for open games)` );
		return session;
	}

	/**
	 * Apply the caller's move, then let the bot answer if it holds the next
	 * turn. Engine exceptions (illegal move, wrong turn, game over)
	 * propagate to the caller untouched.
	 * @returns The bot's reply move, if it made one.
	 */
	makeMove( id: string, move: MoveInput ): MoveInput | null {
		const session = this.get( id );
		if ( session.bot && move.player === session.bot.player ) {
			throw new Error( `player ${move.player} is the bot's seat in ${id}` );
		}

		session.game.takeTurn( move );
		session.lastMove = move;
		const reply = this.botReply( session );
		this.notify( session );
		return reply;
	}

	/** Resign the game for a seat the caller holds. */
	resign( id: string, player: PlayerNum ): void {
		const session = this.get( id );
		if ( session.bot && player === session.bot.player ) {
			throw new Error( `player ${player} is the bot's seat in ${id}` );
		}
		if ( session.game.state.winner !== null ) {
			throw new Error( `${id} is already over` );
		}
		session.game.forfeit( player );
		this.notify( session );
	}

	/**
	 * Resolve when it is `player`'s turn or the game ends — immediately if
	 * either already holds. Never make a model poll.
	 */
	waitForTurn( id: string, player: PlayerNum, timeoutMs: number ): Promise<WaitResult> {
		const session = this.get( id );
		if ( session.game.state.winner !== null ) return Promise.resolve( "game-over" );
		if ( session.game.state.turn === player ) return Promise.resolve( "your-turn" );

		return new Promise( ( resolve ) => {
			const list = this.waiters.get( id ) ?? [];
			const waiter: Waiter = {
				player,
				resolve,
				timer: setTimeout( () => {
					this.dropWaiter( id, waiter );
					resolve( "timeout" );
				}, timeoutMs )
			};
			list.push( waiter );
			this.waiters.set( id, list );
		});
	}

	/** Summaries of every hosted game, oldest first. */
	listGames(): GameSummary[] {
		return [ ...this.games.values() ].map( ( s ) => ({
			id: s.id,
			turn: s.game.state.turn,
			turnCount: s.game.state.turnCount,
			winner: s.game.state.winner,
			botPlayer: s.bot?.player ?? null
		}) );
	}

	/** If the bot holds the current turn, play its random legal move. */
	private botReply( session: GameSession ): MoveInput | null {
		const { bot, game } = session;
		if ( !bot || game.state.winner !== null || game.state.turn !== bot.player ) return null;

		const moves = game.legalMoves();
		// Theoretical stalemate (no legal moves, no winner): the bot simply
		// cannot answer; the harness ply cap adjudicates such games.
		if ( !moves.length ) return null;

		const move = moves[bot.rng.next() % moves.length];
		game.takeTurn( move );
		session.lastMove = move;
		return move;
	}

	/** Wake waiters whose turn has arrived (or whose game just ended). */
	private notify( session: GameSession ): void {
		const list = this.waiters.get( session.id );
		if ( !list ) return;

		const over = session.game.state.winner !== null;
		const remaining = list.filter( ( waiter ) => {
			if ( !over && session.game.state.turn !== waiter.player ) return true;
			clearTimeout( waiter.timer );
			waiter.resolve( over ? "game-over" : "your-turn" );
			return false;
		});

		if ( remaining.length ) this.waiters.set( session.id, remaining );
		else this.waiters.delete( session.id );
	}

	private dropWaiter( id: string, waiter: Waiter ): void {
		const list = this.waiters.get( id );
		if ( !list ) return;
		const remaining = list.filter( ( w ) => w !== waiter );
		if ( remaining.length ) this.waiters.set( id, remaining );
		else this.waiters.delete( id );
	}
}
