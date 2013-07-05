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

  return out

}())
