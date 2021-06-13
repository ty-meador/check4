const path = require( "path" );

const nodeConfig = {
	mode: "production",
	entry: "./src/Check4.js",
	output: {
		filename: "Check4.node.js",
		globalObject: "this",
		path: path.resolve( __dirname, "dist" ),
		library: {
			type: "commonjs2",
			export: "default"
		}
	}
};

const webConfig = {
	mode: "production",
	entry: "/src/Check4.js",
	output: {
		filename: "Check4.web.js",
		globalObject: "this",
		path: path.resolve( __dirname, "dist" ),
		library: {
			name: "Check4",
			type: "umd"
		}
	}
};

module.exports = [ nodeConfig, webConfig ];
