'use strict';

angular.module('friendlist2.app', ['ui.select2', 'friendlist2.models', 'friendlist2.directives', 'friendlist2.fb'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      })
  })
