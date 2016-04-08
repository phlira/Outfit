'use strict';

angular.module('outfitServices', [ 'ngResource' ]);

var app = angular.module('outfitHtml', [ 'ngResource', 'ngRoute', 'ngAria', 'ngMessages', 'ngCookies', 'LocalStorageModule', 'angular-jwt', 'outfitServices', 'angular-loading-bar']);

app.config(function($routeProvider) {
	$routeProvider.when('/principal', {
		templateUrl : 'app/principal/principal.html',
		controller : 'PrincipalCtrl'
	}).otherwise({
		redirectTo : '/principal'
	});
}).factory('authHttpResponseInterceptor', [ '$q', '$window', '$log', function($q, $window, $log) {
	return {
		response : function(response) {
			return response || $q.when(response);
		},
		responseError : function(rejection) {
			if (rejection.status === 403) {
				var msgErro = 'Usuário não autorizado a acessar esta funcionalidade';
				if (rejection.data && rejection.data.msgErro) {
					msgErro = rejection.data.msgErro;
				}
				$log.error(msgErro);
			} else if (rejection.status === 401) {
				$window.location = rejection.data.url;
			} else if (rejection.status === 0) {
				$log.error('time out da requisição.');
			} else {
				var msg = 'Ocorreu um erro nesta requisição.';
				if (rejection.data && rejection.data.msgErro) {
					msg = rejection.data.msgErro;
				}
				$log.error(rejection);
			}
			return $q.reject(rejection);
		}
	};
} ]).factory('jwtResponseInterceptor', [ '$cookies', '$rootScope', 'jwtHelper', function($cookies, $rootScope, jwtHelper) {
	return {
		response : function(response) {
			var usuario = null;
			var cookieJWT = $cookies.get('JWT');
			if (typeof cookieJWT !== 'undefined' && cookieJWT !== null) {
				usuario = jwtHelper.decodeToken(cookieJWT);
			}
			$rootScope.usuarioLogado = usuario;
			return response;
		}
	};
} ]).factory('timeoutInterceptor', [ function() {
	return {
		request : function(config) {
			config.timeout = 30000;
			return config;
		}
	};
} ]).config([ '$httpProvider', 'cfpLoadingBarProvider', function($httpProvider, cfpLoadingBarProvider) {
	$httpProvider.interceptors.push('authHttpResponseInterceptor');
	$httpProvider.interceptors.push('jwtResponseInterceptor');
	$httpProvider.interceptors.push('timeoutInterceptor');

	cfpLoadingBarProvider.includeBar = false;
} ]);
