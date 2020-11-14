"use strict";

import {
	Pawn,
	Bishop,
	Rook,
	Knight
} from "./Pieces.js";

export default class Player {
	constructor( props ) {
		this.name = props.name;
		this.Pawn = new Pawn();
		this.Bishiop = new Bishop();
		this.Rook = new Rook();
		this.Knight = new Knight();
	}
}
