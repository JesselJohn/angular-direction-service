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
  }

  angular.module('ds.map', []).
  factory('dsMapFactory', ['$http', function($http) {
    var obj = {
      getDefaultMapSettings: getDefaultMapSettingsFunc,
      setDefaultMapSettings: setDefaultMapSettingsFunc,
      setDirectionsToLocation: function() {}
    };

    function getDefaultMapSettingsFunc() {
      return defaultMapSettings;
    }

    function setDefaultMapSettingsFunc(settingsObj) {
      defaultMapSettings = settingsObj;
    }

    return obj;
  }]).
  directive('dsMap', ['$q', '$timeout', 'dsMapFactory', function($q, $timeout, dsMapFactory) {
    var deferred = $q.defer(),
      obj = {
        scope: {
          mapSettings: "="
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
            mapSettings = that.mapSettings = $scope.mapSettings || dsMapFactory.getDefaultMapSettings(),
            map = new google.maps.Map(document.createElement('div'), mapSettings);

          function getLocationFunc() {
            return that.dsPlacesLocation;
          }

          function setLocationFunc(center) {
            that.dsPlacesLocation = center || that.getMap().getCenter();
          }

          function getMapFunc() {
            return that.map;
          }

          function setMapFunc(map) {
            dsMapFactory.map = that.map = map;
            that.setLocation(that.map.getCenter());
          }

          function iterateAllMarkersFunc(callback) {
            for (var groups in that.placesGroupHash) {
              var eachGroupRef = that.placesGroupHash[groups];
              for (var _count = 0, len = eachGroupRef.length; _count < len; _count++) {
                var allIteratedMarkers = eachGroupRef[_count];
                callback.call(allIteratedMarkers);
              }
            }
          }

          function iterateMarkersMatchingBooleanFunc(bool, callback) {
            that.iterateAllMarkers(function() {
              var eachPreviousMarker = this;
              if (eachPreviousMarker.visible === bool) {
                callback.call(eachPreviousMarker);
                eachPreviousMarker.setMap(eachPreviousMarker.getMap());
              }
            });
          }

          function setGroupMarkerVisibilityFunc(group, bool, setVisibleMarkerBounds) {
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
          }

          function hideAllVisibleMarkersFunc() {
            that.iterateMarkersMatchingBoolean(true, function() {
              var visibleMarker = this;
              visibleMarker.visible = false;
            });
          }

          function changeMapBoundsFunc() {
            that.getMap().fitBounds(that.bounds);
            that.getMap().setCenter(that.getLocation());
            that.getMap().setZoom(that.getMap().getZoom() - 1);
          }

          that.mapDeferred = deferred;
          that.mapRendered = deferred.promise;
          that.placesDeferred = placesDeferred;
          that.placesRendered = placesDeferred.promise;
          that.placesGroupHash = {};
          that.placesCount = 0;
          that.getLocation = getLocationFunc;
          that.setLocation = setLocationFunc;
          that.getMap = getMapFunc;
          that.setMap = setMapFunc;
          that.iterateAllMarkers = iterateAllMarkersFunc;
          that.iterateMarkersMatchingBoolean = iterateMarkersMatchingBooleanFunc;
          that.setGroupMarkerVisibility = setGroupMarkerVisibilityFunc;
          that.hideAllVisibleMarkers = hideAllVisibleMarkersFunc;
          that.changeMapBounds = changeMapBoundsFunc;

          that.setMap(map);

          that.placesRendered.then(function() {
            that.changeMapBounds();
          });

          (function(dfrd, _dfrd) {
            that.mapRendered.then(function() {
              dsMapFactory.setMarker = setMarkerFunc = setMarkerCurryFunc(that.getMap());
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
          mapSettings: "=",
          originOptions: "=",
          destinationOptions: "="
        },
        restrict: "E",
        replace: true,
        template: "<div></div>",
        require: "^?dsMap",
        link: function(scope, element, attrs, dsMapController) {
          var map = new google.maps.Map(element[0], scope.mapSettings || dsMapController.mapSettings),
            clonedOriginMarkerObject = angular.copy(scope.originOptions || {});
          dsMapController.setMap(map);
          dsMapController.isViewSet = true;
          dsMapController.destinationOptions = angular.copy(scope.destinationOptions || {});
          dsMapController.mapRendered.then(function() {
            clonedOriginMarkerObject.position = dsMapController.getLocation();
            setMarkerFunc(clonedOriginMarkerObject);
          });
        },
        controller: ['$scope', function($scope) {
          var that = this;
          that.originOptions = $scope.originOptions;
          that.destinationOptions = angular.copy($scope.destinationOptions);
        }]
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
          },
          controller: ['$scope', '$element', '$attrs', function($scope, $element, $attr) {
            var that = this;

            function dsMapPlacesDeferredFunc() {
              var _deferred = $q.defer();
              return function() {
                return _deferred;
              };
            }

            function dsMapPlacesLoadedFunc(callback) {
              that.dsMapPlacesDeferred().promise.then(callback);
            }

            that.placesServiceSet = deferred.promise;
            that.dsMapPlacesDeferred = dsMapPlacesDeferredFunc();
            dsMapFactory.dsMapPlacesLoaded = that.dsMapPlacesLoaded = dsMapPlacesLoadedFunc;
          }]
        };
      return obj;
    }])
    .directive('dsGroup', ['dsMapFactory', function(dsMapFactory) {
      var obj = {
        scope: true,
        restrict: "E",
        require: ["^?dsMap", "^?dsMapPlaces"],
        link: function(scope, element, attrs, dsMapControllers) {
          previousGroup = undefined;
          dsMapController = dsMapControllers[0];
          dsMapPlacesController = dsMapControllers[1];

          (function(previousGroup, dsMapController, dsMapPlacesController) {
            var isMapPlacesLoaded = false;

            function onToggleClickFunc(group) {
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
            }

            function toggleGroupVisibilityFunc(group) {
              dsMapPlacesController.dsMapPlacesLoaded(function() {
                isMapPlacesLoaded = true;
              });
              if (isMapPlacesLoaded) {
                onToggleClickFunc(group);
              }
            }

            function setDirectionsToLocationFunc(location, mode) {
              var request = {
                origin: dsMapController.getLocation(),
                destination: location,
                travelMode: google.maps.TravelMode[mode]
              };

              dsMapController.destinationOptions.position = location;

              dsMapPlacesController.dsMapPlacesLoaded(function() {
                dsMapController.hideAllVisibleMarkers();
                dsMapController.directionsDisplay.setMap(dsMapController.getMap());
                dsMapController.directionsService.route(request, function(response, status) {
                  if (status == "OK") {
                    var destinationMarker = setMarkerFunc(dsMapController.destinationOptions);
                    dsMapController.directionsDisplay.setDirections(response);
                    dsMapController.bounds = new google.maps.LatLngBounds();
                    dsMapController.bounds.extend(dsMapController.getLocation());
                    dsMapController.bounds.extend(location);
                    dsMapController.placesGroupHash['searchedLocation'] = [destinationMarker];
                    dsMapController.changeMapBounds();
                  }
                });
              });
            }

            scope.toggleGroupVisibility = toggleGroupVisibilityFunc;

            if (dsMapController.isViewSet) {
              dsMapFactory.setDirectionsToLocation = setDirectionsToLocationFunc;
            }
          })(previousGroup, dsMapController, dsMapPlacesController);
        },
        controller: ['$scope', function($scope) {
          var that = undefined;
          that = this;
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
          require: ["^?dsMap", "^?dsMapPlaces", "^?dsGroup"],
          link: function(scope, element, attrs, dsMapControllers) {
            var dsMapController = dsMapControllers[0],
              dsMapPlacesController = dsMapControllers[1],
              dsGroupController = dsMapControllers[2],
              obj = {
                location: dsMapController.getMap().getCenter(),
                types: []
              },
              showDirectionTimeoutId = undefined;

            function callPlacesServiceFunc(dfrd, _dfrd, type) {
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

                        // @TODO : Increases performance drastically but fails for more than one map
                      }, (dsMapController.placesCount % 10 !== 0 ? 0 : 1000));
                    });
                  });
                });
              });
            }

            function showDirectionFunc() {
              var that = this;
              $timeout.cancel(showDirectionTimeoutId);
              showDirectionTimeoutId = $timeout(function() {
                var request = {
                  origin: dsMapController.getLocation(),
                  destination: that.place.geometry.location,
                  travelMode: google.maps.TravelMode["DRIVING"]
                };

                if (dsGroupController && dsMapController.placesGroupHash[scope.group][0].visible === false) {
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
              callPlacesServiceFunc(deferred, _deferred);
              deferred = _deferred;
            } else if (Object.prototype.toString.call(scope.types) == "[object Object]") {
              for (var _types in scope.types) {
                (function(_deferred) {
                  _deferred = $q.defer();
                  callPlacesServiceFunc(deferred, _deferred, _types);
                  deferred = _deferred;
                })(_deferred);
              }
            } else {
              throw "'types' attribute must be an array or object"
            }

            if (dsMapController.isViewSet) {
              dsMapPlacesController.dsMapPlacesLoaded(function() {
                scope.showDirection = showDirectionFunc;
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
              clonedOptions = angular.copy(scope.options),
              distanceThis = parseFloat(google.maps.geometry.spherical.computeDistanceBetween(dsMapController.getLocation(), placeLocation) / 1000).toFixed(1),
              durationThis = parseInt(distanceThis * 42 / 3.5, 10);

            if (clonedOptions === undefined) {
              clonedOptions = {
                position: placeLocation,
                visible: true
              };
            } else if (Object.prototype.toString.call(clonedOptions) == "[object Object]") {
              clonedOptions.position = placeLocation;
              clonedOptions.visible = clonedOptions.visible === undefined ? true : clonedOptions.visible;
            }

            if (clonedOptions.visible) {
              dsMapController.bounds.extend(placeLocation);
            }

            scope.place.distance = distanceThis;
            scope.place.duration = durationThis;

            dsMapController.mapRendered.then(function() {
              var marker = setMarkerFunc(clonedOptions);
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
