! function(window, angular, undefined) {
  var defaultMapSettings = {
      center: {
        lat: 12.94206,
        lng: 77.62229
      },
      zoom: 8
    },
    setMarkerFunc = undefined;

  function setMarkerCurryFunc(placesMap) {
    if (placesMap) {
      var map = placesMap;
    }
    return function(marker) {
      if (!map) {
        throw "Please pass a map reference before setting marker";
      }
      if (Object.prototype.toString.call(marker) == "[object Object]" && marker.position !== undefined) {
        marker.map = map;
        var newMarker = new google.maps.Marker(marker);
        newMarker.setMap(map);
        return newMarker;
      }
    }
  };

  angular.module('ds.map', []).
  factory('dsMapFactory', ['$http', function($http) {
    var obj = {
      getDefaultMapSettings: function() {
        return defaultMapSettings;
      },
      setDefaultMapSettings: function(settingsObj) {
        defaultMapSettings = settingsObj;
      },
      setDirectionsToLocation: function() {}
    };
    return obj;
  }]).
  directive('dsMap', ['$q', '$timeout', 'dsMapFactory', function($q, $timeout, dsMapFactory) {
    var deferred = $q.defer(),
      obj = {
        scope: {
          dsMapSettings: "="
        },
        restrict: "E",
        link: function(scope) {

        },
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
          var _deferred = $q.defer(),
            placesDeferred = $q.defer(),
            dsMapElements = 0,
            deferredArray = [],
            that = this,
            dsMapSettings = that.dsMapSettings = $scope.dsMapSettings || dsMapFactory.getDefaultMapSettings(),
            map = new google.maps.Map(document.createElement('div'), dsMapSettings);

          that.mapDeferred = deferred;
          that.mapRendered = deferred.promise;
          that.placesDeferred = placesDeferred;
          that.placesRendered = placesDeferred.promise;
          that.placesGroupHash = {};

          that.placesCount = 0;

          that.getLocation = function() {
            return that.dsPlacesLocation;
          };

          that.setLocation = function(center) {
            that.dsPlacesLocation = center || that.getMap().getCenter();
          };

          that.getMap = function() {
            return that.map;
          };

          that.setMap = function(map) {
            dsMapFactory.map = that.map = map;
            that.setLocation(that.map.getCenter());
            dsMapFactory.marker = {
              position: that.map.getCenter()
            };
          };

          that.setMap(map);

          that.iterateAllMarkers = function(callback) {
            for (var groups in that.placesGroupHash) {
              var eachGroupRef = that.placesGroupHash[groups];
              for (var _count = 0, len = eachGroupRef.length; _count < len; _count++) {
                var allIteratedMarkers = eachGroupRef[_count];
                callback.call(allIteratedMarkers);
              }
            }
          };

          that.iterateMarkersMatchingBoolean = function(bool, callback) {
            that.iterateAllMarkers(function() {
              var eachPreviousMarker = this;
              if (eachPreviousMarker.visible === bool) {
                callback.call(eachPreviousMarker);
                eachPreviousMarker.setMap(eachPreviousMarker.getMap());
              }
            });
          }

          that.setGroupMarkerVisibility = function(group, bool, setVisibleMarkerBounds) {
            var currentGroupRef = that.placesGroupHash[group],
              previousGroup = undefined;
            if (previousGroup != group) {
              that.bounds = new google.maps.LatLngBounds();
              for (var currentGroupCount = 0, len = currentGroupRef.length; currentGroupCount < len; currentGroupCount++) {
                var eachCurrentMarker = currentGroupRef[currentGroupCount];
                if (eachCurrentMarker.visible !== bool) {
                  eachCurrentMarker.visible = bool;
                  eachCurrentMarker.setMap(eachCurrentMarker.getMap());
                  if (setVisibleMarkerBounds && eachCurrentMarker.visible) {
                    that.bounds.extend(eachCurrentMarker.position);
                  }
                }
              }

              if (setVisibleMarkerBounds) {
                that.changeMapBounds();
              }
            }

            previousGroup = group;
          };

          that.hideAllVisibleMarkers = function() {
            that.iterateMarkersMatchingBoolean(true, function() {
              var visibleMarker = this;
              visibleMarker.visible = false;
            });
          };

          that.changeMapBounds = function() {
            that.getMap().fitBounds(that.bounds);
            that.getMap().setCenter(that.getLocation());
            that.getMap().setZoom(that.getMap().getZoom() - 1);
          };

          that.placesRendered.then(function() {
            that.changeMapBounds();
          });

          (function(dfrd, _dfrd) {
            that.mapRendered.then(function() {
              dsMapFactory.setMarker = setMarkerFunc = setMarkerCurryFunc(that.getMap());
              setMarkerFunc(new google.maps.Marker(dsMapFactory.marker));
            });
          })(deferred, _deferred);

          that.nextDefer = deferred = _deferred;
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
          var map = new google.maps.Map(element[0], scope.dsMapSettings || dsMapController.dsMapSettings);
          dsMapController.setMap(map);
          dsMapController.isViewSet = true;
        }
      };
      return obj;
    }).directive('dsMapPlaces', ['$q', 'dsMapFactory', function($q, dsMapFactory) {
      var initialdsMapView = true,
        deferred = $q.defer(),
        obj = {
          scope: {
            options: "="
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
              scope.options.map = dsMapController.getMap();
              dsMapController.directionsDisplay = new google.maps.DirectionsRenderer(scope.options);
              dsMapController.bounds = new google.maps.LatLngBounds();
              deferred.resolve(dsMapController.placesService);
            });

            dsMapFactory.dsMapPlacesLoaded(function() {
              if (dsMapController.isViewSet) {
                dsMapFactory.setDirectionsToLocation = function(location, mode) {
                  var request = {
                    origin: dsMapController.getLocation(),
                    destination: location,
                    travelMode: google.maps.TravelMode[mode]
                  };

                  dsMapController.hideAllVisibleMarkers();
                  dsMapController.directionsDisplay.setMap(dsMapController.getMap());
                  dsMapController.directionsService.route(request, function(response, status) {
                    if (status == "OK") {
                      dsMapController.directionsDisplay.setDirections(response);
                      dsMapController.bounds = new google.maps.LatLngBounds();
                      dsMapController.bounds.extend(dsMapController.getLocation());
                      dsMapController.bounds.extend(location);
                      dsMapController.placesGroupHash['searchedLocation'] = [location];
                      setMarkerFunc({
                        position: location,
                        visible: true
                      });
                      dsMapController.changeMapBounds();
                    }
                  });
                };
              }
            });
          },
          controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
            var that = this;
            that.placesServiceSet = deferred.promise;
            that.dsMapPlacesDeferred = function() {
              var _deferred = $q.defer();
              return function() {
                return _deferred;
              };
            }();
            dsMapFactory.dsMapPlacesLoaded = that.dsMapPlacesLoaded = function(callback) {
              that.dsMapPlacesDeferred().promise.then(callback);
            };
          }]
        };
      return obj;
    }])
    .directive('dsHasGroup', [function() {
      var previousGroup = undefined,
        obj = {
          require: ["^?dsMap", "^?dsMapPlaces"],
          link: function(scope, element, attrs, dsMapControllers) {
            var dsMapController = dsMapControllers[0],
              dsMapPlacesController = dsMapControllers[1],
              onToggleClick = function(group) {
                dsMapController.directionsDisplay.setMap(null);
                if (previousGroup !== undefined) {
                  if (previousGroup == group) {
                    return;
                  }
                  dsMapController.setGroupMarkerVisibility(previousGroup, false, true);
                } else {
                  dsMapController.hideAllVisibleMarkers();
                }

                dsMapController.setGroupMarkerVisibility(group, true, true);

                previousGroup = group;
              };

            dsMapController.toggleGroupVisibility = scope.toggleGroupVisibility = function(group) {
              dsMapPlacesController.dsMapPlacesLoaded(function() {
                onToggleClick(group);
              });
            };

          },
          controller: ['$scope', function($scope) {
            var that = this;

            that.isGroupSet = true;
          }]
        };

      return obj;
    }])
    .directive('dsPlacesType', ['$q', '$timeout', function($q, $timeout) {
      var deferred = $q.defer(),
        placesServiceCount = 0,
        obj = {
          scope: {
            group: "@",
            types: "=",
            options: "=",
            sortOption: "@",
            radius: "="
          },
          templateUrl: "dsMapPlaces.html",
          restrict: "E",
          replace: true,
          require: ["^?dsMap", "^?dsMapPlaces", "^?dsHasGroup"],
          link: function(scope, element, attrs, dsMapControllers) {
            var dsMapController = dsMapControllers[0],
              dsMapPlacesController = dsMapControllers[1],
              dsHasGroupController = dsMapControllers[2],
              obj = {
                location: dsMapController.getMap().getCenter(),
                types: []
              },
              showDirectionTimeoutId = undefined;

            function callPlacesService(dfrd, _dfrd, type) {
              dsMapController.placesCount++;
              dsMapController.mapRendered.then(function() {
                dfrd.promise.then(function() {
                  dsMapPlacesController.placesServiceSet.then(function(placesService) {
                    if (type) {
                      obj.types = [type];
                    }

                    placesService.nearbySearch(obj, function(results, status) {
                      if (status == "OK" && Object.prototype.toString.call(results) == "[object Array]") {
                        scope.Places = scope.Places.concat(type === undefined ? results : results.slice(0, scope.types[type]));
                      }
                      $timeout(function() {
                        if ((--dsMapController.placesCount) === 0) {
                          dsMapController.nextDefer.resolve();
                          dsMapController.nextDefer.promise.then(function() {
                            _dfrd.resolve();
                            dsMapPlacesController.dsMapPlacesDeferred().resolve();
                          });
                          dsMapController.placesDeferred.resolve();
                        } else {
                          _dfrd.resolve();
                        }
                      }, 300);
                    });
                  });
                });
              });
            }

            if (scope.group !== undefined) {
              dsMapController.placesGroupHash[scope.group] = [];
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

            if (dsMapController.isViewSet) {
              dsMapPlacesController.dsMapPlacesLoaded(function() {
                scope.showDirection = function() {
                  var that = this;
                  $timeout.cancel(showDirectionTimeoutId);
                  showDirectionTimeoutId = $timeout(function() {
                    var request = {
                      origin: dsMapController.getLocation(),
                      destination: that.place.geometry.location,
                      travelMode: google.maps.TravelMode["DRIVING"]
                    };

                    if (dsHasGroupController && dsMapController.placesGroupHash[scope.group][0].visible === false) {
                      dsMapController.setGroupMarkerVisibility(scope.group, true, true);
                    }

                    dsMapController.directionsDisplay.setMap(dsMapController.getMap());

                    try {
                      if (that.isDirectionResponseCallMade) {
                        if (that.directionResponse) {
                          dsMapController.directionsDisplay.setDirections(that.directionResponse);
                        }
                        return;
                      }
                      that.isDirectionResponseCallMade = true;
                      dsMapController.directionsService.route(request, function(response, status) {
                        if (status == "OK") {
                          dsMapController.directionsDisplay.setDirections(that.directionResponse = response);
                        }
                      });
                    } catch (err) {}
                  }, 300)
                };
              });
            }
          },
          controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
            $scope.Places = [];
          }]
        };

      deferred.resolve();

      return obj;
    }]).directive('dsEachPlace', [function() {
      var obj = {
        require: ["^?dsMap", "^?dsMapPlaces", "^?dsPlacesType"],
        link: function(scope, element, attrs, dsMapControllers) {
          var dsMapController = dsMapControllers[0],
            dsMapPlacesController = dsMapControllers[1],
            dsPlacesTypeController = dsMapControllers[2];

          if (scope.place) {
            var placeLocation = scope.place.geometry.location,
              setVisibility = scope.options === undefined ? true : !!scope.options.visible,
              distanceThis = parseFloat(google.maps.geometry.spherical.computeDistanceBetween(dsMapController.getLocation(), placeLocation) / 1000).toFixed(1),
              durationThis = parseInt(distanceThis * 42 / 3.5, 10);
            if (setVisibility) {
              dsMapController.bounds.extend(placeLocation);
            }

            scope.place.distance = distanceThis;
            scope.place.duration = durationThis;

            dsMapController.mapRendered.then(function() {
              var marker = setMarkerFunc({
                position: placeLocation,
                visible: setVisibility
              });
              try {
                dsMapController.placesGroupHash[scope.group].push(marker);
              } catch (err) {
                console.warn(err);
              }
            });
          }
        }
      };

      return obj;
    }]);
}(window, window.angular);
