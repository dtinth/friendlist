
'use strict';

/*global FB*/

angular.module('friendlist2.fb', ['friendlist2.models'])
  .service('facebook', function($rootScope, $q, sessionCache) {

    var facebook = { connected: false }

    $rootScope.facebook = facebook

    function updateStatus(response) {
      $rootScope.$apply(function() {
        facebook.status = response
        facebook.connected = (response.status === 'connected')
        if (facebook.connected) {
          sessionCache.cacheBucket = response.authResponse.userID
        }
      })
    }

    FB.getLoginStatus(updateStatus)
    FB.Event.subscribe('auth.authResponseChange', updateStatus)

    facebook.login = function(scope) {
      var I = $q.defer()
      FB.login(function(response) {
        updateStatus(response)
        I.resolve(response)
      }, { scope: scope })
      return I.promise
    }

    facebook.logout = function() {
      var I = $q.defer()
      FB.logout(function(response) {
        updateStatus(response)
        I.resolve(response)
      })
      return I.promise
    }

    facebook.api = function(path, method, params) {
      var I = $q.defer()
      FB.api(path, method, params, function(response) {
        $rootScope.$apply(function() {
          if (!response) {
            I.reject(new Error('cannot get facebook response'))
          } else if (response.error) {
            I.reject(response.error)
          } else {
            I.resolve(response)
          }
        })
      })
      return I.promise
    }

    facebook.fql = function(fql) {
      return facebook.api('/fql', 'GET', { q: fql })
        .then(function(response) {
          return response.data
        })
    }

    facebook.me = null

    $rootScope.$watch('facebook.connected', function(connected) {
      if (connected) {
        sessionCache('me', function() {
          return facebook.api('/me', 'GET', { fields: 'name,id' })
        })()
          .then(function(data) {
            facebook.me = data
            $rootScope.reallyConnected = true
          }, function() {
            console.error('Cannot get Facebook ID')
            facebook.me = null
          })
      } else {
        facebook.me = null
      }
    })

    return facebook

  })
  .service('flm', function($rootScope, Dynamic, facebook, sessionCache, $q) {

    var manager = {}

    function lazy(promiseMaker) {
      var dynamic = null
      var fn = function() {
        if (!dynamic) {
          dynamic = new Dynamic(promiseMaker)
        }
        return dynamic
      }
      fn.maybe = function(callback) {
        if (dynamic) callback(dynamic)
      }
      fn.refresh = function() {
        return fn.maybe(It.send('refresh'))
      }
      return fn
    }

    manager.list = lazy(sessionCache('lists', function() {
      return facebook.fql('SELECT flid, name, type FROM friendlist WHERE owner = me() ORDER BY name')
        .then(function(list) {
          var order = ['close_friends', 'acquaintances', 'work', 'education', 'current_city', 'family', 'user_created', 'restricted']
          return _c.sortBy(It.get('type').compose(_.partial(_.indexOf, order)))(list)
        })
    }))

    manager.group = lazy(sessionCache('groups', function() {
      return facebook.fql('SELECT gid, name FROM group WHERE gid IN (SELECT gid FROM group_member WHERE uid = me()) ORDER BY name')
    }))

    function queue(execute) {
      var operation
      function flush() {
        var currentOperation = operation
        var defer = currentOperation.defer
        execute(currentOperation.ids)
          .then(function(data) { defer.resolve(data) },
                function(err)  { defer.reject(err) })
        operation = null
      }
      return function(id) {
        if (!operation) {
          operation = { ids: [id], defer: $q.defer(), map: {} }
          setTimeout(flush, 100)
        } else if (!operation.map[id]) {
          operation.ids.push(id)
        }
        operation.map[id] = true
        return operation.defer.promise
          .then(function(data) {
            return data[id]
          })
      }
    }

    var getUser = queue(function(ids) {
      return facebook.api('/', 'GET', { ids: ids.join(','), fields: 'id,name,link' })
    })
    
    var userInfo = {}
    manager.user = function(id) {
      return userInfo[id] || (userInfo[id] = new Dynamic(sessionCache('user' + id, function() {
        return getUser(id)
      })))
    }

    manager.userLink = function(uid) {
      var info = manager.user(uid)
      if (info.value) {
        return '<a href="' + info.value.link + '">' + info.value.name + '</a>'
      }
      return '<span class="wait-for-info">[... ' + uid + ' ...]</span>'
    }

    $rootScope.reallyConnected = false

    $rootScope.$watch('facebook.connected', function(connected) {
      if (connected) {
        manager.list.refresh()
        manager.group.refresh()
      }
    })
    
    $rootScope.flm = manager

    return manager
    
  })











