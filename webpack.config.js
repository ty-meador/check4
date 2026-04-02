const path = require( "path" );

const expressJSConfig = {
	mode: "production",
	entry: "./src/Check4.ts",
	resolve: {
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	output: {
		filename: "Check4.express.js",
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
	entry: "./src/Check4.ts",
	resolve: {
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
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

module.exports = [ expressJSConfig, webConfig ];
