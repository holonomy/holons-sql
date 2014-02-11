"use strict";

var sql = require('bookshelfw');

var Edge = require('./Edge');

var Edges = module.exports = sql.Collection.extend({
  model: Edge,
});
