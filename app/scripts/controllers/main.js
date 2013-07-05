'use strict';

angular.module('friendlist2.app')
  .controller('MainCtrl', function ($scope, Predicate, selectors, Dynamic, $q, $timeout, facebook, flm, sessionCache, Result) {

    $scope.requiredScope = 'user_groups,friends_groups,read_friendlists,manage_friendlists'

    $scope.predicates = [ new Predicate() ]

    /*;(function() {
      var a = []
      function add(sel, list) {
        var p = new Predicate()
        p.selector = sel
        p.options.list = list
        a.push(p)
        return add
      }
      add('inList', '1599173833428')('notInList', '4540348320952')
        ('notInList', '2966919506215')('notInList', '4540341360778')
      var first = true
      $scope.predicates = a
      $scope.$watch('reallyConnected', function(connected) {
        if (connected && first) {
          first = false
          $scope.executeQuery($scope.predicates)
        }
      })
    }())*/

    $scope.validatePredicates = function(predicates) {
      return Predicate.validate(predicates)
    }

    $scope.generateFql = function(predicates) {
      return 'SELECT uid\n' +
        'FROM user\n' +
        'WHERE (uid IN (SELECT uid2 FROM friend WHERE uid1 = me()))\n' +
        'AND ' + Predicate.fql(predicates) + '\n' +
        'ORDER BY name'
    }

    $scope.query = new Dynamic(function() {
      return $q.when(null)
    })

    $scope.query.dummy = true

    $scope.executeQuery = function(predicates) {
      var fql = $scope.generateFql(predicates)
      var query = sessionCache('fql:' + fql, function(refresh) {
        return facebook.fql(fql)
      })
      $scope.query = new Dynamic(function(force) {
        return query(force).then(function(data) {
          return data.map(It.instantiate(Result))
        })
      })
    }

    $scope.checkAll = function(check) {
      _.each($scope.query.value, It.set('checked', check))
    }

    function getSelectedUsers() {
      return _.filter($scope.query.value, It.get('checked'))
    }

    $scope.countCheck = function() {
      return getSelectedUsers().length
    }

    $scope.listOperation = function(method) {
      $scope.action.running = true
      var selected = getSelectedUsers()
      var url = '/' + $scope.action.list + '/members'
      var action = { method: method, list: $scope.action.list }
      var ids = _.map(selected, It.get('uid'))
      function done() {
        $scope.action.running = false
        _.each(selected, function(user) {
          user.actions.push(action)
        })
      }
      function fail(err) {
        $scope.action.running = false
        window.alert(err)
        console.error(err)
      }
      facebook.api(url, method, { members: ids.join(',') })
        .then(done, fail)
    }

    $scope.action = {}

  })






