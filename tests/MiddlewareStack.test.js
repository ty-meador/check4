"use strict";

import {
	MiddlewareStack
} from "../src/MiddlewareStack.js";

test( "MiddlewareStack.use adds a layer to the MiddlewareStack", () => {
	const S = new MiddlewareStack();

	expect( S.stack.length ).toBe( 0 );
	S.use( () => {});
	expect( S.stack.length ).toBe( 1 );
});

test( "Calling next executes next layer in MiddlewareStack", () => {
	const S = new MiddlewareStack();

	let NEXT_LAYER_WAS_CALLED = false;
	S.use( ( data, next ) => {
		next();
	});

	S.use( () => {
		NEXT_LAYER_WAS_CALLED = true;
	});

	S.dispatch();

	expect( NEXT_LAYER_WAS_CALLED ).toBe( true );
});

test( "MiddlewareStack does not proceed to next layer unless next is called", () => {
	const S = new MiddlewareStack();

	let SECOND_STD_HANDLER_WAS_CALLED = false;
	let THIRD_STD_HANDLER_WAS_CALLED = false;

	S.use( ( data, next ) => {
		next();
	});

	// Should be called because next() was explicitly called in previous layer
	S.use( () => {
		SECOND_STD_HANDLER_WAS_CALLED = true;
	});

	// Should not be called because next() was not explicitly called in previous layer
	S.use( () => {
		THIRD_STD_HANDLER_WAS_CALLED = false;
	});

	S.dispatch();

	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( THIRD_STD_HANDLER_WAS_CALLED ).toBe( false );
});


test( "dispatching with data sends data to every layer", () => {
	const S = new MiddlewareStack();
	let data = {
		foo: "bar"
	};

	// Test flags
	let FIRST_STD_HANDLER_WAS_CALLED = false;
	let FIRST_STD_HANDLER_RECEIVED_DATA = false;
	let FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA = false;
	let SECOND_STD_HANDLER_WAS_CALLED = false;
	let SECOND_STD_HANDLER_RECEIVED_DATA = false;
	let SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA = false;
	let THIRD_STD_HANDLER_WAS_CALLED = false;
	let THIRD_STD_HANDLER_RECEIVED_DATA = false;
	let THIRD_STD_HANDLER_RECEIVED_CORRECT_DATA = false;

	S.use( ( data, next ) => {
		FIRST_STD_HANDLER_WAS_CALLED = true;
		if ( data ) {
			FIRST_STD_HANDLER_RECEIVED_DATA = true;
			if ( data.foo === "bar" )
				FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA = true;
		}
		next();
	});

	S.use( ( data, next ) => {
		SECOND_STD_HANDLER_WAS_CALLED = true;
		if ( data ) {
			SECOND_STD_HANDLER_RECEIVED_DATA = true;
			if ( data.foo === "bar" )
				SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA = true;
		}
		next();
	});


	S.use( ( data ) => {
		THIRD_STD_HANDLER_WAS_CALLED = true;
		if ( data ) {
			THIRD_STD_HANDLER_RECEIVED_DATA = true;
			if ( data.foo === "bar" )
				THIRD_STD_HANDLER_RECEIVED_CORRECT_DATA = true;
		}
	});

	S.dispatch( data );
	expect( FIRST_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( FIRST_STD_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_STD_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
	expect( THIRD_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( THIRD_STD_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( THIRD_STD_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
});

test( "calling next on final layer does not throw an error if no final function is passed to dispatch", () => {
	const S = new MiddlewareStack();

	// Test flags
	let FIRST_STD_HANDLER_WAS_CALLED = false;
	let SECOND_STD_HANDLER_WAS_CALLED = false;
	let DISPATCH_THREW = false;

	S.use( ( data, next ) => {
		FIRST_STD_HANDLER_WAS_CALLED = true;
		next();
	});

	S.use( ( data, next ) => {
		SECOND_STD_HANDLER_WAS_CALLED = true;
		next();
	});

	try {
		S.dispatch();
	} catch ( e ) {
		DISPATCH_THREW = true;
	}

	expect( FIRST_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( DISPATCH_THREW ).toBe( false );
});

test( "function passed to dispatch gets called if an error is thrown", () => {
	const S = new MiddlewareStack();
	let DISPATCH_FUNCTION_WAS_CALLED = false;

	S.use( () => {
		throw new Error();
	});

	S.dispatch( null, () => {
		DISPATCH_FUNCTION_WAS_CALLED = true;
	});

	expect( DISPATCH_FUNCTION_WAS_CALLED ).toBe( true );
});

test( "function passed to dispatch gets called if next is called with an error and no other error handlers are present", () => {
	const S = new MiddlewareStack();

	// Test flags
	let DISPATCH_FUNCTION_WAS_CALLED = false;
	let STD_HANDLER_WAS_CALLED = false;
	let DISPATCH_FUNCTION_RECEIVED_ERROR = false;
	let DISPATCH_FUNCTION_RECEIVED_CORRECT_ERROR = false;

	S.use( ( data, next ) => {
		next( new Error( "ERROR_PASS" ) );
	});

	S.use( () => {
		// Should not be called because it's not an error handler
		STD_HANDLER_WAS_CALLED = true;
	});

	S.dispatch( "FOO", err => {
		DISPATCH_FUNCTION_WAS_CALLED = true;
		if ( err ) {
			DISPATCH_FUNCTION_RECEIVED_ERROR = true;
			if ( err.message === "ERROR_PASS" )
				DISPATCH_FUNCTION_RECEIVED_CORRECT_ERROR = true;
		}
	});

	expect( DISPATCH_FUNCTION_WAS_CALLED ).toBe( true );
	expect( STD_HANDLER_WAS_CALLED ).toBe( false );
	expect( DISPATCH_FUNCTION_RECEIVED_ERROR ).toBe( true );
	expect( DISPATCH_FUNCTION_RECEIVED_CORRECT_ERROR ).toBe( true );
});

test( "function passed to dispatch gets called if MiddlewareStack is empty", () => {
	const S = new MiddlewareStack();

	let DISPATCH_FUNCTION_WAS_CALLED = false;

	S.dispatch( null, () => {
		DISPATCH_FUNCTION_WAS_CALLED = true;
	});

	expect( DISPATCH_FUNCTION_WAS_CALLED ).toBe( true );
});

test( "Throwing an error calls next layer that accepts 3 params", () => {
	const S = new MiddlewareStack();

	// Test flags
	let STD_HANDLER_WAS_CALLED = false;
	let ERR_HANDLER_RECEIVED_ERROR = false;
	let ERR_HANDLER_RECEIVED_CORRECT_ERROR = false;
	let ERR_HANDLER_RECEIVED_DATA = false;
	let ERR_HANDLER_RECEIVED_CORRECT_DATA = false;

	S.use( ( data, next ) => {
		next( new Error( "TEST_PASS" ) );
	});

	S.use( ( data, next ) => {
		// Should not be called because it is not an error-handling middleware`1
		STD_HANDLER_WAS_CALLED = true;
	});

	S.use( ( err, data, next ) => {
		if ( err ) {
			ERR_HANDLER_RECEIVED_ERROR = true;
			if ( err.message === "TEST_PASS" )
				ERR_HANDLER_RECEIVED_CORRECT_ERROR = true;
		}

		if ( data ) {
			ERR_HANDLER_RECEIVED_DATA = true;
			if ( data === "DATA_PASS" )
				ERR_HANDLER_RECEIVED_CORRECT_DATA = true;
		}

		next();
	});

	S.dispatch( "DATA_PASS" );
	expect( STD_HANDLER_WAS_CALLED ).toBe( false );
	expect( ERR_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( ERR_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
	expect( ERR_HANDLER_RECEIVED_ERROR ).toBe( true );
	expect( ERR_HANDLER_RECEIVED_CORRECT_ERROR ).toBe( true );
});

test( "Layers with more than two params are skipped if no error is encountered", () => {
	const S = new MiddlewareStack();

	let STD_HANDLER_WAS_CALLED = false;
	let ERR_HANDLER_WAS_CALLED = false;
	S.use( ( data, next ) => {
		next();
	});


	// eslint-disable no-unused-vars
	S.use( ( err, data, next ) => {
		// Skip this error handler
		ERR_HANDLER_WAS_CALLED = true;
	});

	S.use( ( data, next ) => {
		STD_HANDLER_WAS_CALLED = true;
	});

	S.dispatch();
	expect( STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( ERR_HANDLER_WAS_CALLED ).toBe( false );
});

test( "Error handling MiddlewareStack stops if next(error) is not explicitly called", () => {
	const S = new MiddlewareStack();

	// Test flags
	let FIRST_ERR_HANDLER_WAS_CALLED = false;
	let FIRST_ERR_HANDLER_RECEIVED_ERROR = false;
	let FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR = false;
	let SECOND_ERR_HANDLER_WAS_CALLED = false;

	S.use( ( data, next ) => {
		throw new Error( "PASS" );
	});

	S.use( ( err, data, next ) => {
		FIRST_ERR_HANDLER_WAS_CALLED = true;
		if ( err ) {
			FIRST_ERR_HANDLER_RECEIVED_ERROR = true;
			if ( err.message === "PASS" )
				FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR = true;
		}

	});

	S.use( ( err, data, next ) => {
		// Should be skipped because next(err) was not explicitly called
		SECOND_ERR_HANDLER_WAS_CALLED = true;
	});

	S.dispatch();

	expect( FIRST_ERR_HANDLER_WAS_CALLED ).toBe( true );
	expect( FIRST_ERR_HANDLER_RECEIVED_ERROR ).toBe( true );
	expect( FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR ).toBe( true );
	expect( SECOND_ERR_HANDLER_WAS_CALLED ).toBe( false );
});

test( "MiddlewareStack proceeds to next error-handling layer if next(error) is explicitly called", function() {
	const S = new MiddlewareStack();

	// Test flags
	let STD_HANDLER_WAS_CALLED = false;
	let FIRST_ERR_HANDLER_RECEIVED_ERROR = false;
	let FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR = false;
	let SECOND_ERR_HANDLER_RECEIVED_ERROR = false;
	let SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR = false;
	let SECOND_ERR_HANDLER_WAS_CALLED = false;

	S.use( () => {
		throw new Error( "PASS" );
	});

	S.use( ( err, data, next ) => {
		if ( err ) {
			FIRST_ERR_HANDLER_RECEIVED_ERROR = true;
			if ( err.message === "PASS" )
				FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR = true;
		}
		next( err );
	});

	S.use( ( data, next ) => {
		STD_HANDLER_WAS_CALLED = true;
	});

	S.use( ( err, data, next ) => {
		SECOND_ERR_HANDLER_WAS_CALLED = true;
		if ( err ) {
			SECOND_ERR_HANDLER_RECEIVED_ERROR = true;
			if ( err.message === "PASS" )
				SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR = true;
		}
	});

	S.dispatch();
	expect( FIRST_ERR_HANDLER_RECEIVED_ERROR ).toBe( true );
	expect( FIRST_ERR_HANDLER_RECEIVED_CORRECT_ERROR ).toBe( true );
	expect( STD_HANDLER_WAS_CALLED ).toBe( false );
	expect( SECOND_ERR_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_ERR_HANDLER_RECEIVED_ERROR ).toBe( true );
	expect( SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR ).toBe( true );
});


test( "MiddlewareStack properly routes standard and error handling middleware", () => {
	const S = new MiddlewareStack();

	let FIRST_ERR_HANDLER_WAS_CALLED = false;
	let SECOND_ERR_HANDLER_WAS_CALLED = false;
	let SECOND_STD_HANDLER_WAS_CALLED = false;
	let THIRD_STD_HANDLER_WAS_CALLED = false;

	S.use( ( data, next ) => {
		if ( data.throwErr )
			throw new Error( "ERROR_HANDLING_CHECK" );
		else
			next();
	});

	S.use( ( data, next ) => {
		SECOND_STD_HANDLER_WAS_CALLED = true;
		next();
	});

	S.use( ( err, data, next ) => {
		FIRST_ERR_HANDLER_WAS_CALLED = true;
		next( err );
	});

	S.use( ( data, next ) => {
		THIRD_STD_HANDLER_WAS_CALLED = true;
	});

	S.use( ( err, data, next ) => {
		SECOND_ERR_HANDLER_WAS_CALLED = true;
	});

	// This test should only call the STD handlers and not the ERR handlers
	S.dispatch({
		throwErr: false
	});
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( THIRD_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( FIRST_ERR_HANDLER_WAS_CALLED ).toBe( false );
	expect( SECOND_ERR_HANDLER_WAS_CALLED ).toBe( false );

	// RESET for next test!!!
	SECOND_STD_HANDLER_WAS_CALLED = false;
	THIRD_STD_HANDLER_WAS_CALLED = false;

	// This test should only call the ERR handlers, and not the STD handlers
	S.dispatch({
		throwErr: true
	});
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( false );
	expect( THIRD_STD_HANDLER_WAS_CALLED ).toBe( false );
	expect( FIRST_ERR_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_ERR_HANDLER_WAS_CALLED ).toBe( true );
});

test( "Throwing an error inside an error handler calls next error handler with error", () => {
	const S = new MiddlewareStack();

	let SECOND_ERR_HANDLER_WAS_CALLED = false;
	let SECOND_ERR_HANDLER_RECEIVED_ERROR = false;
	let SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR = false;

	S.use( ( data, next ) => {
		throw new Error();
	});

	S.use( ( err, data, next ) => {
		throw new Error( "ERROR_TEST" );
	});

	S.use( ( err, data, next ) => {
		SECOND_ERR_HANDLER_WAS_CALLED = true;
		if ( err ) {
			SECOND_ERR_HANDLER_RECEIVED_ERROR = true;
			if ( err.message === "ERROR_TEST" )
				SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR = true;
		}
	});

	S.dispatch();

	expect( SECOND_ERR_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_ERR_HANDLER_RECEIVED_ERROR ).toBe( true );
	expect( SECOND_ERR_HANDLER_RECEIVED_CORRECT_ERROR ).toBe( true );
});

test( "MiddlewareStack can be used with named functions", () => {
	const S = new MiddlewareStack();

	let FIRST_STD_HANDLER_WAS_CALLED = false;
	let SECOND_STD_HANDLER_WAS_CALLED = false;

	S.use( function normalizeData( data, next ){
		FIRST_STD_HANDLER_WAS_CALLED = true;
		next();
	});

	S.use( function newFunc( data, next ){
		SECOND_STD_HANDLER_WAS_CALLED = true;
	});

	S.dispatch();
	expect( FIRST_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
});

test( "Modified data persists to subsequent layers", () => {
	const S = new MiddlewareStack();

	// Test flags
	let FIRST_STD_HANDLER_WAS_CALLED = false;
	let FIRST_STD_HANDLER_RECEIVED_DATA = false;
	let FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA = false;
	let SECOND_STD_HANDLER_WAS_CALLED = false;
	let SECOND_STD_HANDLER_RECEIVED_DATA = false;
	let SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA = false;

	S.use( ( data, next ) => {
		FIRST_STD_HANDLER_WAS_CALLED = true;
		if( data ){
			FIRST_STD_HANDLER_RECEIVED_DATA = true;
			if( data.foo === "bar" )
				FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA = true;
		}

		data.bar = "baz";
		next();
	});

	S.use( ( data, next ) => {
		SECOND_STD_HANDLER_WAS_CALLED = true;
		if( data ){
			SECOND_STD_HANDLER_RECEIVED_DATA = true;
			if( data.foo === "bar" && data.bar === "baz" )
				SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA = true;
		}
	});

	S.dispatch({
		foo: "bar"
	});

	expect( FIRST_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( FIRST_STD_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( FIRST_STD_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
	expect( SECOND_STD_HANDLER_WAS_CALLED ).toBe( true );
	expect( SECOND_STD_HANDLER_RECEIVED_DATA ).toBe( true );
	expect( SECOND_STD_HANDLER_RECEIVED_CORRECT_DATA ).toBe( true );
});

test( "function passed to dispatch has access to dispatched data", () => {
	const S = new MiddlewareStack();


	let DISPATCH_FUNCTION_WAS_CALLED = false;
	let DISPATCH_FUNCTION_RECEIVED_DATA = false;
	let DISPATCH_FUNCTION_RECEIVED_CORRECT_DATA = false;
	S.use( () => {
		throw new Error();
	});


	S.dispatch({ foo: "bar" }, ( err, data ) => {
		DISPATCH_FUNCTION_WAS_CALLED = true;
		if( data ){
			DISPATCH_FUNCTION_RECEIVED_DATA = true;
			if( data.foo === "bar" )
				DISPATCH_FUNCTION_RECEIVED_CORRECT_DATA = true;
		}
	});

	expect( DISPATCH_FUNCTION_WAS_CALLED ).toBe( true );
	expect( DISPATCH_FUNCTION_RECEIVED_DATA ).toBe( true );
	expect( DISPATCH_FUNCTION_RECEIVED_CORRECT_DATA ).toBe( true );
});

test( "_defaultDone throws the error that is passed to it", () => {
	const S = new MiddlewareStack();
	expect( () => S._defaultDone( new Error( "FOO:BAR" ) ) ).toThrow( "FOO:BAR" );
});
