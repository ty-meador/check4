"use strict";

/*
	Middleware Stack derived from expressjs
 */

export class MiddlewareStack {
	constructor() {
		this.stack = [];
	}

	_defaultDone( err ) {
		if ( err ) throw err;
	}

	dispatch( data, done = this._defaultDone ) {
		let idx = 0;
		let stack = this.stack;
		if ( stack.length === 0 ) done();

		next();

		function next( err ) {
			let layer = stack[ idx++ ];
			if ( !layer ) return done( err, data );
			if ( err ) layer.handleError( err, data, next );
			else layer.handleNext( data, next );
		}
	}

	use( fn ) {
		this.stack.push( new Layer( fn ) );
	}
}

class Layer {
	constructor( fn ) {
		// if( !this instanceof Layer )
		//  	return new Layer( fn );
		this.handle = fn;
		this.name = fn.name || "<anonymous>";
	}

	handleError( err, data, next ) {
		let fn = this.handle;

		// If this layer is not an error-handler, pass error to next layer
		if ( fn.length !== 3 ) return next( err ); // Stop the chain unless next() is explicitly called by the next layer in the stack

		try {
			fn( err, data, next );
		} catch ( err ) {
			next( err );
		}
	}

	handleNext( data, next ) {
		let fn = this.handle;

		// If this layer is not a standard handler, skip this layer
		if ( fn.length > 2 ) return next(); // Stop the chain unless next() is explicitly called by the next layer in the stack

		try {
			fn( data, next );
		} catch ( err ) {
			next( err );
		}
	}
}
export default { "MiddlewareStack": MiddlewareStack };
