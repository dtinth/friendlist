
'use strict';

function Predicate() {
  this.selector = 'inList'
  this.options = {}
  this.children = null
}

Predicate.compile = function(template) {
  return function(predicate) {
    return template.replace(/\{\{(\w+)\}\}/g, function(a, b) {
      return predicate.options[b]
    })
  }
}


var brackets = function(a) { return '(' + a + ')' }

var selectors = {
  inList: {
    text: 'In list',
    ui: 'list',
    validate: It.get('options').get('list'),
    fql: Predicate.compile('uid IN (SELECT uid FROM friendlist_member WHERE flid = {{list}})'),
    order: 1
  },
  notInList: {
    text: 'Not in list',
    ui: 'list',
    validate: It.get('options').get('list'),
    fql: Predicate.compile('NOT (uid IN (SELECT uid FROM friendlist_member WHERE flid = {{list}}))'),
    order: 2
  },
  noUserList: {
    text: 'Not in user list',
    ui: 'blank',
    fql: Predicate.compile('NOT (uid IN (SELECT uid FROM friendlist_member WHERE flid IN (SELECT flid FROM friendlist WHERE owner = me() AND type = \'user_created\')))'),
    order: 4
  },
  noList: {
    text: 'Not in any list',
    ui: 'blank',
    fql: Predicate.compile('NOT (uid IN (SELECT uid FROM friendlist_member WHERE flid IN (SELECT flid FROM friendlist WHERE owner = me())))'),
    order: 5
  },
  inGroup: {
    text: 'In group',
    ui: 'group',
    validate: It.get('options').get('group'),
    fql: Predicate.compile('uid IN (SELECT uid FROM group_member WHERE gid = {{group}})'),
    order: 10
  },
  notInGroup: {
    text: 'Not in group',
    ui: 'group',
    validate: It.get('options').get('group'),
    fql: Predicate.compile('NOT (uid IN (SELECT uid FROM group_member WHERE gid = {{group}}))'),
    order: 11
  },
  any: {
    text: 'Any of These',
    ui: 'blank',
    children: true,
    validate: function(pred) {
      return Predicate.validate(pred.children)
    },
    fql: function(pred) {
      return _.map(pred.children, It.send('fql')).map(brackets).join('\nOR ')
    },
    order: 100
  }
}

;(function(pred) {

  pred.getChildren = function() {
    if (selectors[this.selector].children && !this.children) {
      this.children = [ new Predicate() ]
    }
    return this.children
  }

  pred.validate = function() {
    var validator = selectors[this.selector].validate
    return !validator || validator(this)
  }

  pred.fql = function() {
    return selectors[this.selector].fql(this)
  }

}(Predicate.prototype))

Predicate.validate = function(array) {
  return _.every(array, It.send('validate'))
}

Predicate.fql = function(array) {
  return _.map(array, It.send('fql')).map(brackets).join('\nAND ')
}

function Dynamic(task) {
  var obj = { running: true, value: null, error: null }
  function success(value) {
    obj.running = false
    obj.value = value
  }
  function failure(err) {
    obj.running = false
    obj.error = err
  }
  function refresh(forceRefresh) {
    obj.running = true
    obj.error = null
    obj.value = null
    task(forceRefresh).then(success, failure)
  }
  obj.refresh = function() {
    refresh(true)
  }
  refresh(false)
  return obj
}

function Result(user) {
  this.uid = user.uid
  this.checked = false
  this.actions = []
}

angular.module('friendlist2.models', [])
  .value('Predicate', Predicate)
  .value('Dynamic', Dynamic)
  .value('Result', Result)
  .value('selectors', selectors)
  .factory('sessionCache', function($q) {
    function sessionCache(key, fn) {
      function getKey(key) {
        return sessionCache.cacheBucket + ':' + key
      }
      return function(forceRefresh) {
        var k = getKey(key)
        if (!forceRefresh && sessionStorage[k]) {
          return $q.when(JSON.parse(sessionStorage[k]))
        }
        function save(data) {
          sessionStorage[k] = JSON.stringify(data)
          return data
        }
        return fn(forceRefresh).then(save)
      }
    }
    sessionCache.cacheBucket = ''
    return sessionCache
  })
