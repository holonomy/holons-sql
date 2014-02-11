"use strict";

require("mocha-as-promised")();
var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var Promise = require('bluebird');
var _ = require('underscore');

var Edge = require('../Edge');
var Vertex = require('../Vertex');

describe("Vertex", function () {
  var self = this;

  describe("#save#destroy", function () {
    it("#save#destroy", function () {
      // create a new edge and save
      return new Vertex()
      .save()
      .then(function (edge) {
        // check that new edge is as expected
        expect(edge).to.exist;

        // query for the edge
        return edge.query('where', 'id', '=', edge.id)
        .fetch()

      }).then(function (edge) {
        // check that edge returned from query is as expected
        expect(edge).to.exist;

        // destroy the edge
        return edge.destroy();

      }).then(function (edge) {
        // query for the edge again
        return edge.query('where', 'id', '=', edge.id)
        .fetch()

      }).then(function (result) {
        // check that result from query is as expected
        expect(result).to.not.exist;
      });
    });
  });
  
  describe("relations", function () {
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
      ]).spread(function (a, b, c, d, n1, n2, n3, n4) {
        self.n1 = n1;
        self.n2 = n2;
        self.n3 = n3;
        self.n4 = n4;

        return Promise.all([
          new Edge({ sourceId: n1.id, targetId: n2.id }).save(),
          n2.children().attach([n3]),
          n4.parents().attach([n3]),
        ]);
      });
    });

    describe("out", function () {

      it("n2.out should be n2->n3 edge", function () {
        return self.n2.load(['out']).then(function (vertex) {
          var outVal = vertex.related('out');
          expect(outVal).to.have.length(1);
          var a23 = self.a23 = outVal.models[0];
          expect(a23.toJSON()).to.have.property('sourceId', self.n2.id);
          expect(a23.toJSON()).to.have.property('targetId', self.n3.id);
          
        });
      });

      it("n3.out should be n3->n4 edge", function () {
        return self.n3.load(['out']).then(function (vertex) {
          var outVal = vertex.related('out');
          expect(outVal).to.have.length(1);
          var a34 = self.a34 = outVal.models[0];
          expect(a34.toJSON()).to.have.property('sourceId', self.n3.id);
          expect(a34.toJSON()).to.have.property('targetId', self.n4.id);
        });
      });
    });

    describe("in", function () {

      it("n2.in should be n1->n2 edge", function () {
        return self.n2.load(['in']).then(function (vertex) {
          var inVal = vertex.related('in');
          expect(inVal).to.have.length(1);
          var a12 = self.a12 = inVal.models[0];
          expect(a12.toJSON()).to.have.property('sourceId', self.n1.id);
          expect(a12.toJSON()).to.have.property('targetId', self.n2.id);
        });
      });
    });

    describe("children", function () {

      it("of n2 should be [n3]", function () {
        return self.n2.load(['children']).then(function (vertex) {
          var children = vertex.related('children');
          expect(children).to.have.length(1);
          expect(children.models[0].id).to.equal(self.n3.id);
        });
      });

    });

    describe("parents", function () {

      it("of n2 should be [n1]", function () {
        return self.n2.load(['parents']).then(function (vertex) {
          var parents = vertex.related('parents');
          expect(parents).to.have.length(1);
          expect(parents.models[0].id).to.equal(self.n1.id);
        });
      });
    });

    describe("#ancestors", function () {

      it("the ancestors of n2 should be [n1]", function () {
        return self.n2.ancestors().then(function (vertexes) {
          expect(vertexes.models).to.have.length(1);
          expect(vertexes.models[0].id).to.equal(self.n1.id);
        });
      });

      it("the ancestors of n4 should be [n1, n2, n3]", function () {
        return self.n4.ancestors().then(function (vertexes) {
          expect(vertexes.models).to.have.length(3);
          expect(_.pluck(vertexes.models, 'id')).to.have.members([
            self.n1.id,
            self.n2.id,
            self.n3.id,
          ]);
        });
      });
    });

    describe("#descendants", function () {

      it("the descendants of n3 should be [n4]", function () {
        return self.n3.descendants().then(function (vertexes) {
          expect(vertexes.models).to.have.length(1);
          expect(vertexes.models[0].id).to.equal(self.n4.id);
        });
      });

      it("the descendants of n1 should be [n2, n3, n4]", function () {
        return self.n1.descendants().then(function (vertexes) {
          expect(vertexes.models).to.have.length(3);
          expect(_.pluck(vertexes.models, 'id')).to.have.members([
            self.n2.id,
            self.n3.id,
            self.n4.id,
          ]);
        });
      });
    });

    after(function () {
      return Promise.all([
        self.n1.destroy(),
        self.n2.destroy(),
        self.n3.destroy(),
        self.n4.destroy(),
        self.a12.destroy(),
        self.a23.destroy(),
        self.a34.destroy(),
      ]);
    });
  });
});
