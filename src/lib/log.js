module.exports.c = new(require('chalk').Instance)()
module.exports.log = process.env.LOGGING ? console.log : () => {}