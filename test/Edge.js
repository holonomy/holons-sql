"use strict";

require("mocha-as-promised")();
var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var Promise = require('bluebird');

var Edge = require('../Edge');
var Edges = require('../Edges');
var Vertex = require('../Vertex');

describe("Edge", function () {
  var self = this;
  
  before(function () {
    return Promise.all([
      // burn some Vertex's to offset the ids
      // between Vertex and Edge
      new Vertex().save().call('destroy'),
      new Vertex().save().call('destroy'),
      new Vertex().save().call('destroy'),
      new Vertex().save().call('destroy'),
      // end burn
      new Vertex().save(),
      new Vertex().save(),
      new Vertex().save(),
      new Vertex().save(),
      new Vertex().save(),
    ]).spread(function (a, b, c, d, n1, n2, n3, n4, n5) {
      self.n1 = n1;
      self.n2 = n2;
      self.n3 = n3;
      self.n4 = n4;
      self.n5 = n5;
    });
  });

  it("#save#destroy", function () {
    // create a new edge and save
    return new Edge({ sourceId: self.n1.id, targetId: self.n2.id })
    .save()
    .call('load', ['source', 'target'])
    .then(function (edge) {
      // check that new edge is as expected
      expect(edge).to.exist;
      expect(edge.related('source').id).to.equal(self.n1.id);
      expect(edge.toJSON()).to.have.deep.property('source.id', self.n1.id);
      expect(edge.related('target').id).to.equal(self.n2.id);
      expect(edge.toJSON()).to.have.deep.property('target.id', self.n2.id);

      // query for the edge
      return new Edges()
      .query('where', 'sourceId', '=', self.n1.id)
      .query('andWhere', 'targetId', '=', self.n2.id)
      .fetch();

    }).then(function (edges) {
      // check that edge returned from query is as expected
      expect(edges.models[0].get('sourceId')).to.equal(self.n1.id);
      expect(edges.models[0].get('targetId')).to.equal(self.n2.id);

      // destroy the edge
      return edges.models[0].destroy();

    }).then(function (edge) {
      // query for the edge again
      return new Edges()
      .query('where', 'sourceId', '=', self.n1.id)
      .query('andWhere', 'targetId', '=', self.n2.id)
      .fetch()

    }).then(function (edges) {
      // check that result from query is as expected
      expect(edges.models).to.be.empty;
    });
  });


  it("#save multiple", function () {
    return Promise.all([
      new Edge({ sourceId: self.n1.id, targetId: self.n2.id }).save(),
      new Edge({ sourceId: self.n2.id, targetId: self.n3.id }).save(),
      new Edge({ sourceId: self.n3.id, targetId: self.n4.id }).save(),
      new Edge({ sourceId: self.n2.id, targetId: self.n5.id }).save(),
      new Edge({ sourceId: self.n1.id, targetId: self.n4.id }).save(),
    ]).spread(function (a12, a23, a34, a25, a14) {
      self.a12 = a12;
      self.a23 = a23;
      self.a34 = a34;
      self.a25 = a25;
      self.a14 = a14;

      expect(a12).to.exist;
      expect(a23).to.exist;
      expect(a34).to.exist;
      expect(a25).to.exist;
      expect(a14).to.exist;
    });
  });

  describe("relations", function () {

    describe("#successors", function () {

      it("the successors of a12 should be [a23, a34, a25]", function () {
        return self.a12.successors().then(function (edges) {
          // TODO to.have.deep.members after https://github.com/chaijs/chai/pull/228
          expect(edges.toJSON()).to.deep.equal([
            self.a23.toJSON(),
            self.a34.toJSON(),
            self.a25.toJSON(),
          ]);
        });
      });

      it("the successors of a23 should be [a34]", function () {
        return self.a23.successors().then(function (edges) {
          expect(edges.toJSON()).to.deep.equal([self.a34.toJSON()]);
        });
      });
    });

    describe("#predecessors", function () {

      it("the predecessors of a23 should be [a12]", function () {
        return self.a23.predecessors().then(function (edges) {
          expect(edges.toJSON()).to.deep.equal([self.a12.toJSON()]);
        });
      });

      it("the predecessors of a34 should be [a12, a23]", function () {
        return self.a34.predecessors().then(function (edges) {
          expect(edges.toJSON()).to.deep.equal([
            self.a12.toJSON(),
            self.a23.toJSON(),
          ]);
        });
      });
    });
  });

  describe("DAG enforcement", function () {
    describe("#BackLoopError", function () {
      it("should raise error on back loop", function () {
        return expect(
          new Edge({ sourceId: self.n2.id, targetId: self.n1.id }).save()
        ).to.be.rejectedWith(Edge.Err.BackLoopError);
      });
    });

    describe("#CyleError", function () {
      it("should raise error on cycle", function () {
        return expect(
          new Edge({ sourceId: self.n3.id, targetId: self.n1.id }).save()
        ).to.be.rejectedWith(Edge.Err.CycleError);
      });
    });

    describe("#MultiEdgeError", function () {
      it("should raise error on multi-edge", function () {
        return expect(
          new Edge({ sourceId: self.n1.id, targetId: self.n2.id }).save()
        ).to.be.rejectedWith(Edge.Err.MultiEdgeError);
      });
    });

    describe("#SelfLoopError", function () {
      it("should raise error on self loop", function () {
        return expect(
          new Edge({ sourceId: self.n1.id, targetId: self.n1.id }).save()
        ).to.be.rejectedWith(Edge.Err.SelfLoopError);
      });
    });
  });

  after(function () {
    return Promise.all([
      self.n1.destroy(),
      self.n2.destroy(),
      self.n3.destroy(),
      self.n4.destroy(),
      self.n5.destroy(),
      self.a12.destroy(),
      self.a23.destroy(),
      self.a34.destroy(),
      self.a25.destroy(),
      self.a14.destroy(),
    ]);
  });
});
