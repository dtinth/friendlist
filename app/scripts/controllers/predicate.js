'use strict';

angular.module('friendlist2.app')
  .controller('PredicateCtrl', function($scope, Predicate) {

    $scope.addPredicate = function(where) {
      var index = _.indexOf($scope.predicates, where) + 1
      $scope.predicates.splice(index, 0, new Predicate())
    }
    $scope.removePredicate = function(where) {
      var index = _.indexOf($scope.predicates, where)
      $scope.predicates.splice(index, 1)
    }

  })
