'use strict';

// TODO: use this service and eliminate duplicate code in editor_controller,
// once this service is functioning and tested.
// (This is a work-in-progress code move.)

// TODO: move editor_controller and GraphStore to the root LDT module after graph_controller is eliminated
angular.module('LDT.controllers').service('GraphStore', ['$q', '$http', function($q, $http) {

  var self = this;

  // empty graph prior to load.
  this.graph = {
    id: 0,
    name: '',
    entities: [],
    relationships: [],
    endpoints: [],
    pan: { x: 0, y: 0 }
  };

  this.next_entity_id = 0;
  this.next_relationship_id = 0;

  this.load = function(graphID) {
    //Return a promise whose value is the constructed graph object.
    var deferred = $q.defer();
    $http.get('/graphs/'+graphID).then(
      function(data) {
        self.graph = {
          id: graphID,
          name: data.name,
          entities: [],
          relationships: [],
          endpoints: [],
          pan: {
            x: data.pan_x || 0,
            y: data.pan_y || 0
          }
        };

        _.each(data.entities, function(hash) {
          self.graph.entities.push(new Entity(hash));
        });

        _.each(data.relationships, function(hash) {
           var e1 = _.find(self.graph.entities, function(e){
             return e.id == hash.entity1_id;
           });
           var e2 = _.find(self.graph.entities, function(e){
             return e.id == hash.entity2_id;
           });

           var r = new Relationship(hash.id, e1, e2);

           r.endpoints[0].label  = hash.label1;
           r.endpoints[0].symbol = hash.symbol1;
           r.endpoints[1].label  = hash.label2;
           r.endpoints[1].symbol = hash.symbol2;

           self.addRelationship(r);
        });

        self.next_entity_id       = self.nextID(self.graph.entities);
        self.next_relationship_id = self.nextID(self.graph.relationships);

        deferred.resolve(self.graph);
      },
      function() {
        deferred.reject();
      }
    );
    return deferred.promise;
  };

  this.createRelationship = function(entity1, entity2) {
    var id = self.next_relationship_id++;
    var r = new Relationship(id, entity1, entity2);
    self.addRelationship(r);
    return r;
  };

  this.addRelationship = function(r) {
    self.graph.relationships.push(r);
    self.graph.endpoints.push(r.endpoints[0]);
    self.graph.endpoints.push(r.endpoints[1]);

    r.endpoints[0].relocate();
    r.endpoints[1].relocate();
    r.endpoints[0].negotiateCoordinates();
    r.endpoints[1].negotiateCoordinates();
  };

  this.createEntity = function(locX,locY) {
    self.graph.entities.push(new Entity({
      id: self.next_entity_id++,
      x: locX,
      y: locY,
      width: 120,
      height: 150,
      name: "New Entity",
      attributes: ""
    }));
  };

  this.nextID = function(set) {
    if (typeof(set) == 'undefined' || set.length == 0)
      return 0;
    else
      return _.max(set, function(item) { return item.id; }).id + 1;
  };

  this.deleteEntity = function(entity_to_delete) {

    var endpoints_to_delete = entity_to_delete.clearAllEndpoints();

    // Delete endpoints from associated entities' sides
    _.each(self.graph.entities, function(entity) {
      _.each(endpoints_to_delete, function(endpoint) {
        entity.removeEndpoint(endpoint.partner);
      });
    });

    // Remove all connected relationships
    self.graph.relationships = _.reject(self.graph.relationships, function(r) {
      return r.endpoints[0].entity == entity_to_delete || r.endpoints[1].entity == entity_to_delete;
    });

    // Remove all connected endpoints
    self.graph.endpoints = _.reject(self.graph.endpoints, function(endpoint) {
      return endpoint.entity      == entity_to_delete ||
             endpoint.otherEntity == entity_to_delete;
    });

    // Remove entity
    self.graph.entities = _.reject(self.graph.entities, function(e) {
      return e == entity_to_delete;
    });
  };

  this.deleteRelationship = function(relationship_to_delete) {
    var endpoints = relationship_to_delete.endpoints;

    _.each(endpoints, function(endpoint_to_delete) {

      // Remove connected endpoints from sides
      endpoint_to_delete.entity.removeEndpoint(endpoint_to_delete)

      // Remove all connected endpoints from graph
      self.graph.endpoints = _.without(self.graph.endpoints, endpoint_to_delete);
    });

    // Remove relationship
    self.graph.relationships = _.without(self.graph.relationships, relationship_to_delete);
  };

}]);
