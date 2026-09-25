import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/mcp/server";

/** Drive the real server through a real MCP client, in memory. */
async function connect(): Promise<Client> {
	const [ clientTransport, serverTransport ] = InMemoryTransport.createLinkedPair();
	const client = new Client( { name: "test", version: "0.0.0" } );
	await buildServer().connect( serverTransport );
	await client.connect( clientTransport );
	return client;
}

async function callText(
	client: Client,
	name: string,
	args: Record<string, unknown>
): Promise<{ text: string; isError: boolean }> {
	const result = await client.callTool( { name, arguments: args } );
	const content = result.content as Array<{ type: string; text: string }>;
	return { text: content[0].text, isError: result.isError === true };
}

describe( "check4 MCP server", () => {
	it( "lists the seven tools", async () => {
		const client = await connect();
		const { tools } = await client.listTools();
		expect( tools.map( ( t ) => t.name ).sort() ).toEqual( [
			"get_state",
			"legal_moves",
			"list_games",
			"make_move",
			"new_game",
			"resign",
			"wait_for_turn"
		] );
	} );

	it( "plays a full turn cycle against the bot", async () => {
		const client = await connect();

		const created = await callText( client, "new_game", { bot_player: 2, seed: 42 } );
		expect( created.isError ).toBe( false );
		expect( created.text ).toContain( "game: g1" );
		expect( created.text ).toContain( "turn: P1 (ply 0)" );

		const moves = await callText( client, "legal_moves", { game_id: "g1" } );
		expect( moves.text ).toContain( "P1 to move:" );
		expect( moves.text ).toContain( "pawn@00" );

		const moved = await callText( client, "make_move", {
			game_id: "g1", player: 1, piece: "pawn", x: 0, y: 0
		} );
		expect( moved.isError ).toBe( false );
		expect( moved.text ).toContain( "ok: pawn@00 (P1)" );
		expect( moved.text ).toMatch( /bot: \w+@\d\d \(P2\)/ );
		expect( moved.text ).toContain( "turn: P1 (ply 2)" );

		const state = await callText( client, "get_state", { game_id: "g1" } );
		expect( state.text ).toContain( "last move:" );
		expect( state.text ).toMatch( /key: t1\|w-\|/ );

		const wait = await callText( client, "wait_for_turn", { game_id: "g1", player: 1 } );
		expect( wait.text ).toContain( "status: your-turn" );
	} );

	it( "surfaces engine rejections as tool errors without mutating state", async () => {
		const client = await connect();
		await callText( client, "new_game", {} );

		const wrongTurn = await callText( client, "make_move", {
			game_id: "g1", player: 2, piece: "pawn", x: 0, y: 0
		} );
		expect( wrongTurn.isError ).toBe( true );
		expect( wrongTurn.text ).toContain( "error:" );

		const state = await callText( client, "get_state", { game_id: "g1" } );
		expect( state.text ).toContain( "turn: P1 (ply 0)" );
	} );

	it( "handles resignation and unknown games", async () => {
		const client = await connect();
		await callText( client, "new_game", {} );

		const resigned = await callText( client, "resign", { game_id: "g1", player: 1 } );
		expect( resigned.text ).toBe( "P1 resigned. winner: P2" );

		const gone = await callText( client, "get_state", { game_id: "g404" } );
		expect( gone.isError ).toBe( true );
		expect( gone.text ).toContain( "no such game" );
	} );

	it( "lists hosted games", async () => {
		const client = await connect();
		const empty = await callText( client, "list_games", {} );
		expect( empty.text ).toBe( "(no games - use new_game)" );

		await callText( client, "new_game", {} );
		await callText( client, "new_game", { bot_player: 1, seed: 3 } );
		const listed = await callText( client, "list_games", {} );
		expect( listed.text ).toContain( "g1: P1 to move, ply 0" );
		expect( listed.text ).toContain( "g2: P2 to move, ply 1 bot=P1" );
	} );
} );
