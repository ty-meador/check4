"use strict";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PieceName, PlayerNum } from "../Check4";
import { GameManager } from "./GameManager";
import { moveText, renderLegalMoves, renderState } from "./render";

const RULES = `Check4: two-player 4x4 abstract strategy game.
Each player has 4 pieces: pawn, rook, bishop, knight (chess-style movement;
rook/bishop cannot jump; the pawn moves/captures one square in its facing
direction only - straight to move, diagonally to capture - and flips
direction when it reaches row 0 (to up) or row 3 (to down)).
All pieces start in the gutter (off-board). On your turn: either drop one of
your gutter pieces on any EMPTY square (never capturing), or move one of
your board pieces by its movement rules. Capturing sends the enemy piece
back to its gutter. A piece may never move straight back to the one square
it just left (the gutter counts as a position, so a freshly dropped piece
moves unrestricted and a re-dropped captured piece may go anywhere empty).
WIN: all four of your pieces aligned on one row, one column, or either
diagonal. Coordinates are x (column, 0-3) and y (row, 0-3); boards render
with y=3 on top.`;

const gameId = z.string().describe( "Game id from new_game" );
const playerNum = z
	.union( [ z.literal( 1 ), z.literal( 2 ) ] )
	.describe( "Which player you are acting as (1 or 2)" );
const pieceName = z.enum( [ "pawn", "rook", "bishop", "knight" ] );

function text( body: string ): { content: { type: "text"; text: string }[] } {
	return { content: [ { type: "text", text: body } ] };
}

function fail( error: unknown ): { content: { type: "text"; text: string }[]; isError: true } {
	const message = error instanceof Error ? error.message : String( error );
	return { ...text( `error: ${message}` ), isError: true };
}

/**
 * Build the Check4 MCP server: LLM seats play through these tools. The
 * stdio transport is single-client, so the caller simply states which
 * player it is acting as; games where the caller drives both seats are
 * legitimate (self-play, external orchestration).
 *
 * Outputs are optimized for tokens, not wire latency - model inference
 * dominates every latency budget.
 */
export function buildServer( manager: GameManager = new GameManager() ): McpServer {
	const server = new McpServer(
		{ name: "check4", version: "0.1.0" },
		{ instructions: RULES }
	);

	server.registerTool(
		"new_game",
		{
			title: "Start a Check4 game",
			description:
				"Create a game. Omit bot_player to drive both seats yourself; " +
				"set it to give that seat to a built-in random bot (if the bot " +
				"is player 1 it opens immediately). Returns the game id and " +
				"the starting state.",
			inputSchema: {
				bot_player: playerNum.optional().describe( "Seat for the built-in random bot" ),
				seed: z.number().int().optional().describe( "Bot PRNG seed for reproducible games (default 1)" )
			}
		},
		({ bot_player, seed }) => {
			try {
				const session = manager.newGame({ botPlayer: bot_player as PlayerNum | undefined, seed });
				const opening = session.lastMove
					? `bot opened: ${moveText( session.lastMove )} (P${session.bot?.player})\n`
					: "";
				return text(
					`game: ${session.id}\n${opening}${renderState( session.game.getState() )}`
				);
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"get_state",
		{
			title: "Current game state",
			description:
				"The board and status of a game, plus its canonical state key " +
				"(equal keys = identical position, useful for repetition detection).",
			inputSchema: { game_id: gameId }
		},
		({ game_id }) => {
			try {
				const session = manager.get( game_id );
				const last = session.lastMove ? `last move: ${moveText( session.lastMove )}\n` : "";
				return text(
					`${last}${renderState( session.game.getState() )}\nkey: ${session.game.stateKey()}`
				);
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"legal_moves",
		{
			title: "Legal moves",
			description:
				"Every legal move for the player to move, as piece@xy " +
				"(e.g. knight@13 = your knight to x=1,y=3).",
			inputSchema: { game_id: gameId }
		},
		({ game_id }) => {
			try {
				const session = manager.get( game_id );
				const state = session.game.state;
				const header = state.winner !== null ? "game over" : `P${state.turn} to move`;
				return text( `${header}: ${renderLegalMoves( session.game.legalMoves() )}` );
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"make_move",
		{
			title: "Make a move",
			description:
				"Move (or drop from the gutter) your piece to (x, y). Returns " +
				"the resulting state, including the bot's reply when it holds " +
				"the next seat. Illegal moves fail with the rule violated and " +
				"change nothing.",
			inputSchema: {
				game_id: gameId,
				player: playerNum,
				piece: pieceName.describe( "Which of your pieces to move" ),
				x: z.number().int().min( 0 ).max( 3 ).describe( "Target column" ),
				y: z.number().int().min( 0 ).max( 3 ).describe( "Target row" )
			}
		},
		({ game_id, player, piece, x, y }) => {
			try {
				const move = { player: player as PlayerNum, piece: piece as PieceName, x, y };
				const reply = manager.makeMove( game_id, move );
				const session = manager.get( game_id );
				const lines = [ `ok: ${moveText( move )} (P${player})` ];
				if ( reply ) lines.push( `bot: ${moveText( reply )} (P${reply.player})` );
				lines.push( renderState( session.game.getState() ) );
				return text( lines.join( "\n" ) );
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"resign",
		{
			title: "Resign",
			description: "Forfeit the game as the given player; their opponent wins.",
			inputSchema: { game_id: gameId, player: playerNum }
		},
		({ game_id, player }) => {
			try {
				manager.resign( game_id, player as PlayerNum );
				const session = manager.get( game_id );
				return text( `P${player} resigned. winner: P${session.game.state.winner}` );
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"wait_for_turn",
		{
			title: "Wait for your turn",
			description:
				"Block until it is your turn (or the game ends), then return " +
				"the state - never poll. Resolves immediately when it is " +
				"already your turn. Times out with status 'timeout' (call again).",
			inputSchema: {
				game_id: gameId,
				player: playerNum,
				timeout_ms: z
					.number()
					.int()
					.min( 0 )
					.max( 120000 )
					.optional()
					.describe( "Max wait in ms (default 30000)" )
			}
		},
		async ({ game_id, player, timeout_ms }) => {
			try {
				const result = await manager.waitForTurn( game_id, player as PlayerNum, timeout_ms ?? 30000 );
				if ( result === "timeout" ) return text( "status: timeout (not your turn yet - call again)" );
				const session = manager.get( game_id );
				return text( `status: ${result}\n${renderState( session.game.getState() )}` );
			} catch ( error ) {
				return fail( error );
			}
		}
	);

	server.registerTool(
		"list_games",
		{
			title: "List games",
			description: "Every game hosted by this server, oldest first.",
			inputSchema: {}
		},
		() => {
			const games = manager.listGames();
			if ( !games.length ) return text( "(no games - use new_game)" );
			const lines = games.map( ( g ) => {
				const status = g.winner !== null ? `winner P${g.winner}` : `P${g.turn} to move`;
				const bot = g.botPlayer ? ` bot=P${g.botPlayer}` : "";
				return `${g.id}: ${status}, ply ${g.turnCount}${bot}`;
			});
			return text( lines.join( "\n" ) );
		}
	);

	return server;
}
