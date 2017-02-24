const path = require('path')
var HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: []
    },
    resolve: {
        extensions: ['.js']
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        compress: true,
        port: 3503
    },
    plugins: [new HtmlWebpackPlugin({title: 'GF Chart', filename: 'index.html', template: './index.html'})]
}
