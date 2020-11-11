"use strict";
import Debug from "debug";
const debugLogger = Debug( "HttpError" );

export class HttpError extends Error {
	constructor( msg, debug ) {
		super( "HTTP_ERROR" );
		this.name = this.constructor.name;
		this.message = msg;
		this.stack = new Error().stack;

		switch ( msg.toUpperCase() ) {
			case "BAD_REQUEST":
				this.code = 400;
				this.description = "Malformed request";
				break;

			case "NOT_AUTHORIZED":
				this.code = 401;
				this.description = "You are not authorized to request this resource";
				break;

			case "NOT_FOUND":
				this.code = 404;
				this.description = "Resource not found";
				break;

			case "CONFLICT":
				this.code = 409;
				this.description = "Resource already exists";
				break;

			case "UNSUPPORTED_MEDIA_TYPE":
				this.code = 415;
				this.description = "This file type is not currently supported";
				break;

			case "NOT_IMPLEMENTED":
				this.code = 501;
				this.description =
					"The server does not support the functionality required to fulfill the request.";
				break;

			case "INTERNAL_ERROR":
			default:
				this.code = 500;
				this.description = "An unkown error has occured";
				break;
		}

		if ( debug ) debugLogger( debug );

		this.payload = {
			status: msg,
			description: this.description
		};
	}
}

export default { HttpError };
