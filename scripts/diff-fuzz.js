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

const PIECES = ["pawn", "rook", "bishop", "knight"];

function parseArgs( argv ) {
	const opts = { seed: 42, games: 100, plyCap: 200 };
	const names = { "--seed": "seed", "--games": "games", "--ply-cap": "plyCap" };
	for ( let i = 0; i < argv.length; i += 2 ) {
		const key = names[argv[i]];
		if ( !key ) {
			console.error( `diff-fuzz: unknown argument "${argv[i]}" (expected --seed, --games, --ply-cap)` );
			process.exit( 1 );
		}
		const value = Number( argv[i + 1] );
		if ( !Number.isInteger( value ) || value < 0 ) {
			console.error( `diff-fuzz: ${argv[i]} needs a non-negative integer, got "${argv[i + 1]}"` );
			process.exit( 1 );
		}
		opts[key] = value;
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

function legalList( game ) {
	// canonical order: piece (pawn,rook,bishop,knight), x outer 0..3, y inner 0..3
	const moves = [];
	for ( const piece of PIECES )
		for ( let x = 0; x < 4; x++ )
			for ( let y = 0; y < 4; y++ ) {
				const m = { player: game.state.turn, piece, x, y };
				if ( game.moveIsValid( m ) ) moves.push( m );
			}
	return moves;
}

function playGame( baseSeed, g, plyCap, lines ) {
	const game = new Check4({ p1: { name: "a" }, p2: { name: "b" } });
	const rng = makeRng( baseSeed, g );
	let ply = 0;
	while ( ply < plyCap && game.state.winner === null ) {
		const moves = legalList( game );
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
