_c = (function() {

  'use strict';

  var slice = [].slice

  function wrap(fn) {
    return function wrappedFunction(f) {
      return function partiallyAppliedFunction() {
        var args = slice.call(arguments, 0, 1)
                     .concat([f], slice.call(arguments, 1))
        return fn.apply(null, args)
      }
    }
  }
  function attach(_) {
    return function(name) {
      out[name] = wrap(_[name])
    }
  }

  var out = { wrap: wrap, attach: attach }

  out.each = wrap(_.each)
  out.each(attach(_))(['map', 'sortBy', 'filter'])

  out.get = function(key, it) {
    if (!it) it = _.identity
    return function(x) {
      return it(x)[key]
    }
  }
  out.call = function(key, it) {
    if (!it) it = _.identity
    return function(x) {
      return it(x)[key]()
    }
  }
  out.set = function(key, value, it) {
    if (!it) it = _.identity
    return function(x) {
      var ref = it(x)
      ref[key] = value
      return ref
    }
  }
  out.not = function(fn) {
    return function(x) {
      return !fn(x)
    }
  }
  out.indexIn = function(array, it) {
    if (!it) it = _.identity
    return function(item) {
      return _.indexOf(array, it(item))
    }
  }
  out.makeInstance = function(Constructor, it) {
    if (!it) it = _.identity
    return function(x) {
      return new Constructor(it(x))
    }
  }

  return out

}())
