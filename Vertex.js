"use strict";

/* code ported from https://github.com/DrTom/digraph-demo/blob/master/app/models/node.rb */

var _ = require('underscore');

var sql = require('bookshelfw');

var Vertex = module.exports = sql.Model.extend({
  tableName: 'vertexes',
  in: function () {
    var Edge = require('./Edge');
    return this.hasMany(Edge, 'targetId');
  },
  out: function () {
    var Edge = require('./Edge');
    return this.hasMany(Edge, 'sourceId');
  },
  parents: function () {
    var Edge = require('./Edge');
    return this.belongsToMany(Vertex).through(Edge, 'targetId', 'sourceId');
  },
  children: function () {
    var Edge = require('./Edge');
    return this.belongsToMany(Vertex).through(Edge, 'sourceId', 'targetId');
  },
  family: function (edgeSearch) {
    var Edge = require('./Edge');
    var Vertexes = require('./Vertexes');

    // search for subsequent edges
    return new Edge()[edgeSearch]([this.id]).then(function (searchEdges) {
      // pluck all vertexes ids connected to edges found
      var familyIds = _.union(_.flatten(_.map(searchEdges.models, function (edge) {
        return [edge.get('sourceId'), edge.get('targetId')];
      }), true));
      // omit this vertex id
      familyIds = _.without(familyIds, this.id);
      // fetch and return vertexes in family
      return new Vertexes().query('whereIn', 'id', familyIds).fetch();
    }.bind(this));
  },
  descendants: function () {
    return this.family('successors');
  },
  ancestors: function () {
    return this.family('predecessors');
  },
  /*toJSON: function () {
    // filter out pivot attributes
    return this.pick(_.filter(this.keys(), function (k) { return !k.match(/^_pivot/); }));
  },*/
});
