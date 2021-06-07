import { MiddlewareStack } from "./MiddlewareStack";
import { Pawn, Rook, Knight, Bishop, Piece } from "./Pieces.js";

import {
	IllegalMoveException,
	PlayerTurnException,
	GameOverException
} from "./Check4Errors.js";

/**
 * Represents a single instance of a Check4 game in progress
 */
export default class Check4 {
	constructor( props = {}) {
		if ( !props.p1 || !props.p2 )
			throw new Error( "You can't create a game without players!" );

		this._onWin = props._onWin || ( () => {});

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

		// All pieces should reset to (null,null).
		// The coordinates (null,null) represent the gutter
		let p1 = this.state.p1;
		let p2 = this.state.p2;
		p1.pawn.setResetCoords( null, null );
		p1.rook.setResetCoords( null, null );
		p1.bishop.setResetCoords( null, null );
		p1.knight.setResetCoords( null, null );
		p2.pawn.setResetCoords( null, null );
		p2.rook.setResetCoords( null, null );
		p2.bishop.setResetCoords( null, null );
		p2.knight.setResetCoords( null, null );

		// Set up game middleware
		this._ruleStack = new MiddlewareStack();
		this._ruleStack.use( this._normalizeData.bind( this ) );
		this._ruleStack.use( this._isGameOver.bind( this ) );
		this._ruleStack.use( this._isCorrectPlayersTurn.bind( this ) );
		this._ruleStack.use( this._isMovingFromGutter.bind( this ) );
		this._ruleStack.use( this._canMove.bind( this ) );
		this._ruleStack.use( this._isPieceJumping.bind( this ) );
		this._ruleStack.use( this._commitMove.bind( this ) );
		this._ruleStack.use( this._orientPawn.bind( this ) );
		this._ruleStack.use( this._endTurn.bind( this ) );
		this._ruleStack.use( this._checkForWin.bind( this ) );
	}

	/**
   * Sets the on win callback
   * @param function - Any callable
   */
	onWin( fn ) {
		this._onWin = fn;
	}

	/**
   * Attempts to move the specified piece for the specified player
   * to the specified coordinates
   * @param move
   *   @param {(1|2)} move.player - The player making the move
   *   @param {('pawn'|'rook'|'bishop'|'knight')} move.piece - The piece to move
   *   @param {number} move.x - The X coordinate to move the piece to
   *   @param {number} move.y - The Y coordinate to move the piece to
   * @throws {GameException} - Throws one of the derived game exceptions
   */
	takeTurn( move ) {
		this._ruleStack.dispatch( move );
	}

	/**
   * Returns the players state
   * @returns state - The state of the game
   */
	getState() {
		let state = {
			turn: this.state.turn,
			turnCount: this.state.turnCount,
			winner: this.state.winner
		};

		// Only return pieces that are on the board.
		if ( !this._inGutter( this.state.p1.pawn ) ) addPieceToState( 1, "p", this.state.p1.pawn );
		if ( !this._inGutter( this.state.p1.rook ) ) addPieceToState( 1, "r", this.state.p1.rook );
		if ( !this._inGutter( this.state.p1.bishop ) ) addPieceToState( 1, "b", state.p1.b = this.state.p1.bishop );
		if ( !this._inGutter( this.state.p1.knight ) ) addPieceToState( 1, "k", this.state.p1.knight );
		if ( !this._inGutter( this.state.p2.pawn ) ) addPieceToState( 2, "p", this.state.p2.pawn );
		if ( !this._inGutter( this.state.p2.rook ) ) addPieceToState( 2, "r", this.state.p2.rook );
		if ( !this._inGutter( this.state.p2.bishop ) ) addPieceToState( 2, "b", this.state.p2.bishop );
		if ( !this._inGutter( this.state.p2.knight ) ) addPieceToState( 2, "k", this.state.p2.knight );

		return state;

		function addPieceToState( playerNum, pieceName, pieceObj ){
			let key = `p${playerNum}`;
			if( !state[ key ] ) state[ key ] = {};
			state[ key ][ pieceName ] = {
				x: pieceObj.x(),
				y: pieceObj.y()
			};
		}
	}

	/**
   * Once the middleware determines a winner, this function is called with
   * the final data object
   * @private
   * @param data - The data that was dispatched to the middleware
   */
	_declareWinner( data ) {
		this.state.winner = data.playerNum;
		this._onWin( this.state );
	}

	/**
   * Checks the provided coordinates to see if a piece occupies them.
   * @private
   * @param x - The x coodinate to check
   * @param y - The y coodinate to check
   * @returns attackedPiece
   * @returns attackedPiece.playerNum - Which player the piece belongs to
   * @returns attackedPiece.piece - The piece which was attacked
   */
	_occupied( x, y ) {
		x = parseInt( x );
		y = parseInt( y );
		if ( Number.isNaN( x ) || Number.isNaN( y ) ) {
			throw new Error( "_occupied called with NaN parameter" );
		}

		// Both players have the same piece names
		let pieceNames = ["pawn", "rook", "knight", "bishop"];
		let pieceName = null;
		for ( let i = 0; i < pieceNames.length; i++ ) {
			pieceName = pieceNames[i];
			if (
				this.state.p1[pieceName].x() === x &&
        this.state.p1[pieceName].y() === y
			) {
				return {
					playerNum: 1,
					piece: this.state.p1[pieceName]
				};
			}
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
   * @param piece - The piece to check
   * @throws {TypeError} - Throws a TypeError if anything other than an instance of Piece is passed
   * @returns True if piece is in the gutter, false if the piece is on the board
   */
	_inGutter( piece ) {
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
   * @param move
   *   @param {(1|2)} move.player - The player making the move
   *   @param {('pawn'|'rook'|'bishop'|'knight')} move.piece - The piece to move
   *   @param {number} move.x - The X coordinate to move the piece to
   *   @param {number} move.y - The Y coordinate to move the piece to
   * @throws IllegalMoveException - Throws if data.x or data.y are not parseable ints
   */
	_normalizeData( data, next ) {
		if ( !data.player ) throw new TypeError( "No player specified" );
		if ( !data.piece ) throw new TypeError( "No piece specified" );
		data.playerNum = parseInt( data.player );
		data.player = data.playerNum === 1 ? this.state.p1 : this.state.p2;
		data.piece = data.player[data.piece.toLowerCase()];
		data.x = parseInt( data.x );
		data.y = parseInt( data.y );
		if ( Number.isNaN( data.x ) || Number.isNaN( data.y ) )
			throw new IllegalMoveException( "Coordinates must be integers" );
		next();
	}

	/**
   * Ensures that the game isn't over before proceeding
   * @private
   * @throws GameOverException - Throws if the game is already over
   */
	_isGameOver( data, next ) {
		if ( this.state.winner === null ) next();
		else throw new GameOverException( "Game is already over", this.state );
	}

	/**
   * Ensures that the correct player is taking this turn
   * @private
   * @throws PlayerTurnException - Throws if the wrong players tries to take the turn
   */
	_isCorrectPlayersTurn( data, next ) {
		if ( data.playerNum !== this.state.turn )
			next( new PlayerTurnException( "It's not your turn!" ) );
		next();
	}

	/**
   * Implements move-from gutter rules: A piece can move from the gutter to
   * any EMPTY space on the board. As long as the gutter-rules are obeyed,
   * this middleware will skip straight to the _endTurn middleware
   * @private
   * @throws IllegalMoveException - Throws if the destination coordinates are
   * already occupied
   */
	_isMovingFromGutter( data, next ) {
		if ( this._inGutter( data.piece ) ) {
			if ( this._occupied( data.x, data.y ) ) {
				next(
					new IllegalMoveException(
						"Pieces moved from the gutter must be placed on an empty square"
					)
				);
			} else {
				// If the piece is in the gutter and the desintaiton is not
				// _occupied the move is automatically valid. don't call next
				// rule in the stack
				data.piece.move( data.x, data.y );
				if ( data.piece.name === "pawn" ) this._orientPawn( data );
				this._endTurn( data );
			}
		} else {
			next();
		}
	}

	/**
   * Ensures that the requested move is valid for the piece
   * @private
   * @throws IllegalMoveException - Throws if the pieces canMove function returns false
   */
	_canMove( data, next ) {
		if ( data.piece.canMove( data.x, data.y, this._occupied( data.x, data.y ) ) )
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
   * @throws IllegalMoveException - Throws if the piece is a bishop or rook,
   * and tries to jump over another piece
   */
	_isPieceJumping( data, next ) {
		// Pawns can never move more than one space, and Knights are
		// allowed to jump, so we only need to check bishop and rook
		if ( data.piece.name === "bishop" ) {
			let xOffset = data.x - data.piece.x() < 0 ? -1 : 1;
			let yOffset = data.y - data.piece.y() < 0 ? -1 : 1;

			// NOTE: Does not check the old square or the new square, only the square in between them
			let y = data.piece.y() + yOffset;
			let x = data.piece.x() + xOffset;
			while ( y != data.y ) {
				if ( this._occupied( x, y ) )
					next(
						new IllegalMoveException( "Bishops cannot jump over other pieces" )
					);
				y += yOffset;
				x += xOffset;
			}
		} else if ( data.piece.name === "rook" ) {
			// If the x coords didn't change, they moved vertical
			if ( data.piece.x() === data.x ) {
				/*
		         **	Checks each square betwenn oldY and newY to see if it was _occupied by a piece. If it was, the move is invalid
		         **
		         **	NOTE: does not check oldY and newY, just the squares betwen them
		         */
				let lowY = ( data.y > data.piece.y() ? data.piece.y() : data.y ) + 1;
				let highY = data.y > data.piece.y() ? data.y : data.piece.y();

				while ( lowY < highY ) {
					if ( this._occupied( data.x, lowY ) )
						next(
							new IllegalMoveException( "Rooks cannot jump over other pieces" )
						);
					lowY++;
				}
			} else {
				/*
		         **	Checks each square betwenn oldX and newX to see if it was occupide by a piece. If it was, the move is invalid
		         **
		         **	NOTE: does not check oldY and newY, just the squares betwen them
		         */
				let lowX = ( data.x > data.piece.x() ? data.piece.x() : data.x ) + 1;
				let highX = data.x > data.piece.x() ? data.x : data.piece.x();

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
   * Moves the piece. If the destination coordinates are occupied, capture
   * the piece
   * @private
   * @throws IllegalMoveException - Throws if player tries to capture one of
   * their own pieces
   */
	_commitMove( data, next ) {
		let occupied = this._occupied( data.x, data.y );

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
	_orientPawn( data, next ) {
		if ( data.piece.name === "pawn" ) {
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
	_endTurn( data, next ) {
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
	_checkForWin( data ) {
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
		let x = data.player.pawn.x();
		let y = data.player.pawn.y();

		// Horizontal win
		if (
			data.player.bishop.x() === x &&
			data.player.knight.x() === x &&
			data.player.rook.x() === x
		)
			return this._declareWinner( data );

		// Veritcal win
		if (
			data.player.bishop.y() === y &&
			data.player.knight.y() === y &&
			data.player.rook.y() === y
		)
			return this._declareWinner( data );

		// Check for diagonal win by checking to see if the absolute value
		// of the difference in x and y is equal
		let pieces = [
			data.player.pawn,
			data.player.rook,
			data.player.knight,
			data.player.bishop
		];
		for ( let i = 0; i < 4; i++ ) {
			if ( Math.abs( pieces[i].x() - x ) !== Math.abs( pieces[i].y() - y ) ) {
				return;
			}
		}
		// We will only get here if the player got 4 in a row diagonally
		return this._declareWinner( data );
	}
}
