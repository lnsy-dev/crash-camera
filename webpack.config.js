const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
const file_name = process.env.OUTPUT_FILENAME || 'e-y-e.min.js';

module.exports = {
  entry: ['./index.js','./index.css'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: file_name
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/i,
        use:['style-loader','css-loader']
     }
    ]
  },
};

