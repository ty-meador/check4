const path = require("path");
const ClosurePlugin = require("closure-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, "src/Check4.js"),
  output: {
    filename: "check4_compiled.js",
    path: path.resolve(__dirname, "dist")
  },
  optimization: {
    minimizer: [
      new ClosurePlugin(
        { mode: "STANDARD" },
        {
          /*Compiler flags here*/
        }
      )
    ]
  }
};
