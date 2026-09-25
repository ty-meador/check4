#!/usr/bin/env node
"use strict";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server";

/**
 * Run the Check4 MCP server on stdio. This is the `check4-mcp` bin entry:
 * point an MCP client at it and its model has a seat at the table.
 */
async function main(): Promise<void> {
	await buildServer().connect( new StdioServerTransport() );
}

main().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
});
