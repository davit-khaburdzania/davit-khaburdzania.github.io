angular.module('workplace', ['firebase'])
.controller('MainController', ['$scope', '$firebase',
  function ($scope, $firebase) {
    var ref = new Firebase("https://perfect-workplace.firebaseio.com/");
    
    $scope.data = $firebase(ref).$asObject();

    $scope.total = function (what) {
      var items = $scope.data.items;
      var total = 0;

      if (!items) return '';
      for(var i=0; i<items.length; i++) total += items[i].price;

      if (what == 'time') return total/38;
      if (what == 'price') return total;
    };

    $scope.left = function (what) {
      var total_time = $scope.total('time');
      var total_price = $scope.total('price');
      var done = $scope.data.done;

      if (!done) return '';

      if (what == 'time') return  total_time - done;
      if (what == 'price') return  (total_time - done) * 38;
    };
  }
]);
