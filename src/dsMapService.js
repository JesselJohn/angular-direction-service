! function(window, angular, undefined) {
  angular.module('ds.map', []).
  factory('dsMapFactory', ['$http', function($http) {
    var obj = {

    };
    return obj;
  }]).
  directive('dsMap', ['$q', '$timeout', 'dsMapFactory', function($q, $timeout, dsMapFactory) {
    var deferred = $q.defer(),
      obj = {
        scope: true,
        restrict: "E",
        link: function(scope) {

        },
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
          var _deferred = $q.defer(),
            dsMapElements = 0,
            deferredArray = [],
            that = this;

          this.mapDeferred = deferred;
          this.mapRendered = deferred.promise;

          this.getLocation = function() {
            return that.dsPlacesLocation;
          };

          this.setLocation = function(center) {
            that.dsPlacesLocation = center || that.getMap().getCenter();
          };

          this.getMap = function() {
            return that.map;
          };

          this.setMap = function(map) {
            dsMapFactory.map = that.map = that.map || map;
            this.setLocation(that.getMap().getCenter());
            dsMapFactory.marker = {
              position: that.getMap().getCenter(),
              map: that.getMap()
            };
          };

          (function(dfrd, _dfrd) {
            that.mapRendered.then(function() {
              var defaultMap = new google.maps.Map(document.createElement('div'), {
                center: {
                  lat: 12.94206,
                  lng: 77.62229
                },
                zoom: 8
              });
              that.setMap(defaultMap);

              var marker = new google.maps.Marker(dsMapFactory.marker);
              marker.setMap(that.getMap());

              $timeout(function() {
                _dfrd.resolve();
              }, 5000);
            });
          })(deferred, _deferred);

          deferred = _deferred;
        }]
      };
    return obj;
  }]).
  directive('dsMapView', function() {
    var obj = {
      scope: {
        dsMapSettings: "="
      },
      restrict: "E",
      replace: true,
      template: "<div></div>",
      require: "^?dsMap",
      link: function(scope, element, attrs, dsMapController) {
        var map = new google.maps.Map(element[0], scope.dsMapSettings);
        dsMapController.setMap(map);
      },
      controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {

      }]
    };
    return obj;
  }).
  directive('dsMapPlaces', ['$q', function($q) {
    var initialdsMapView = true,
      deferred = $q.defer(),
      obj = {
        scope: {

        },
        restrict: "E",
        replace: true,
        require: "^?dsMap",
        link: function(scope, element, attrs, dsMapController) {
          var rankByDistance = google.maps.places.RankBy.DISTANCE;
          if (initialdsMapView) {
            dsMapController.mapDeferred.resolve();
            initialdsMapView = false;
          }
          dsMapController.mapRendered.then(function() {
            dsMapController.placesService = new google.maps.places.PlacesService(dsMapController.getMap());
            dsMapController.directionsService = new google.maps.DirectionsService();
            dsMapController.directionsDisplay = new google.maps.DirectionsRenderer({
              map: dsMapController.getMap(),
              preserveViewport: true
            });
            dsMapController.bounds = new google.maps.LatLngBounds();
            deferred.resolve(dsMapController.placesService);
          });
        },
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
          this.placesServiceSet = deferred.promise;
        }]
      };
    return obj;
  }]).
  directive('dsPlacesType', ['$q', '$timeout', function($q, $timeout) {
    var deferred = $q.defer(),
      placesServiceCount = 0,
      obj = {
        scope: {
          types: "=",
          sortOption: "@",
          radius: "="
        },
        templateUrl: "dsMapPlaces.html",
        restrict: "E",
        replace: true,
        require: ["^?dsMap", "^?dsMapPlaces"],
        link: function(scope, element, attrs, dsMapControllers) {
          var dsMapController = dsMapControllers[0],
            dsMapPlacesController = dsMapControllers[1],
            obj = {
              location: dsMapController.getMap().getCenter(),
              types: []
            };

          function callPlacesService(dfrd, _dfrd, type) {
            dsMapController.mapRendered.then(function() {
              dfrd.promise.then(function() {
                dsMapPlacesController.placesServiceSet.then(function(placesService) {
                  if (type) {
                    obj.types = [type];
                  }
                  placesService.nearbySearch(obj, function(results, status) {
                    scope.Places = scope.Places.concat(type === undefined ? results : results.slice(0, scope.types[type]));
                    $timeout(function() {
                      _dfrd.resolve();
                    }, 300);
                  });
                });
              });
            });
          }

          if (scope.sortOption && scope.sortOption == "radius") {
            obj.radius = scope.radius || 5000;
          } else {
            obj.rankBy = google.maps.places.RankBy.DISTANCE;
          }

          if (Object.prototype.toString.call(scope.types) == "[object Array]") {
            var _deferred = $q.defer();
            obj.types = scope.types;
            callPlacesService(deferred, _deferred);
            deferred = _deferred;
          } else if (Object.prototype.toString.call(scope.types) == "[object Object]") {
            for (var _types in scope.types) {
              (function(_deferred) {
                _deferred = $q.defer();
                callPlacesService(deferred, _deferred, _types);
                deferred = _deferred;
              })(_deferred);
            }
          } else {
            throw "'types' attribute must be an array or object"
          }

          (function() {
            scope.onMouseOver = function() {
              var request = {
                  origin: dsMapController.getLocation(),
                  destination: this.place.geometry.location,
                  travelMode: google.maps.TravelMode["DRIVING"]
                },
                that = this;

              try {
                if (that.isDirectionResponseCallMade) {
                  if (that.directionResponse) {
                    dsMapController.directionsDisplay.setDirections(that.directionResponse);
                  }
                  return;
                }
                that.isDirectionResponseCallMade = true;
                dsMapController.directionsService.route(request, function(response, status) {
                  dsMapController.directionsDisplay.setDirections(that.directionResponse = response);
                });
              } catch (err) {}
            };
          })();
        },
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
          $scope.Places = [];
        }]
      };

    deferred.resolve();

    return obj;
  }]).
  directive('dsWithinBounds', [function() {
    var obj = {
      require: ["^?dsMap", "^?dsMapPlaces", "^?dsPlacesType"],
      link: function(scope, element, attrs, dsMapControllers) {
        var dsMapController = dsMapControllers[0],
          dsMapPlacesController = dsMapControllers[1],
          dsPlacesTypeController = dsMapControllers[2];

        if (scope.place) {
          dsMapController.bounds.extend(scope.place.geometry.location);
          dsMapController.getMap().fitBounds(dsMapController.bounds);
          dsMapController.getMap().setCenter(dsMapController.getLocation());
        }
      }
    };

    return obj;
  }]);
}(window, window.angular);
