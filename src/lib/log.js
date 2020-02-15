require('dotenv').config()
module.exports.c = require('chalk')
module.exports.log = process.env.LOGGING ? console.log : () => {}