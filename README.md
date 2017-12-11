## This Project is nolonger maintained

# Angular Direction Service
Google Maps direction service for nearby places from a location

## Introduction

Google maps provides services using which one can know what are the nearby places and some other information like distance and time to travel to those nearby places from a particular location and these API's are used in many websites .But to create an entire view and functionality one needs to write code for the same .Since this functionality is increasingly used writing code for this functionality would be like spending time on something which was already developed but not availabe .

Angular Direction Service provides ability to add the Nearby functionality just by adding HTML snippet and very less Javascript.

## Installation

Using bower :

    #install package and add it to bower.json dependencies
    $ bower install angular-direction-service --save
    
## Direction Service Elements

List of directives provided by dsmapservice

  1. **dsMap** (*required*) : Parent directive which controls all the child(below 2-5) directives.
  2. **dsMapView** (*optional* - Only if map is to be shown) : Directive to show map on page which will be linked to places directives(below 3-4).
  3. **dsMapPlaces** (*required*) : Parent directive which controls all places.
  4. **dsGroup** (*requred*) : Directive to handle functionalites for groups.
  5. **dsPlacesType** (*required*) : Directive which shows nearby places based on type/types passed to it.

Of the above metioned directives three directives dsMapView, dsMapPlaces and dsPlacesType also have attributes which is available to customize the map:

##### dsMapView :

  1. map-settings : Configurations for map
  2. origin-options : Configure origin marker
  3. destination-options : Configure destination marker

##### dsMapPlaces :

  1. options : Configure properties like 'preserveViewport', 'suppressMarkers'...

##### dsPlacesType :

  1. group : Specify within which group the marker of the types specified are in
  2. types : Specify type(Array)/types(Object)
  3. options : Configure nearby places marker

Also you need to provide a template which is needed to render each place with id as *"dsMapPlaces.html"*. Example template :

    <script type="text/ng-template" id="dsMapPlaces.html">
      <div>
        <div class="commute__item" ng-repeat="place in Places | limitTo:5" ng-mouseover="showDirection()" ds-each-place>
          <label ng-bind="place.name"></label>
          <span ng-bind="place.distance + ' km'"></span>
          <div><i class="car-icon-grey"></i><span ng-bind="place.duration+ ' min'"></span></div>
        </div>
      </div>
    </script>

## Working example

https://jsfiddle.net/Zword/1gLhjcg6/

## Licence

The MIT License (MIT)

Copyright (c) 2015 Zword

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
