"use strict";

/*
	Middleware Stack derived from expressjs
*/

export type NextFn = ( err?: unknown ) => void;
export type Handler<T> = ( data: T, next: NextFn ) => void;
export type ErrorHandler<T> = ( err: unknown, data: T, next: NextFn ) => void;
export type LayerFn<T> = Handler<T> | ErrorHandler<T>;

export class MiddlewareStack<T> {
	stack: Layer<T>[];

	constructor() {
		this.stack = [];
	}

	_defaultDone( err?: unknown ): void {
		if ( err ) throw err;
	}

	dispatch( data: T, done: ( err?: unknown, data?: T ) => void = this._defaultDone ): void {
		let idx = 0;
		const stack = this.stack;
		if ( stack.length === 0 ) done();

		next();

		function next( err?: unknown ): void {
			const layer = stack[ idx++ ];
			if ( !layer ) return done( err, data );
			if ( err ) layer.handleError( err, data, next );
			else layer.handleNext( data, next );
		}
	}

	use( fn: LayerFn<T> ): void {
		this.stack.push( new Layer( fn ) );
	}
}

class Layer<T> {
	handle: LayerFn<T>;
	name: string;

	constructor( fn: LayerFn<T> ) {
		this.handle = fn;
		this.name = fn.name || "<anonymous>";
	}

	handleError( err: unknown, data: T, next: NextFn ): void {
		const fn = this.handle;

		// If this layer is not an error-handler, pass error to next layer
		if ( fn.length !== 3 ) return next( err );

		try {
			( fn as ErrorHandler<T> )( err, data, next );
		} catch ( e ) {
			next( e );
		}
	}

	handleNext( data: T, next: NextFn ): void {
		const fn = this.handle;

		// If this layer is not a standard handler, skip this layer
		if ( fn.length > 2 ) return next();

		try {
			( fn as Handler<T> )( data, next );
		} catch ( e ) {
			next( e );
		}
	}
}

export default { "MiddlewareStack": MiddlewareStack };
