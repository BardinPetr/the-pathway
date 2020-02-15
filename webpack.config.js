const HtmlWebpackPlugin = require('html-webpack-plugin')

const path = require('path')

const rendererConfig = {
  devtool: 'source-map',
  mode: 'development',
  target: 'electron-renderer',
  entry: {
    renderer: './src/front/renderer.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/front/index.html',
      title: 'Map'
    })
  ],
  module: {
    rules: [{
      test: /\.(js|jsx)$/i,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: ['@babel/preset-env']
        }
      }
    },
  {
    test: /\.css$/,
    use: [{
      loader: 'style-loader'
    }, {
      loader: 'css-loader'
    }],
  }]
  }
}

module.exports = [rendererConfig]
