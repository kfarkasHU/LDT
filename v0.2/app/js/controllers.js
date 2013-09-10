'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('GraphCtrl', function($scope) {
    // Set initial edit mode
    $scope.editor = new Object;
    $scope.graph = new Object;
    $scope.editor.mode = 'select';
    $scope.editor.entityOverlay = false;

    // Define some test data (TODO: load and persist to server)
    var e = $scope.graph.entities = [];
    e.push({id: 0, x:  20, y:  20, width: 100, height: 130, name: "Supplier",  attributes: "name\nlocation" });
    e.push({id: 1, x: 220, y:  20, width: 100, height: 130, name: "Part",      attributes: "size\nshape\ncolor" });
    e.push({id: 2, x: 120, y: 190, width: 100, height: 130, name: "Inventory", attributes: "quantity" });
    $scope.graph.next_entity_id = 3;

    var r = $scope.graph.relationships = [];
    r.push({ id: 0, entity1_id: 0, entity2_id: 2, label1: true, label2: false, symbol1: 'one', symbol2: 'many' });
    r.push({ id: 1, entity1_id: 1, entity2_id: 2, label1: true, label2: false, symbol1: 'one', symbol2: 'many' });
    $scope.graph.next_relationship_id = 2;

    function entityCenterCoord(e) {
      return (e.x * 1 + e.width / 2) + "," + (e.y * 1 + e.height / 2);
    };

    // Draw a simple line for each relationship
    // TODO: Put in fancier logic for drawing L-shaped relationships
    $scope.editor.linePath = function(){
      if ($scope.graph.entities.length > 0)
        return _.map($scope.graph.relationships, function(relationship) {
          var e1 = _.find($scope.graph.entities, function(e) { return e.id == relationship.entity1_id })
          var e2 = _.find($scope.graph.entities, function(e) { return e.id == relationship.entity2_id })

          if (e1 && e2) return "M" + entityCenterCoord(e1) + " L" + entityCenterCoord(e2)
        }).join(" ")
      else
        return ''
    };

    // Respond to click event to complete an action
    $("#canvas").click(function(e) {
      $scope.$apply(function() {
        if ($scope.editor.mode == 'new_entity') {
          // FIXME: offsetX,offsetY give the wrong result for positioning a new entity if you click inside an existing entity.
          $scope.graph.entities.push({
            id: $scope.graph.next_entity_id++,
            x: e.offsetX,
            y: e.offsetY,
            width: 120,
            height: 150,
            name: "New Entity",
            attributes: "new_entity_id"
          })
        }
        $scope.editor.mode = 'select';
        $scope.editor.entityOverlayMessage = '';
        $scope.editor.entityOverlay = false;
      })
    });

    $scope.editor.entityOverlayMessage = function() {
      switch($scope.editor.mode) {
        case 'new_relationship_start':
        case 'new_relationship_end': 'click to end relationship'; break;
      }

    }

    $scope.handleEntityClick = function(entity) {
      switch($scope.editor.mode) {
        case 'new_relationship_start':
          $scope.beginRelationship(entity);
          $scope.editor.entityOverlayMessage = 'click to end relationship';
          break;
        case 'new_relationship_end':
          $scope.endRelationship(entity);
          $scope.editor.entityOverlay = false;
          break;
        case 'delete':
          $scope.deleteEntity(entity);
          $scope.editor.entityOverlay = false;
          break;
      }
    }

    $scope.select = function() {
      $scope.$apply(function() {
        $scope.editor.mode = 'select';
        $scope.editor.entityOverlay = false;
      });
    }

    $scope.newEntity = function() {
      $scope.$apply(function() {
        $scope.editor.mode = 'new_entity';
        $scope.editor.entityOverlay = false;
      });
    }

    $scope.newRelationship = function() {
      $scope.$apply(function() {
        $scope.editor.mode = 'new_relationship_start';
        $scope.editor.entityOverlay = true;
        $scope.editor.entityOverlayMessage = 'click to begin relationship';
      });
    }

    $scope.delete = function() {
      $scope.$apply(function() {
        $scope.editor.mode = 'delete'
        $scope.editor.entityOverlay = true;
        $scope.editor.entityOverlayMessage = 'click to delete';
      });
    }

    $scope.beginRelationship = function(entity) {
      $scope.editor.newRelationshipStart = entity
      $scope.editor.mode = 'new_relationship_end'
    }

    $scope.endRelationship = function(entity) {
      $scope.graph.relationships.push({
        id: $scope.editor.next_relationship_id++,
        entity1_id: $scope.editor.newRelationshipStart.id,
        entity2_id: entity.id,
        symbol1: '?',
        symbol2: '?'
      });
      $scope.editor.mode = 'select'
    }

    $scope.deleteEntity = function(entity_to_delete) {
      // Remove all connected relationships
      $scope.graph.relationships = _.reject($scope.graph.relationships, function(r) {
        return r.entity1_id == entity_to_delete.id || r.entity2_id == entity_to_delete.id
      });

      // Remove entity
      $scope.graph.entities = _.reject($scope.graph.entities, function(e) {
        return e.id == entity_to_delete.id
      });
    }

    $scope.editor.deselectAll = function() {
      _.each($scope.graph.entities, function(entity) {
        entity.selected = false;
      })
    }
  });

