const path = require( "path" );

const nodeConfig = {
	entry: "./src/Check4.js",
	output: {
		filename: "Check4.node.js",
		path: path.resolve( __dirname, "dist" ),
		globalObject: "this",
		library: {
			type: "commonjs2",
			export: "default"
		}
	}
};

const webConfig = {
	entry: "/src/Check4.js",
	output: {
		filename: "Check4.web.js",
		path: path.resolve( __dirname, "dist" ),
		globalObject: "this",
		library: {
			name: "Check4",
			type: "window"
		}
	}
};

module.exports = [ nodeConfig, webConfig ];
