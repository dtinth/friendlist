
'use strict';

angular.module('friendlist2.directives', ['friendlist2.models', 'friendlist2.fb', 'ui.select2'])
  .directive('predicateEditor', function(selectors) {

    var sortSelectorModel = _c.sortBy('order')
    var makeSelectorModel = _c.map(function(selector, key) {
      return { value: key, text: selector.text, order: selector.order, real: selector }
    })

    var selectorModel = sortSelectorModel(makeSelectorModel(selectors))
    var nonChildrenSelectorModel = _.filter(selectorModel, It.not(It.get('real').get('children')))

    return {
      restrict: 'A',
      transclude: true,
      scope: {
        predicates: '=predicateEditor',
      },
      templateUrl: 'views/predicate-editor.html',
      link: function(scope, element, attrs) {
        scope.selectors = attrs.nested ? nonChildrenSelectorModel : selectorModel
        scope.selector = function(name) {
          return selectors[name]
        }
      }
    }
  })
  .directive('dynamic', function() {
    return {
      restrict: 'A',
      transclude: true,
      scope: true,
      template:
        '<div ng-repeat="wtf in dynamic.running ? [] : [1]">' +
          '<wtf ng-transclude></wtf> ' +
          '<button ng-hide="noReload" class="btn" ng-click="dynamic.refresh()"><i class="icon-refresh"></i></button>' +
        '</div>' +
        '<div ng-show="dynamic.running" flm-progress-bar></div>',
      link: function(scope, element, attrs) {
        scope.$parent.$watch(attrs.dynamic, function(val) {
          scope.dynamic = val
          scope.noReload = attrs.noReload === 'true'
        })
      }
    }
  })
  .directive('flmProgressBar', function() {
    return {
      replace: true,
      template:
        '<div class="loading progress progress-striped active"><div class="bar" style="width:100%"></div>'
    }
  })
  .directive('flmListSelector', function(flm) {
    return {
      restrict: 'A',
      transclude: true,
      scope: {
        noReload: '@'
      },
      template:
        '<div class="list-selector" dynamic="list" no-reload="{{noReload}}">' +
          '<select ui-select2="{ placeholder: \'select a list\' }" ' +
            'ng-model="predicate.options.list" class="select-friendlist">' +
            '<option ng-repeat="friendlist in list.value" value="{{friendlist.flid}}" data-type="{{friendlist.type}}">{{friendlist.name}}</option>' +
          '</select>' +
        '</div>',
      link: function(scope, element, attrs) {
        scope.predicate = scope.$parent.predicate
        scope.list = flm.list()
      }
    }
  })
  .directive('flmGroupSelector', function(flm) {
    return {
      restrict: 'A',
      transclude: true,
      scope: {
      },
      template:
        '<div class="group-selector" dynamic="list">' +
          '<select ui-select2="{ placeholder: \'select a group\' }" ' +
            'ng-model="predicate.options.group" class="select-group">' +
            '<option ng-repeat="group in list.value" value="{{group.gid}}">{{group.name}}</option>' +
          '</select>' +
        '</div>',
      link: function(scope, element, attrs) {
        scope.predicate = scope.$parent.predicate
        scope.list = flm.group()
      }
    }
  })
  .directive('sticky', function() {
    return {
      link: function(scope, element, attrs) {
        $(element).sticky({ topSpacing: 0 })
      }
    }
  })


