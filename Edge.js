"use strict";

/* code ported from https://github.com/DrTom/digraph-demo/blob/master/app/models/arc.rb */

var Promise = require('bluebird');
var sql = require('bookshelfw');
var createError = require('create-error');
var _ = require('underscore');

var Vertex = require('./Vertex');

var NonDAGError = createError('NonDAGError');

var Edge = module.exports = sql.Model.extend({
  tableName: 'edges',
  initialize: function () {
    this.on('saving', this.preventBackLoop, this);
    this.on('saving', this.preventCycle, this);
    this.on('saving', this.preventMultiEdge, this);
    this.on('saving', this.preventSelfLoop, this);
  },
  source: function () {
    return this.belongsTo(Vertex, 'sourceId');
  },
  target: function () {
    return this.belongsTo(Vertex, 'targetId');
  },
  step: function (to, from, edgeIds) {
    // return edges that are a step away in the graph.
    //
    // in other words, return all edges where :to
    // is in edgeIds (which defaults to this.get(:from)).
    edgeIds = edgeIds || [this.get(from)];
    var Edges = require('./Edges');
    return new Edges().query('whereIn', to, edgeIds);
  },
  previous: function (edgeIds) {
    // return edges that are a step before this edge in the graph.
    //
    // in other words, return all edges where 'targetId'
    // is in this.get('sourceId') (or edgeIds if specified).
    return this.step('targetId', 'sourceId', edgeIds);
  },
  next: function (edgeIds) {
    // return edges that are a step after this edge in the graph.
    //
    // in other words, return all edges where 'sourceId'
    // is in this.get('targetId') (or edgeIds if specified).
    return this.step('sourceId', 'targetId', edgeIds);
  },
  search: function (to, from, startIds) {
    // return edges that are connected either
    // before or after this edge in the graph.
    //
    // in other words,
    // returns all edges where :to is in startIds
    // (defaults to this.get(:from)), recursively.
    var searchStep = function (soFarIds, prevIds) {
      prevIds = prevIds || soFarIds;
      return this.step(to, from, prevIds).fetch().then(function (nextEdges) {
        // get from ids from next edges
        var nextIds = _.pluck(nextEdges.toJSON(), from)
        // remove any we have already seen
        nextIds = _.difference(nextIds, soFarIds);
        // join all the ids we have seen together
        soFarIds = _.union(soFarIds, prevIds, nextIds);
        // if we didn't see anything new
        if (nextIds.length === 0) {
          // return all edges found
          return this.step(to, from, soFarIds).fetch();
        } else {
          // query for more edges
          return searchStep(soFarIds, nextIds);
        }
      }.bind(this));
    }.bind(this);
    return searchStep(startIds || [this.get(from)]);
  },
  predecessors: function (startIds) {
    // return edges that are before this edge in the graph.
    //
    // in other words, return all edges where
    // :targetId is in this.get(:sourceId), recursively.
    return this.search('targetId', 'sourceId', startIds);
  },
  successors: function (startIds) {
    // return edges that are after this edge in the graph.
    //
    // in other words, return all edges where
    // :sourceId is in this.get(:targetId), recursively.
    return this.search('sourceId', 'targetId', startIds);
  },
  preventBackLoop: function () {
    var Edges = require('./Edges');
    return new Edges()
    .query('where', 'targetId', this.get('sourceId'))
    .query('andWhere', 'sourceId', this.get('targetId'))
    .fetch()
    .then(function (result) {
      if (result.length !== 0) {
        return Promise.reject(new Edge.Err.BackLoopError);
      }
    });
  },
  preventCycle: function () {
    var Vertex = require('./Vertex');
    var sourceId = this.get('sourceId');
    // get all descendants of target vertex
    return new Vertex({ id: this.get('targetId') }).descendants()
    .then(function (descendants) {
      var descendantIds = _.pluck(descendants.models, 'id');
      // if descendants include source vertex
      if (_.indexOf(descendantIds, sourceId) !== -1) {
        // reject with error
        return Promise.reject(new Edge.Err.CycleError);
      }
    });
  },
  preventMultiEdge: function () {
    var Edges = require('./Edges');
    return new Edges()
    .query('where', 'targetId', this.get('targetId'))
    .query('andWhere', 'sourceId', this.get('sourceId'))
    .fetch()
    .then(function (result) {
      if (result.length !== 0) {
        return Promise.reject(new Edge.Err.MultiEdgeError);
      }
    });
  },
  preventSelfLoop: function () {
    if (this.get('targetId') === this.get('sourceId')) {
      return Promise.reject(new Edge.Err.SelfLoopError);
    }
  },
}, {
  Err: {
    NonDAGError: NonDAGError,
    BackLoopError: createError(NonDAGError, "BackLoopError", {
      message: "back loops are not allowed.",
    }),
    CycleError: createError(NonDAGError, "CycleError", {
      message: "cycles are not allowed.",
    }),
    MultiEdgeError: createError(NonDAGError, "MultiEdgeError", {
      message: "multi-edges are not allowed.",
    }),
    SelfLoopError: createError(NonDAGError, "SelfLoopError", {
      message: "self loops are not allowed.",
    }),
  },
});
