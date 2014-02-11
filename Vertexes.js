"use strict";

var sql = require('bookshelfw');

var Vertex = require('./Vertex');

var Vertexes = module.exports = sql.Collection.extend({
  model: Vertex,
});
