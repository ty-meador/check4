import { MiddlewareStack, NextFn } from "./MiddlewareStack";
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

// Shape of move data as it flows through the middleware stack (post-normalization)
export interface MoveData {
	player: PlayerState;
	playerNum: PlayerNum;
	piece: Piece;
	x: number;
	y: number;
}

export interface PieceCoords {
	x: number | null;
	y: number | null;
}

export interface PlayerStateInput {
	pawn?: PieceCoords;
	rook?: PieceCoords;
	bishop?: PieceCoords;
	knight?: PieceCoords;
}

export interface GameStateInput {
	turn: PlayerNum;
	turnCount: number;
	winner: PlayerNum | null;
	p1?: PlayerStateInput;
	p2?: PlayerStateInput;
}

export interface PieceSnapshot {
	x: number | null | undefined;
	y: number | null | undefined;
}

export interface PlayerSnapshot {
	pawn: PieceSnapshot;
	rook: PieceSnapshot;
	bishop: PieceSnapshot;
	knight: PieceSnapshot;
}

export interface GameSnapshot {
	turn: PlayerNum;
	turnCount: number;
	winner: PlayerNum | null;
	p1: PlayerSnapshot;
	p2: PlayerSnapshot;
}

interface Check4Props {
	p1: { name?: string; pawn?: Pawn; rook?: Rook; bishop?: Bishop; knight?: Knight };
	p2: { name?: string; pawn?: Pawn; rook?: Rook; bishop?: Bishop; knight?: Knight };
	_onWin?: ( state: GameState ) => void;
}

interface OccupiedResult {
	playerNum: PlayerNum;
	piece: Piece;
}

/**
 * Represents a single instance of a Check4 game in progress
 */
export default class Check4 {
	state: GameState;
	dryRun: boolean;

	private _onWin: ( state: GameState ) => void;
	private _ruleStack: MiddlewareStack<MoveData>;
	private _validationStack: MiddlewareStack<MoveData>;

	constructor( props: Check4Props = {} as Check4Props ) {
		if ( !props.p1 || !props.p2 )
			throw new Error( "You can't create a game without players!" );

		this._onWin = props._onWin || ( () => { });
		this.dryRun = false;

		// Initial game state
		this.state = {
			turn: 1,
			turnCount: 0,
			winner: null,
			p1: {
				name: props.p1.name || "",
				pawn:
					props.p1.pawn ||
					new Pawn({
						x: null,
						y: null
					}),
				rook:
					props.p1.rook ||
					new Rook({
						x: null,
						y: null
					}),
				bishop:
					props.p1.bishop ||
					new Bishop({
						x: null,
						y: null
					}),
				knight:
					props.p1.knight ||
					new Knight({
						x: null,
						y: null
					})
			},
			p2: {
				name: props.p2.name || "",
				pawn:
					props.p2.pawn ||
					new Pawn({
						reversed: true,
						x: null,
						y: null
					}),
				rook:
					props.p2.rook ||
					new Rook({
						x: null,
						y: null
					}),
				bishop:
					props.p2.bishop ||
					new Bishop({
						x: null,
						y: null
					}),
				knight:
					props.p2.knight ||
					new Knight({
						x: null,
						y: null
					})
			}
		};

		// All pieces should reset to (null, null).
		// The coordinates (null, null) represent the gutter
		const p1 = this.state.p1;
		const p2 = this.state.p2;
		p1.pawn.setResetCoords( null, null );
		p1.rook.setResetCoords( null, null );
		p1.bishop.setResetCoords( null, null );
		p1.knight.setResetCoords( null, null );
		p2.pawn.setResetCoords( null, null );
		p2.rook.setResetCoords( null, null );
		p2.bishop.setResetCoords( null, null );
		p2.knight.setResetCoords( null, null );

		// Bind correct context
		this._normalizeData = this._normalizeData.bind( this );
		this._isGameOver = this._isGameOver.bind( this );
		this._isCorrectPlayersTurn = this._isCorrectPlayersTurn.bind( this );
		this._isMovingFromGutter = this._isMovingFromGutter.bind( this );
		this._canMove = this._canMove.bind( this );
		this._isPieceJumping = this._isPieceJumping.bind( this );
		this._commitMove = this._commitMove.bind( this );
		this._orientPawn = this._orientPawn.bind( this );
		this._endTurn = this._endTurn.bind( this );
		this._checkForWin = this._checkForWin.bind( this );
		this.moveIsValid = this.moveIsValid.bind( this );

		// Set up game middleware
		this._ruleStack = new MiddlewareStack<MoveData>();
		this._ruleStack.use( this._normalizeData );
		this._ruleStack.use( this._isGameOver );
		this._ruleStack.use( this._isCorrectPlayersTurn );
		this._ruleStack.use( this._isMovingFromGutter );
		this._ruleStack.use( this._canMove );
		this._ruleStack.use( this._isPieceJumping );
		this._ruleStack.use( this._commitMove );
		this._ruleStack.use( this._orientPawn );
		this._ruleStack.use( this._endTurn );
		this._ruleStack.use( this._checkForWin );

		// Middleware used for validating a move
		this._validationStack = new MiddlewareStack<MoveData>();
		this._validationStack.use( this._normalizeData );
		this._validationStack.use( this._isGameOver );
		this._validationStack.use( this._isCorrectPlayersTurn );
		this._validationStack.use( this._isMovingFromGutter );
		this._validationStack.use( this._canMove );
		this._validationStack.use( this._isPieceJumping );
	}

	/**
	 * Sets the on win callback
	 */
	onWin( fn: ( state: GameState ) => void ): void {
		this._onWin = fn;
	}

	/**
	 * Attempts to move the specified piece for the specified player
	 * to the specified coordinates
	 * @throws {GameException} - Throws one of the derived game exceptions
	 */
	takeTurn( move: MoveInput ): void {
		// Cast is intentional: _normalizeData transforms the raw input into MoveData
		this._ruleStack.dispatch( move as unknown as MoveData );
	}

	/**
	 * Determines whether the given move is against the rules or not
	 * @throws {GameException} - Throws one of the derived game exceptions
	 */
	moveIsValid( move: MoveInput ): boolean {
		let isValid = true;
		this.dryRun = true;

		try {
			this._validationStack.dispatch( move as unknown as MoveData );
		} catch ( e ) {
			isValid = false;
		}

		this.dryRun = false;
		return isValid;
	}

	/**
	 * Forfeits the game for whichever player is passed to the function. If
	 * no player is passed, the player whose turn it currently is forfeits
	 */
	forfeit( playerNum: PlayerNum | null = null ): void {
		let winner: PlayerNum;

		if ( playerNum === 1 )
			winner = 2;
		else if ( playerNum === 2 )
			winner = 1;
		else {
			winner = this.state.turn === 1 ? 2 : 1;
		}

		this._declareWinner({ playerNum: winner });
	}

	/**
	 * Manually updates the game state irrespective of the game rule stack.
	 */
	setState( state: GameStateInput ): void {
		if ( state.turn !== 1 && state.turn !== 2 )
			throw new GameException( "GameState.turn must be 1 or 2" );
		if ( typeof state.turnCount !== "number" || state.turnCount < 0 )
			throw new GameException( "GameState.turnCount must be a positive number" );
		if ( state.winner !== null && state.winner !== 1 && state.winner !== 2 )
			throw new GameException( "GameState.winner must be one of null, 1, or 2" );

		try {
			if ( state.p1 ) {
				const p1 = state.p1;
				p1.pawn = p1.pawn || { x: null, y: null };
				p1.rook = p1.rook || { x: null, y: null };
				p1.knight = p1.knight || { x: null, y: null };
				p1.bishop = p1.bishop || { x: null, y: null };
				this.state.p1.pawn.move( p1.pawn.x, p1.pawn.y );
				this.state.p1.rook.move( p1.rook.x, p1.rook.y );
				this.state.p1.knight.move( p1.knight.x, p1.knight.y );
				this.state.p1.bishop.move( p1.bishop.x, p1.bishop.y );
			}

			if ( state.p2 ) {
				const p2 = state.p2;
				p2.pawn = p2.pawn || { x: null, y: null };
				p2.rook = p2.rook || { x: null, y: null };
				p2.knight = p2.knight || { x: null, y: null };
				p2.bishop = p2.bishop || { x: null, y: null };
				this.state.p2.pawn.move( p2.pawn.x, p2.pawn.y );
				this.state.p2.rook.move( p2.rook.x, p2.rook.y );
				this.state.p2.knight.move( p2.knight.x, p2.knight.y );
				this.state.p2.bishop.move( p2.bishop.x, p2.bishop.y );
			}

			this.state.turn = state.turn;
			this.state.turnCount = state.turnCount;

			if ( state.winner !== null )
				this._declareWinner({ playerNum: state.winner });
		} catch ( e ) {
			throw new GameException( "Malformed state" );
		}
	}

	/**
	 * Returns the game state
	 */
	getState(): GameSnapshot {
		const state: GameSnapshot = {
			turn: this.state.turn,
			turnCount: this.state.turnCount,
			winner: this.state.winner,
			p1: {} as PlayerSnapshot,
			p2: {} as PlayerSnapshot
		};

		addPieceToState( 1, "pawn", this.state.p1.pawn );
		addPieceToState( 1, "rook", this.state.p1.rook );
		addPieceToState( 1, "bishop", this.state.p1.bishop );
		addPieceToState( 1, "knight", this.state.p1.knight );
		addPieceToState( 2, "pawn", this.state.p2.pawn );
		addPieceToState( 2, "rook", this.state.p2.rook );
		addPieceToState( 2, "bishop", this.state.p2.bishop );
		addPieceToState( 2, "knight", this.state.p2.knight );

		return state;

		function addPieceToState( playerNum: PlayerNum, pieceName: PieceName, pieceObj: Piece ): void {
			const key = `p${playerNum}` as "p1" | "p2";
			state[key][pieceName] = {
				x: pieceObj.x(),
				y: pieceObj.y()
			};
		}
	}

	/**
	 * Once the middleware determines a winner, this function is called with
	 * the final data object
	 * @private
	 */
	_declareWinner( data: { playerNum: PlayerNum } ): void {
		this.state.winner = data.playerNum;
		this._onWin( this.state );
	}

	/**
	 * Checks the provided coordinates to see if a piece occupies them.
	 * @private
	 * @returns The occupied result, or false if the square is empty
	 */
	_occupied( x: number, y: number ): OccupiedResult | false {
		x = parseInt( String( x ) );
		y = parseInt( String( y ) );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) {
			throw new Error( "_occupied called with NaN parameter" );
		}

		const pieceNames: PieceName[] = ["pawn", "rook", "knight", "bishop"];
		for ( let i = 0; i < pieceNames.length; i++ ) {
			const pieceName = pieceNames[i];
			if (
				this.state.p1[pieceName].x() === x &&
				this.state.p1[pieceName].y() === y
			)
				return {
					playerNum: 1,
					piece: this.state.p1[pieceName]
				};
			if (
				this.state.p2[pieceName].x() === x &&
				this.state.p2[pieceName].y() === y
			)
				return {
					playerNum: 2,
					piece: this.state.p2[pieceName]
				};
		}
		return false;
	}

	/**
	 * Checks to see if the provided piece is on the board or not
	 * @private
	 * @returns True if piece is in the gutter, false if the piece is on the board
	 */
	_inGutter( piece: Piece ): boolean {
		if ( !( piece instanceof Piece ) )
			throw new TypeError( "_inGutter called with non-piece parameter" );
		return piece.x() === null && piece.y() === null;
	}

	/*********************** Rule Middleware Stack****************************
	 * Purpose:	Each function represents a single "rule" in the game         *
	 *                                                                       *
	 * NOTES:	Each rule is in the order that it is executed in the         *
	 *    Middleware Stack. Anytime next() is called, the game moves on to   *
	 *    the next function. Each function represents a single atomic "rule" *
	 *    of the game                                                        *
	 *************************************************************************/

	/**
	 * Ensures that the data dispatched to the middleware is in a consistent format
	 * @private
	 * @throws IllegalMoveException - Throws if data.x or data.y are not parseable ints
	 */
	_normalizeData( data: MoveData, next: NextFn ): void {
		const MIN = 0, MAX = 3;
		const knownPieces: PieceName[] = ["pawn", "rook", "bishop", "knight"];
		// raw cast: input arrives as MoveInput but the stack types it as MoveData
		const raw = data as unknown as { player: number; piece: string; x: number; y: number };
		if ( !raw.player ) throw new TypeError( "No player specified" );
		if ( !raw.piece ) throw new TypeError( "No piece specified" );
		if ( !knownPieces.includes( raw.piece as PieceName ) ) throw new TypeError( `Unknown piece ${raw.piece} specified` );
		data.playerNum = parseInt( String( raw.player ) ) as PlayerNum;
		data.player = data.playerNum === 1 ? this.state.p1 : this.state.p2;
		data.piece = data.player[raw.piece.toLowerCase() as PieceName];
		data.x = parseInt( String( raw.x ) );
		data.y = parseInt( String( raw.y ) );
		if ( Number.isNaN( data.x ) || Number.isNaN( data.y ) )
			throw new IllegalMoveException( "Coordinates must be integers" );
		if (
			data.x < MIN
			|| data.y < MIN
			|| data.x > MAX
			|| data.y > MAX
		)
			throw new IllegalMoveException( "You requested to move to non-sane coodinates" );
		next();
	}

	/**
	 * Ensures that the game isn't over before proceeding
	 * @private
	 * @throws GameOverException - Throws if the game is already over
	 */
	_isGameOver( data: MoveData, next: NextFn ): void {
		if ( this.state.winner === null ) next();
		else throw new GameOverException( "Game is already over", this.state );
	}

	/**
	 * Ensures that the correct player is taking this turn
	 * @private
	 * @throws PlayerTurnException - Throws if the wrong player tries to take the turn
	 */
	_isCorrectPlayersTurn( data: MoveData, next: NextFn ): void {
		if ( data.playerNum !== this.state.turn )
			next( new PlayerTurnException( "It's not your turn!" ) );
		next();
	}

	/**
	 * Implements move-from-gutter rules: A piece can move from the gutter to
	 * any EMPTY space on the board. As long as the gutter-rules are obeyed,
	 * this middleware will skip straight to the _endTurn middleware
	 * @private
	 * @throws IllegalMoveException - Throws if the destination coordinates are already occupied
	 */
	_isMovingFromGutter( data: MoveData, next: NextFn ): void {
		// Piece is not moving from gutter
		if ( !this._inGutter( data.piece ) ) {
			next();
			return;
		}

		// Piece is moving from the gutter, but the destination is already occupied
		if ( this._occupied( data.x, data.y ) ) {
			next(
				new IllegalMoveException(
					"Pieces moved from the gutter must be placed on an empty square"
				)
			);
			return;
		}

		// If the piece is in the gutter and the destination is not occupied
		// the move is automatically valid. don't call next rule in the stack
		if ( !this.dryRun ) {
			data.piece.move( data.x, data.y );
			if ( data.piece instanceof Pawn ) this._orientPawn( data );
			this._endTurn( data );
		}
	}

	/**
	 * Ensures that the requested move is valid for the piece
	 * @private
	 * @throws IllegalMoveException - Throws if the piece's canMove function returns false
	 */
	_canMove( data: MoveData, next: NextFn ): void {
		if ( data.piece.canMove( data.x, data.y, !!this._occupied( data.x, data.y ) ) )
			next();
		else
			next(
				new IllegalMoveException(
					`${data.piece.name} cannot move to (${data.x},${data.y})`
				)
			);
	}

	/**
	 * Ensures that bishops and rooks do not jump over other pieces
	 * @private
	 * @throws IllegalMoveException - Throws if the piece is a bishop or rook and tries to jump
	 */
	_isPieceJumping( data: MoveData, next: NextFn ): void {
		if ( data.piece.name === "bishop" ) {
			const pieceX = data.piece.x() as number;
			const pieceY = data.piece.y() as number;
			const xOffset = data.x - pieceX < 0 ? -1 : 1;
			const yOffset = data.y - pieceY < 0 ? -1 : 1;

			// NOTE: Does not check the old square or the new square, only the squares in between
			let y = pieceY + yOffset;
			let x = pieceX + xOffset;
			while ( y !== data.y ) {
				if ( this._occupied( x, y ) )
					next(
						new IllegalMoveException( "Bishops cannot jump over other pieces" )
					);
				y += yOffset;
				x += xOffset;
			}
		} else if ( data.piece.name === "rook" ) {
			const pieceX = data.piece.x() as number;
			const pieceY = data.piece.y() as number;

			// If the x coords didn't change, they moved vertically
			if ( pieceX === data.x ) {
				let lowY = ( data.y > pieceY ? pieceY : data.y ) + 1;
				const highY = data.y > pieceY ? data.y : pieceY;

				while ( lowY < highY ) {
					if ( this._occupied( data.x, lowY ) )
						next(
							new IllegalMoveException( "Rooks cannot jump over other pieces" )
						);
					lowY++;
				}
			} else {
				let lowX = ( data.x > pieceX ? pieceX : data.x ) + 1;
				const highX = data.x > pieceX ? data.x : pieceX;

				while ( lowX < highX ) {
					if ( this._occupied( lowX, data.y ) )
						next(
							new IllegalMoveException( "Rooks cannot jump over other pieces" )
						);
					lowX++;
				}
			}
		}

		// If we make it here no movement errors were encountered
		next();
	}

	/**
	 * Moves the piece. If the destination coordinates are occupied, capture the piece
	 * @private
	 * @throws IllegalMoveException - Throws if player tries to capture one of their own pieces
	 */
	_commitMove( data: MoveData, next: NextFn ): void {
		const occupied = this._occupied( data.x, data.y );

		if ( occupied ) {
			if ( occupied.playerNum === data.playerNum ) {
				next( new IllegalMoveException( "You cannot capture your own piece" ) );
			} else {
				occupied.piece.reset();
			}
		}

		data.piece.move( data.x, data.y );
		next();
	}

	/**
	 * Ensures that the pawn is facing the right direction
	 * @private
	 */
	_orientPawn( data: MoveData, next?: NextFn ): void {
		if ( data.piece instanceof Pawn ) {
			if ( data.piece.y() === 0 ) data.piece.setDirection( "up" );
			else if ( data.piece.y() === 3 ) data.piece.setDirection( "down" );
		}

		// _orientPawn can be called outside of the middleware stack.
		// in such a case, next will be undefined
		if ( next ) next();
	}

	/**
	 * Takes care of end-of-turn chores
	 * @private
	 */
	_endTurn( data: MoveData, next?: NextFn ): void {
		this.state.turn = this.state.turn === 1 ? 2 : 1;
		this.state.turnCount++;
		// If a piece is moved from the gutter, it skips straight to this
		// middleware, in such a case, next won't be defined
		if ( next ) next();
		else this._checkForWin( data );
	}

	/**
	 * Checks to see if the player that just moved has made a winning move.
	 * @private
	 */
	_checkForWin( data: MoveData ): void {
		// If any piece is in the gutter, the player hasn't won
		if (
			this._inGutter( data.player.pawn ) ||
			this._inGutter( data.player.rook ) ||
			this._inGutter( data.player.bishop ) ||
			this._inGutter( data.player.knight )
		) {
			return;
		}
		// We could use any piece here, since we are checking to see if every
		// piece has the same x (Horizontal Win) or same y (Vertical Win)
		const x = data.player.pawn.x() as number;
		const y = data.player.pawn.y() as number;

		// Horizontal win
		if (
			data.player.bishop.x() === x &&
			data.player.knight.x() === x &&
			data.player.rook.x() === x
		)
			return this._declareWinner( data );

		// Vertical win
		if (
			data.player.bishop.y() === y &&
			data.player.knight.y() === y &&
			data.player.rook.y() === y
		)
			return this._declareWinner( data );

		// Check for diagonal win by checking to see if the absolute value
		// of the difference in x and y is equal
		const pieces = [
			data.player.pawn,
			data.player.rook,
			data.player.knight,
			data.player.bishop
		];
		for ( let i = 0; i < 4; i++ ) {
			if ( Math.abs( ( pieces[i].x() as number ) - x ) !== Math.abs( ( pieces[i].y() as number ) - y ) ) {
				return;
			}
		}
		// We will only get here if the player got 4 in a row diagonally
		return this._declareWinner( data );
	}
}
