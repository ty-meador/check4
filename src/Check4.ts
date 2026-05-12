"use strict";

import { Pawn, Rook, Knight, Bishop, Piece } from "./Pieces";
import {
	GameException,
	IllegalMoveException,
	PlayerTurnException,
	GameOverException
} from "./Check4Errors";

export type PlayerNum = 1 | 2;
export type PieceName = "pawn" | "rook" | "bishop" | "knight";

export interface PlayerState {
	name: string;
	pawn: Pawn;
	rook: Rook;
	bishop: Bishop;
	knight: Knight;
}

export interface GameState {
	turn: PlayerNum;
	turnCount: number;
	winner: PlayerNum | null;
	p1: PlayerState;
	p2: PlayerState;
}

export interface MoveInput {
	player: PlayerNum;
	piece: PieceName;
	x: number;
	y: number;
}

export interface SetStateInput {
	turn: PlayerNum;
	turnCount: number;
	winner: PlayerNum | null;
	p1?: Partial<Record<PieceName, { x: number | null; y: number | null }>>;
	p2?: Partial<Record<PieceName, { x: number | null; y: number | null }>>;
}

interface Move {
	playerNum: PlayerNum;
	player: PlayerState;
	piece: Piece;
	x: number;
	y: number;
}

export interface Check4Props {
	p1: Partial<PlayerState> & { name?: string };
	p2: Partial<PlayerState> & { name?: string };
}

/**
 * The Check4 game engine.
 *
 * A two-player 4x4 abstract strategy game. Each player controls 4 chess-flavored
 * pieces (Pawn, Rook, Knight, Bishop) and wins by aligning all four pieces
 * horizontally, vertically, or diagonally.
 */
export default class Check4 {
	/** Live game state — piece objects, turn, winner. */
	public state: GameState;

	private _winCallback: ( state: GameState ) => void;

	/**
	 * Create a new Check4 game instance.
	 * @param props - Player configurations. Both p1 and p2 are required.
	 * @throws {Error} If either player is missing.
	 */
	constructor( props?: Check4Props ) {
		if ( !props?.p1 || !props?.p2 ) {
			throw new Error( "You can't create a game without players!" );
		}

		this._winCallback = () => {};

		this.state = {
			turn: 1,
			turnCount: 0,
			winner: null,
			p1: this._createPlayer( props.p1, false ),
			p2: this._createPlayer( props.p2, true )
		};

		this._resetAllPieces();
	}

	/**
	 * Register a callback to be invoked when the game ends.
	 * @param fn - Called with the final game state when a winner is declared.
	 */
	onWin( fn: ( state: GameState ) => void ): void {
		this._winCallback = fn;
	}

	/**
	 * Execute a move. Throws a GameException subclass if the move is invalid.
	 * @param input - The move to attempt.
	 * @throws {PlayerTurnException} If it is not this player's turn.
	 * @throws {GameOverException} If the game is already over.
	 * @throws {IllegalMoveException} If the move violates game rules.
	 */
	takeTurn( input: MoveInput ): void {
		const move = this._normalize( input );

		this._assertGameActive();
		this._assertTurn( move );

		if ( this._handleGutterMove( move ) ) return;

		this._assertCanMove( move );
		this._assertNoJumping( move );

		this._applyMove( move );
		this._finalizeTurn( move );
	}

	/**
	 * Check whether a move is valid without mutating game state.
	 * @param input - The move to validate.
	 * @returns `true` if the move is legal, `false` otherwise.
	 */
	moveIsValid( input: MoveInput ): boolean {
		try {
			const move = this._normalize( input );

			this._assertGameActive();
			this._assertTurn( move );

			if ( this._isGutterMoveValid( move ) ) return true;

			this._assertCanMove( move );
			this._assertNoJumping( move );

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Forfeit the game. The current player (or the specified player) loses.
	 * @param player - The player forfeiting. Defaults to the player whose turn it is.
	 */
	forfeit( player?: PlayerNum ): void {
		const loser = player ?? this.state.turn;
		const winner = loser === 1 ? 2 : 1;
		this._declareWinner( winner );
	}

	/**
	 * Returns a serializable snapshot of the current game state.
	 */
	getState() {
		const snapshot = ( p: PlayerState ) => ({
			pawn: { x: p.pawn.x(), y: p.pawn.y() },
			rook: { x: p.rook.x(), y: p.rook.y() },
			bishop: { x: p.bishop.x(), y: p.bishop.y() },
			knight: { x: p.knight.x(), y: p.knight.y() }
		});

		return {
			turn: this.state.turn,
			turnCount: this.state.turnCount,
			winner: this.state.winner,
			p1: snapshot( this.state.p1 ),
			p2: snapshot( this.state.p2 )
		};
	}

	/**
	 * Overwrite the game state. Validates all fields; throws if malformed.
	 * Useful for restoring a saved game.
	 * @param s - The new state to apply.
	 * @throws {GameException} If any field is invalid.
	 */
	setState( s: SetStateInput ): void {
		const data = s as unknown as Record<string, unknown>;

		if ( data["turn"] !== 1 && data["turn"] !== 2 )
			throw new GameException( "Invalid turn value" );

		const tc = data["turnCount"];
		if ( typeof tc !== "number" || !Number.isFinite( tc ) || tc < 0 )
			throw new GameException( "Invalid turnCount value" );

		const w = data["winner"];
		if ( w !== null && w !== 1 && w !== 2 )
			throw new GameException( "Invalid winner value" );

		this.state.turn = s.turn;
		this.state.turnCount = s.turnCount;

		const updatePlayer = (
			player: PlayerState,
			ps: SetStateInput["p1"]
		): void => {
			if ( !ps ) return;
			for ( const name of ["pawn", "rook", "bishop", "knight"] as PieceName[] ) {
				const coords = ps[name];
				if ( coords !== undefined ) player[name].move( coords.x, coords.y );
			}
		};

		updatePlayer( this.state.p1, s.p1 );
		updatePlayer( this.state.p2, s.p2 );

		if ( s.winner !== null ) {
			this._declareWinner( s.winner );
		} else {
			this.state.winner = null;
		}
	}

	/* =========================
	   Core Move Pipeline
	========================= */

	/** Normalize and validate raw move input into an internal Move object. */
	private _normalize( input: MoveInput ): Move {
		const data = input as unknown as Record<string, unknown>;
		const player = data["player"];
		const piece = data["piece"];
		const x = data["x"];
		const y = data["y"];

		if ( player == null ) throw new TypeError( "No player specified" );
		if ( player !== 1 && player !== 2 ) throw new TypeError( "Invalid player" );

		if ( piece == null ) throw new TypeError( "No piece specified" );
		const validPieces = ["pawn", "rook", "bishop", "knight"];
		if ( !validPieces.includes( piece as string ) )
			throw new TypeError( `Unknown piece ${piece} specified` );

		if ( !Number.isInteger( x ) || !Number.isInteger( y ) )
			throw new IllegalMoveException( "Coordinates must be integers" );

		if ( ( x as number ) < 0 || ( y as number ) < 0 || ( x as number ) > 3 || ( y as number ) > 3 )
			throw new IllegalMoveException( "Out of bounds" );

		const playerNum = player as PlayerNum;
		const pieceName = piece as PieceName;
		const playerState = playerNum === 1 ? this.state.p1 : this.state.p2;

		return {
			playerNum,
			player: playerState,
			piece: playerState[pieceName],
			x: x as number,
			y: y as number
		};
	}

	/** Throw if the game is already over. */
	private _assertGameActive(): void {
		if ( this.state.winner !== null ) {
			throw new GameOverException( "Game is already over", this.state );
		}
	}

	/** Throw if it is not this player's turn. */
	private _assertTurn( move: Move ): void {
		if ( move.playerNum !== this.state.turn ) {
			throw new PlayerTurnException( "It's not your turn!" );
		}
	}

	/** Handle placement from the gutter. Returns true if the move was handled. */
	private _handleGutterMove( move: Move ): boolean {
		if ( !this._inGutter( move.piece ) ) return false;

		if ( this._occupied( move.x, move.y ) ) {
			throw new IllegalMoveException( "Pieces moved from the gutter must be placed on an empty square" );
		}

		move.piece.move( move.x, move.y );
		this._orientPawn( move );
		this._endTurn();
		this._checkWin( move );
		return true;
	}

	/** Validate a gutter placement without mutating state. */
	private _isGutterMoveValid( move: Move ): boolean {
		if ( !this._inGutter( move.piece ) ) return false;
		if ( this._occupied( move.x, move.y ) ) {
			throw new IllegalMoveException( "Pieces moved from the gutter must be placed on an empty square" );
		}
		return true;
	}

	/** Throw if the piece's movement rules disallow the target square. */
	private _assertCanMove( move: Move ): void {
		if ( !move.piece.canMove( move.x, move.y, !!this._occupied( move.x, move.y ) ) ) {
			throw new IllegalMoveException(
				`${move.piece.name} cannot move to (${move.x},${move.y})`
			);
		}
	}

	/** Throw if a rook or bishop would need to jump over another piece. */
	private _assertNoJumping( move: Move ): void {
		if ( move.piece.name === "bishop" ) this._assertBishopPath( move );
		if ( move.piece.name === "rook" ) this._assertRookPath( move );
	}

	private _assertBishopPath( move: Move ): void {
		let x = move.piece.x()!;
		let y = move.piece.y()!;
		const dx = Math.sign( move.x - x );
		const dy = Math.sign( move.y - y );

		x += dx;
		y += dy;

		while ( x !== move.x ) {
			if ( this._occupied( x, y ) ) {
				throw new IllegalMoveException( "Bishops cannot jump over other pieces" );
			}
			x += dx;
			y += dy;
		}
	}

	private _assertRookPath( move: Move ): void {
		const px = move.piece.x()!;
		const py = move.piece.y()!;

		if ( px === move.x ) {
			const [start, end] = [py, move.y].sort( ( a, b ) => a - b );
			for ( let i = start + 1; i < end; i++ ) {
				if ( this._occupied( px, i ) ) {
					throw new IllegalMoveException( "Rooks cannot jump over other pieces" );
				}
			}
		} else {
			const [start, end] = [px, move.x].sort( ( a, b ) => a - b );
			for ( let i = start + 1; i < end; i++ ) {
				if ( this._occupied( i, py ) ) {
					throw new IllegalMoveException( "Rooks cannot jump over other pieces" );
				}
			}
		}
	}

	/** Apply a move, capturing the occupying piece if the square is taken. */
	private _applyMove( move: Move ): void {
		const occupied = this._occupied( move.x, move.y );

		if ( occupied ) {
			if ( occupied.playerNum === move.playerNum ) {
				throw new IllegalMoveException( "You cannot capture your own piece" );
			}
			occupied.piece.reset();
		}

		move.piece.move( move.x, move.y );
	}

	/** Orient the pawn, advance the turn, and check for a win. */
	private _finalizeTurn( move: Move ): void {
		this._orientPawn( move );
		this._endTurn();
		this._checkWin( move );
	}

	/* =========================
	   Helpers
	========================= */

	private _occupied( x: number, y: number ) {
		if ( !Number.isInteger( x ) || !Number.isInteger( y ) )
			throw new TypeError( "Coordinates must be integers" );

		for ( const pNum of [1, 2] as PlayerNum[] ) {
			const player = pNum === 1 ? this.state.p1 : this.state.p2;
			for ( const name of ["pawn", "rook", "bishop", "knight"] as PieceName[] ) {
				const piece = player[name];
				if ( piece.x() === x && piece.y() === y ) {
					return { playerNum: pNum, piece };
				}
			}
		}
		return null;
	}

	private _inGutter( piece: Piece ): boolean {
		if ( !( piece instanceof Piece ) )
			throw new TypeError( "Expected a Piece instance" );
		return piece.x() === null && piece.y() === null;
	}

	private _orientPawn( move: Move ): void {
		if ( !( move.piece instanceof Pawn ) ) return;
		if ( move.piece.y() === 0 ) move.piece.setDirection( "up" );
		if ( move.piece.y() === 3 ) move.piece.setDirection( "down" );
	}

	private _endTurn(): void {
		this.state.turn = this.state.turn === 1 ? 2 : 1;
		this.state.turnCount++;
	}

	private _checkWin( move: Move ): void {
		const pieces = [
			move.player.pawn,
			move.player.rook,
			move.player.bishop,
			move.player.knight
		];

		if ( pieces.some( p => this._inGutter( p ) ) ) return;

		const x0 = pieces[0].x()!;
		const y0 = pieces[0].y()!;

		// Horizontal: all pieces share the same row
		if ( pieces.every( p => p.y() === y0 ) ) return this._declareWinner( move.playerNum );
		// Vertical: all pieces share the same column
		if ( pieces.every( p => p.x() === x0 ) ) return this._declareWinner( move.playerNum );
		// Diagonal (\): all pieces share the same x - y value
		const diag = x0 - y0;
		if ( pieces.every( p => p.x()! - p.y()! === diag ) ) return this._declareWinner( move.playerNum );
		// Anti-diagonal (/): all pieces share the same x + y value
		const anti = x0 + y0;
		if ( pieces.every( p => p.x()! + p.y()! === anti ) ) return this._declareWinner( move.playerNum );
	}

	private _declareWinner( player: PlayerNum ): void {
		this.state.winner = player;
		this._winCallback( this.state );
	}

	private _createPlayer( input: Partial<PlayerState>, reversed: boolean ): PlayerState {
		return {
			name: input.name ?? "",
			pawn: input.pawn ?? new Pawn({ x: null, y: null, reversed }),
			rook: input.rook ?? new Rook({ x: null, y: null }),
			bishop: input.bishop ?? new Bishop({ x: null, y: null }),
			knight: input.knight ?? new Knight({ x: null, y: null })
		};
	}

	private _resetAllPieces(): void {
		for ( const player of [this.state.p1, this.state.p2] ) {
			player.pawn.setResetCoords( null, null );
			player.rook.setResetCoords( null, null );
			player.bishop.setResetCoords( null, null );
			player.knight.setResetCoords( null, null );
		}
	}
}
