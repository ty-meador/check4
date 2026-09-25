"use strict";
/* Differential-fuzz driver, TypeScript side. Implements the shared CONTRACT
   (V1): xorshift32 PRNG, canonical legal-move enumeration order, and the
   trace format — one ply line per move, one END line per game — printed to
   stdout. The Rust driver run with identical args must match byte-for-byte.

   Usage: node scripts/diff-fuzz.js [--seed N] [--games N] [--ply-cap N] */
/* eslint-disable @typescript-eslint/no-var-requires -- plain Node script, loads the built dist via CommonJS */

const fs = require( "fs" );
const path = require( "path" );

const enginePath = path.join( __dirname, "..", "dist", "Check4.js" );
if ( !fs.existsSync( enginePath ) ) {
	console.error( "diff-fuzz: dist/Check4.js not found — run `npm run build` first." );
	process.exit( 1 );
}
const Check4 = require( "../dist/Check4" ).default;

const U32_MAX = 4294967295;

function parseArgs( argv ) {
	const opts = { seed: 42, games: 100, plyCap: 200 };
	const names = { "--seed": "seed", "--games": "games", "--ply-cap": "plyCap" };
	for ( let i = 0; i < argv.length; i++ ) {
		let flag = argv[i];
		let raw;
		const eq = flag.indexOf( "=" );
		if ( eq !== -1 ) {
			raw = flag.slice( eq + 1 );
			flag = flag.slice( 0, eq );
		} else {
			raw = argv[++i];
		}
		const key = names[flag];
		if ( !key ) {
			console.error( `diff-fuzz: unknown argument "${flag}" (expected --seed, --games, --ply-cap)` );
			process.exit( 1 );
		}
		// Same domain the Rust driver enforces via parse::<u32>(): a plain
		// decimal u32 — no exponents, hex, or silent 2^32 wrapping.
		if ( raw === undefined || !/^\d+$/.test( raw ) || Number( raw ) > U32_MAX ) {
			console.error( `diff-fuzz: ${flag} needs a decimal integer in 0..=${U32_MAX}, got "${raw}"` );
			process.exit( 1 );
		}
		opts[key] = Number( raw );
	}
	return opts;
}

function makeRng( baseSeed, gameIndex ) {
	// xorshift32, u32 wrapping arithmetic; per-game seed = baseSeed + gameIndex * 0x9E3779B1.
	let s = ( baseSeed + Math.imul( gameIndex, 0x9E3779B1 ) ) >>> 0;
	if ( s === 0 ) s = 0x9E3779B9;
	return function next() {
		s = ( s ^ ( s << 13 ) ) >>> 0;
		s = ( s ^ ( s >>> 17 ) ) >>> 0;
		s = ( s ^ ( s << 5 ) ) >>> 0;
		return s;
	};
}

function playGame( baseSeed, g, plyCap, lines ) {
	const game = new Check4({ p1: { name: "a" }, p2: { name: "b" } });
	const rng = makeRng( baseSeed, g );
	let ply = 0;
	while ( ply < plyCap && game.state.winner === null ) {
		// The engine's own legalMoves() enumerates in the contract's
		// canonical order (piece pawn/rook/bishop/knight, x outer, y inner),
		// so the fuzz exercises the normative public API directly.
		const moves = game.legalMoves();
		if ( moves.length === 0 ) break; // theoretical stalemate
		const listStr = moves.map( m => `${m.piece}@${m.x}${m.y}` ).join( ";" );
		const m = moves[rng() % moves.length];
		game.takeTurn( m );
		lines.push( `G${g} P${ply} A${listStr} M${m.player}:${m.piece}:${m.x}${m.y} L${moves.length} K${game.stateKey()}` );
		ply++;
	}
	lines.push( `G${g} END W${game.state.winner === null ? "-" : game.state.winner} N${ply}` );
}

function main() {
	const { seed, games, plyCap } = parseArgs( process.argv.slice( 2 ) );
	const lines = [`SEED ${seed} GAMES ${games} PLYCAP ${plyCap} V1`];
	for ( let g = 0; g < games; g++ ) playGame( seed, g, plyCap, lines );
	console.log( lines.join( "\n" ) );
}

main();
