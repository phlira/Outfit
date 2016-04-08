'use strict';

var app = angular.module('outfitHtml');

app.controller('PrincipalCtrl',['$scope','$location', function($scope, $location){

	$scope.produtos = [{marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'},
					   {marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'},
					   {marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'},
					   {marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'},
					   {marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'},
					   {marca : 'nike', titulo : 'Camisa Nike', url : 'https://d24kgseos9bn1o.cloudfront.net/katycalcados/imagens/produtos/det/camiseta-masculina-nike-tee-oversize-cac4933ab3188257fd71d3e5391e37f3.jpg', valor : '122,90'},
					   {marca : 'lacost', titulo : 'Camisa Lacost', url : 'http://dsmovpa78dlbp.cloudfront.net/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/h/ch0855-21_indigofo-2268.jpg', valor : '122,90'}];

}]);