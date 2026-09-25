import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GameManager } from "./GameManager";
/**
 * Build the Check4 MCP server: LLM seats play through these tools. The
 * stdio transport is single-client, so the caller simply states which
 * player it is acting as; games where the caller drives both seats are
 * legitimate (self-play, external orchestration).
 *
 * Outputs are optimized for tokens, not wire latency - model inference
 * dominates every latency budget.
 */
export declare function buildServer(manager?: GameManager): McpServer;
