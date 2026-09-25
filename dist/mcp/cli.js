#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const server_1 = require("./server");
/**
 * Run the Check4 MCP server on stdio. This is the `check4-mcp` bin entry:
 * point an MCP client at it and its model has a seat at the table.
 */
async function main() {
    await (0, server_1.buildServer)().connect(new stdio_js_1.StdioServerTransport());
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
