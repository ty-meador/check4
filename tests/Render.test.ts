import Check4 from "../src/Check4";
import { moveText, renderBoard, renderLegalMoves, renderState } from "../src/mcp/render";

function newGame(): Check4 {
	return new Check4( { p1: { name: "P1" }, p2: { name: "P2" } } );
}

describe( "moveText", () => {
	it( "renders the canonical piece@xy form", () => {
		expect( moveText( { player: 1, piece: "knight", x: 1, y: 3 } ) ).toBe( "knight@13" );
		expect( moveText( { player: 2, piece: "pawn", x: 0, y: 0 } ) ).toBe( "pawn@00" );
	} );
} );

describe( "renderBoard", () => {
	it( "renders an empty board with y=3 on top", () => {
		expect( renderBoard( newGame().getState() ) ).toBe(
			[
				"3 . . . .",
				"2 . . . .",
				"1 . . . .",
				"0 . . . .",
				"  0 1 2 3"
			].join( "\n" )
		);
	} );

	it( "places P1 uppercase and P2 lowercase at (x, y)", () => {
		const game = newGame();
		game.takeTurn( { player: 1, piece: "knight", x: 1, y: 3 } );
		game.takeTurn( { player: 2, piece: "rook", x: 2, y: 0 } );

		expect( renderBoard( game.getState() ) ).toBe(
			[
				"3 . N . .",
				"2 . . . .",
				"1 . . . .",
				"0 . . r .",
				"  0 1 2 3"
			].join( "\n" )
		);
	} );
} );

describe( "renderState", () => {
	it( "shows turn, full gutters and pawn directions on a fresh game", () => {
		const text = renderState( newGame().getState() );
		expect( text ).toContain( "turn: P1 (ply 0)" );
		expect( text ).toContain( "gutter (drop on any empty square): P1 [P,R,B,N] P2 [p,r,b,n]" );
		expect( text ).toContain( "pawn directions: P1 up P2 down" );
		expect( text ).not.toContain( "no-backtrack" );
		expect( text ).not.toContain( "winner" );
	} );

	it( "shows no-backtrack blocks for moved pieces and drops empty gutters", () => {
		const game = newGame();
		game.takeTurn( { player: 1, piece: "rook", x: 0, y: 0 } );
		game.takeTurn( { player: 2, piece: "rook", x: 3, y: 3 } );
		game.takeTurn( { player: 1, piece: "rook", x: 0, y: 2 } );

		const text = renderState( game.getState() );
		expect( text ).toContain( "no-backtrack (piece cannot return to that square): P1 R!=(0,0)" );
		expect( text ).toContain( "gutter (drop on any empty square): P1 [P,B,N] P2 [p,b,n]" );
	} );

	it( "shows the winner once the game is over", () => {
		const game = newGame();
		game.forfeit( 1 );
		expect( renderState( game.getState() ) ).toContain( "winner: P2 (ply 0)" );
	} );
} );

describe( "renderLegalMoves", () => {
	it( "renders the canonical move list", () => {
		const game = newGame();
		const text = renderLegalMoves( game.legalMoves() );
		expect( text.split( " " ) ).toHaveLength( 64 );
		expect( text.startsWith( "pawn@00 " ) ).toBe( true );
		expect( text ).toContain( "knight@33" );
	} );

	it( "explains an empty list", () => {
		expect( renderLegalMoves( [] ) ).toBe( "(none - game over)" );
	} );
} );
