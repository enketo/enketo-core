/**
 * @preserve Copyright 2014 Martijn van de Rijdt
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'jquery', 'enketo-js/Widget', 'text!enketo-config', 'leaflet' ],
    function( $, Widget, configStr, L ) {
        "use strict";

        var pluginName = 'geopicker',
            config = JSON.parse( configStr ),
            defaultZoom = 15,
            // MapBox TileJSON format
            maps = ( config && config.maps && config.maps.length > 0 ) ? config.maps : [ {
                "name": "streets",
                "maxzoom": 24,
                "tiles": [ "http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png" ],
                "attribution": "Tiles courtesy of <a href=\"http://hot.openstreetmap.se/\" target=\"_blank\">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>"
            } ],
            searchSource = "https://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true&key={api_key}",
            iconSingle = L.divIcon( {
                iconSize: 24,
                className: 'enketo-geopoint-marker'
            } ),
            iconMulti = L.divIcon( {
                iconSize: 16,
                className: 'enketo-geopoint-circle-marker'
            } ),
            iconMultiActive = L.divIcon( {
                iconSize: 16,
                className: 'enketo-geopoint-circle-marker-active'
            } );

        /**
         * Geotrace widget Class
         * @constructor
         * @param {Element} element [description]
         * @param {(boolean|{touch: boolean, repeat: boolean})} options options
         * @param {*=} e     event
         */

        function Geopicker( element, options ) {
            var that = this;
            this.namespace = pluginName;
            // call the super class constructor
            Widget.call( this, element, options );

            this._init();
        }

        // copy the prototype functions from the Widget super class
        Geopicker.prototype = Object.create( Widget.prototype );

        // ensure the constructor is the new one
        Geopicker.prototype.constructor = Geopicker;

        /**
         * Initializes the picker
         */
        Geopicker.prototype._init = function() {
            var loadedVal = $( this.element ).val().trim(),
                that = this,
                defaultLatLng = [ 16.8164, -3.0171 ];

            this.mapId = Math.round( Math.random() * 10000000 );
            this.props = this._getProps();

            this._addDomElements();
            this.currentIndex = 0;
            this.points = [];

            this.$question = $( this.element ).closest( '.question' );

            // load default value
            if ( loadedVal ) {
                $( this.element ).val().trim().split( ';' ).forEach( function( el, i ) {
                    // console.debug( 'adding loaded point', el.trim().split( ' ' ) );
                    that.points[ i ] = el.trim().split( ' ' );
                    that.points[ i ].forEach( function( str, i, arr ) {
                        arr[ i ] = Number( str );
                    } );
                } );
            }

            this.$widget.find( 'input:not([name="search"])' ).on( 'change change.bymap change.bysearch', function( event ) {
                var lat = that.$lat.val() ? Number( that.$lat.val() ) : "",
                    lng = that.$lng.val() ? Number( that.$lng.val() ) : "",
                    // we need to avoid a missing alt in case acc is not empty!
                    alt = that.$alt.val() ? Number( that.$alt.val() ) : "",
                    acc = that.$acc.val() ? Number( that.$acc.val() ) : "",
                    latLng = {
                        lat: lat,
                        lng: lng
                    };

                event.stopImmediatePropagation();

                if ( event.namespace !== 'bymap' && event.namespace !== 'bysearch' && that.polyline && that.updatedPolylineWouldIntersect( latLng, that.currentIndex ) ) {
                    that._showIntersectError();
                    that._updateInputs( that.points[ that.currentIndex ], 'nochange' );
                } else {
                    that._editPoint( [ lat, lng, alt, acc ] );

                    if ( event.namespace !== 'bysearch' && that.$search ) {
                        that.$search.val( '' );
                    }
                }
            } );

            this.$points.on( 'click', '.point', function() {
                that._setCurrent( that.$points.find( '.point' ).index( $( this ) ) );
                return false;
            } );

            this.$points.find( '.addpoint' ).on( 'click', function() {
                that._addPoint();
                return false;
            } );

            this.$widget.find( '.close-chain-btn' ).on( 'click', function() {
                that._closePolygon();
                return false;
            } );

            this.$widget.find( '.btn-remove' ).on( 'click', function() {
                if ( that.points.length < 2 ) {
                    that._updateInputs( [] );
                } else if ( window.confirm( 'This will completely remove the current geopoint from the list of geopoints and cannot be undone. Are you sure you want to do this?' ) ) {
                    that._removePoint();
                }
            } );

            this.$map.find( '.show-map-btn' ).on( 'click', function() {
                that.$widget.find( '.search-bar' ).removeClass( 'hide-search' );
                that.$widget.addClass( 'full-screen' );
                that._updateMap();
                return false;
            } );

            // copy hide-input class from question to widget and add show/hide input controller
            this.$widget
                .toggleClass( 'hide-input', this.$question.hasClass( 'or-appearance-hide-input' ) )
                .find( '.toggle-input-btn' ).on( 'click', function() {
                    that.$widget.toggleClass( 'hide-input' );
                    $( this ).toggleClass( 'open', that.$widget.hasClass( 'hide-input' ) );
                    if ( that.map ) {
                        that.map.invalidateSize( false );
                    }
                } ).toggleClass( 'open', that.$widget.hasClass( 'hide-input' ) );

            // hide map controller
            this.$widget.find( '.hide-map-btn' ).on( 'click', function() {
                that.$widget.find( '.search-bar' ).addClass( 'hide-search' );
                that.$widget.removeClass( 'full-screen' ).find( '.map-canvas' ).removeClass( 'leaflet-container' );
                if ( that.map ) {
                    that.map.remove();
                    that.map = null;
                    that.polygon = null;
                    that.polyline = null;
                }
                return false;
            } );

            this.$widget.on( 'focus blur', 'input', function( event ) {
                $( that.element ).trigger( event.type );
            } );

            // enable search
            if ( this.props.search ) {
                this._enableSearch();
            }

            // enable detection
            if ( this.props.detect ) {
                this._enableDetection();
            }

            // creating "point buttons"
            if ( loadedVal ) {
                this.points.forEach( function( el, i ) {
                    that._addPointBtn( i + 1 );
                } );
            } else {
                this._addPoint();
            }

            // setting map location on load
            if ( !loadedVal ) {
                // set worldview in case permissions take too long (e.g. in FF);
                this._updateMap( [ 0, 0 ], 1 );
                if ( this.props.detect ) {
                    navigator.geolocation.getCurrentPosition( function( position ) {
                        that._updateMap( [ position.coords.latitude, position.coords.longitude ], defaultZoom );
                    } );
                }
            } else {
                // center map around first loaded geopoint value
                //this._updateMap( L.latLng( this.points[ 0 ][ 0 ], this.points[ 0 ][ 1 ] ) );
                this._updateMap();
                this._setCurrent( this.currentIndex );
            }
        };

        /**
         * Gets the widget properties and features.
         *
         * @return {{search: boolean, detect: boolean, map: boolean, updateMapFn: string, type: string}} The widget properties object
         */
        Geopicker.prototype._getProps = function() {
            var appearances = [],
                map = this.options.touch !== true || ( this.options.touch === true && $( this.element ).closest( '.or-appearance-maps' ).length > 0 );

            if ( map ) {
                appearances = $( this.element ).closest( '.question' ).attr( 'class' ).split( ' ' )
                    .filter( function( item ) {
                        return item !== 'or-appearance-maps' && /or-appearance-/.test( item );
                    } );
                appearances.forEach( function( appearance, index ) {
                    appearances[ index ] = appearance.substring( 14 );
                } );
            }

            return {
                detect: !!navigator.geolocation,
                map: map,
                search: map,
                appearances: appearances,
                type: this.element.attributes[ 'data-type-xml' ].textContent,
                touch: this.options.touch
            };
        };

        /**
         * Adds a point button in the point navigation bar
         * @param {string} label The label to show on the button.
         */
        Geopicker.prototype._addPointBtn = function( label ) {
            this.$points.find( '.addpoint' ).before( '<a href="#" class="point"> </a>' );
        };

        /**
         * Adds the DOM elements
         */
        Geopicker.prototype._addDomElements = function() {
            var map = '<div class="map-canvas-wrapper"><div class=map-canvas id="map' + this.mapId + '"></div></div>',
                points = '<div class="points"><button type="button" class="addpoint">+</button></div>',
                close = '<button type="button" class="close-chain-btn btn btn-default btn-xs">close polygon</button>',
                mapBtn = '<a href="#" class="show-map-btn btn btn-default">Map</a>';

            this.$widget = $(
                '<div class="geopicker widget">' +
                '<div class="search-bar hide-search no-map no-detect">' +
                '<a href="#" class="hide-map-btn btn btn-default"><span class="glyphicon glyphicon-arrow-left"> </span></a>' +
                '<button name="geodetect" type="button" class="btn btn-default" title="detect current location" data-placement="top">' +
                '<span class="glyphicon glyphicon-screenshot"> </span></button>' +
                '<div class="input-group">' +
                '<input class="geo ignore" name="search" type="text" placeholder="search for place or address" disabled="disabled"/>' +
                '<span class="input-group-btn"><button type="button" class="btn btn-default"><i class="glyphicon glyphicon-search"> </i></button></span>' +
                '</div>' +
                '</div>' +
                '<div class="geo-inputs">' +
                '<label class="geo">latitude (x.y &deg;)<input class="ignore" name="lat" type="number" step="0.0001" min="-90" max="90"/></label>' +
                '<label class="geo">longitude (x.y &deg;)<input class="ignore" name="long" type="number" step="0.0001" min="-180" max="180"/></label>' +
                '<label class="geo">altitude (m)<input class="ignore" name="alt" type="number" step="0.1" /></label>' +
                '<label class="geo">accuracy (m)<input class="ignore" name="acc" type="number" step="0.1" /></label>' +
                '<button type="button" class="btn-remove"><span class="glyphicon glyphicon-trash"> </span></button>' +
                '</div>' +
                '</div>'
            );

            // add the detection button
            if ( this.props.detect ) {
                this.$widget.find( '.search-bar' ).removeClass( 'no-detect' );
                this.$detect = this.$widget.find( 'button[name="geodetect"]' );
            }

            this.$search = this.$widget.find( '[name="search"]' );

            // add the map canvas
            if ( this.props.map ) {
                this.$widget.find( '.search-bar' ).removeClass( 'no-map' ).after( map );
                this.$map = this.$widget.find( '.map-canvas' );
                // add the hide/show inputs button
                this.$map.parent().append( '<button type="button" class="toggle-input-btn"> </button>' );
            } else {
                this.$map = $();
            }

            // touchscreen maps
            if ( this.props.touch && this.props.map ) {
                this.$map.append( mapBtn );
            }

            if ( !this.props.touch ) {
                this.$widget.find( '.search-bar' ).removeClass( 'hide-search' );
            }

            // if points bar is required
            if ( this.props.type !== 'geopoint' ) {
                this.$points = $( points );
                if ( this.props.type === 'geoshape' ) {
                    this.$widget.find( '.geo-inputs' ).append( close );
                }
                this.$widget.prepend( this.$points );
            } else {
                this.$points = $();
            }

            this.$lat = this.$widget.find( '[name="lat"]' );
            this.$lng = this.$widget.find( '[name="long"]' );
            this.$alt = this.$widget.find( '[name="alt"]' );
            this.$acc = this.$widget.find( '[name="acc"]' );


            $( this.element ).hide().after( this.$widget ).parent().addClass( 'clearfix' );
        };

        /**
         * Updates the value in the original input element.
         *
         * @return {Boolean} Whether the value was changed.
         */
        Geopicker.prototype._updateValue = function() {
            var oldGeoTraceValue = $( this.element ).val(),
                newGeoTraceValue = '',
                that = this;

            this._markAsValid();

            // all points should be valid geopoints and only the last item may be empty
            this.points.forEach( function( point, index, array ) {
                var geopoint,
                    lat = typeof point[ 0 ] === 'number' ? point[ 0 ] : ( typeof point.lat === 'number' ? point.lat : null ),
                    lng = typeof point[ 1 ] === 'number' ? point[ 1 ] : ( typeof point.lng === 'number' ? point.lng : null ),
                    alt = typeof point[ 2 ] === 'number' ? point[ 2 ] : 0.0,
                    acc = typeof point[ 3 ] === 'number' ? point[ 3 ] : 0.0;

                geopoint = ( lat && lng ) ? lat + ' ' + lng + ' ' + alt + ' ' + acc : "";

                //only last item may be empty
                if ( !that._isValidGeopoint( geopoint ) && !( geopoint === '' && index === array.length - 1 ) ) {
                    that._markAsInvalid( index );
                }
                //newGeoTraceValue += geopoint;
                if ( !( geopoint === '' && index === array.length - 1 ) ) {
                    newGeoTraceValue += geopoint;
                    if ( index !== array.length - 1 ) {
                        newGeoTraceValue += ';';
                    }
                } else {
                    // remove trailing semi-colon
                    newGeoTraceValue = newGeoTraceValue.substring( 0, newGeoTraceValue.lastIndexOf( ';' ) );
                }
            } );

            console.log( 'updating value by joining', this.points, 'old value', oldGeoTraceValue, 'new value', newGeoTraceValue );

            if ( oldGeoTraceValue !== newGeoTraceValue ) {
                $( this.element ).val( newGeoTraceValue ).trigger( 'change' );
                return true;
            } else {
                return false;
            }
        };

        /**
         * Checks an Openrosa geopoint for validity. This function is used to provide more detailed
         * error feedback than provided by the form controller. This can be used to pinpoint the exact
         * invalid geopoints in a list of geopoint (the form controller only validates the total list).
         *
         * @param  {string}  geopoint [description]
         * @return {Boolean}          [description]
         */
        Geopicker.prototype._isValidGeopoint = function( geopoint ) {
            var coords;

            if ( !geopoint ) {
                return false;
            }

            coords = geopoint.toString().split( ' ' );
            return (
                ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                ( coords[ 1 ] !== '' && coords[ 1 ] >= -180 && coords[ 1 ] <= 180 ) &&
                ( typeof coords[ 2 ] == 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                ( typeof coords[ 3 ] == 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) )
            );
        };

        /**
         * Validates a list of latLng Arrays or Objects
         * @param  {Array.((Array.<number|string>|{lat: number, long:number}))}  latLngs Array of latLng objects or arrays
         * @return {Boolean}         Whether list is valid or not
         */
        Geopicker.prototype._isValidLatLngList = function( latLngs ) {
            var that = this;

            return latLngs.every( function( latLng, index, array ) {
                return that._isValidLatLng( latLng ) || ( latLng.join() === '' && index === array.length - 1 );
            } );
        };

        /**
         * Validates an individual latlng Array or Object
         * @param  {(Array.<number|string>|{lat: number, long:number})}  latLng latLng object or array
         * @return {Boolean}        Whether latLng is valid or not
         */
        Geopicker.prototype._isValidLatLng = function( latLng ) {
            console.log( 'checking validity of latLng', latLng );
            var lat, lng;

            lat = ( typeof latLng[ 0 ] === 'number' ) ? latLng[ 0 ] : ( typeof latLng.lat === 'number' ) ? latLng.lat : null;
            lng = ( typeof latLng[ 1 ] === 'number' ) ? latLng[ 1 ] : ( typeof latLng.lng === 'number' ) ? latLng.lng : null;

            return ( lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 );
        };

        /**
         * Marks a point as invalid in the points navigation bar
         * @param  {number} index Index of point
         */
        Geopicker.prototype._markAsInvalid = function( index ) {
            this.$points.find( '.point' ).eq( index ).addClass( 'has-error' );
        };

        /**
         * Marks all points as valid in the points navigation bar
         */
        Geopicker.prototype._markAsValid = function() {
            this.$points.find( '.point' ).removeClass( 'has-error' );
        };

        /**
         * Changes the current point in the list of points
         */
        Geopicker.prototype._setCurrent = function( index ) {
            this.currentIndex = index;
            this.$points.find( '.point' ).removeClass( 'active' ).eq( index ).addClass( 'active' );
            this._updateInputs( this.points[ index ], '' );
            // make sure that the current marker is marked as active
            if ( !this.props.touch || this._inFullScreenMode() ) {
                this._updateMarkers();
            }
            // console.debug( 'set current index to ', this.currentIndex );
        };

        /**
         * Enables geo detection using the built-in browser geoLocation functionality
         */
        Geopicker.prototype._enableDetection = function() {
            var that = this,
                options = {
                    enableHighAccuracy: true
                };
            this.$detect.click( function( event ) {
                event.preventDefault();
                navigator.geolocation.getCurrentPosition( function( position ) {
                    var latLng = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    if ( that.polyline && that.updatedPolylineWouldIntersect( latLng, that.currentIndex ) ) {
                        that._showIntersectError();
                    } else {
                        //that.points[that.currentIndex] = [ position.coords.latitude, position.coords.longitude ];
                        //that._updateMap( );
                        that._updateInputs( [ position.coords.latitude, position.coords.longitude, position.coords.altitude, position.coords.accuracy ] );
                        // if current index is last of points, automatically create next point
                        if ( that.currentIndex === that.points.length - 1 && that.props.type !== 'geopoint' ) {
                            that._addPoint();
                        }
                    }
                }, function() {
                    console.error( 'error occurred trying to obtain position' );
                }, options );
                return false;
            } );
        };

        /**
         * Enables search functionality using the Google Maps API v3
         * This only changes the map view. It does not record geopoints.
         */
        Geopicker.prototype._enableSearch = function() {
            var that = this;

            if ( config[ 'google_api_key' ] ) {
                searchSource = searchSource.replace( '{api_key}', config[ 'google_api_key' ] );
            } else {
                searchSource = searchSource.replace( '&key={api_key}', '' );
            }

            this.$search
                .prop( 'disabled', false )
                .on( 'change', function( event ) {
                    var address = $( this ).val();
                    event.stopImmediatePropagation();

                    if ( address ) {
                        address = address.split( /\s+/ ).join( '+' );
                        $.get( searchSource.replace( '{address}', address ), function( response ) {
                            var latLng;
                            if ( response.results && response.results.length > 0 && response.results[ 0 ].geometry && response.results[ 0 ].geometry.location ) {
                                latLng = response.results[ 0 ].geometry.location;
                                that._updateMap( [ latLng.lat, latLng.lng ], defaultZoom );
                                that.$search.closest( '.input-group' ).removeClass( 'has-error' );
                            } else {
                                //TODO: add error message
                                that.$search.closest( '.input-group' ).addClass( 'has-error' );
                                console.log( "Location '" + address + "' not found" );
                            }
                        }, 'json' )
                            .fail( function() {
                                //TODO: add error message
                                that.$search.closest( '.input-group' ).addClass( 'has-error' );
                                console.log( "Error. Geocoding service may not be available or app is offline" );
                            } )
                            .always( function() {

                            } );
                    } else {

                    }
                } );
        };

        /**
         * Determines whether map is available for manipulation.
         */
        Geopicker.prototype._dynamicMapAvailable = function() {
            return !!this.map;
        };

        Geopicker.prototype._inFullScreenMode = function() {
            return this.$widget.hasClass( 'full-screen' );
        };

        /**
         * Calls the appropriate map update function.
         *
         * @param  @param  {Array.<number>|{lat: number, lng: number}} latLng  latitude and longitude coordinates
         * @param  {number=} zoom zoom level
         * @return {Function} Returns call to function
         */
        Geopicker.prototype._updateMap = function( latLng, zoom ) {

            if ( !this.props.map ) {
                return;
            }

            if ( !zoom ) {
                if ( this.map ) {
                    // note: there are conditions where getZoom returns undefined!
                    zoom = this.map.getZoom() || defaultZoom;
                } else {
                    zoom = defaultZoom;
                }
            }

            // serves to remember last requested map coordinates to initialize map in mobile view
            if ( latLng ) {
                this.lastLatLng = latLng;
                this.lastZoom = zoom;
            }
            // console.debug( 'stored lastLatLng', this.lastLatLng, this.lastZoom );

            if ( !this.props.touch || this._inFullScreenMode() ) {
                this._updateDynamicMap( latLng, zoom );
            }
        };

        /**
         * Updates the dynamic map to either show the provided coordinates (in the center), with the provided zoom level
         * or updates any markers, polylines, polygons
         *
         * @param  {Array.<number>|{lat: number, lng: number}} latLng  latitude and longitude coordinates
         * @param  {number} zoom zoom
         */
        Geopicker.prototype._updateDynamicMap = function( latLng, zoom ) {
            var z, layers, options, baseMaps,
                that = this;

            // console.debug( 'dynamic map to be updated with latLng', latLng );
            if ( !this.map ) {
                layers = this._getLayers();
                options = {
                    layers: this._getDefaultLayer( layers )
                };

                // console.log( 'no map yet, creating it' );
                this.map = L.map( 'map' + this.mapId, options )
                    .on( 'click', function( e ) {
                        var latLng = e.latlng;
                        if ( that.polyline && that.updatedPolylineWouldIntersect( latLng, that.currentIndex + 1 ) ) {
                            that._showIntersectError();
                        } else {
                            // do nothing if the field has a current marker
                            // instead the user will have to drag to change it by map
                            if ( !that.$lat.val() || !that.$lng.val() || that.props.type === 'geopoint' ) {
                                that._updateInputs( latLng, 'change.bymap' );
                            } else if ( that.$lat.val() && that.$lng.val() && that.props.type !== 'geopoint' ) {
                                that._addPoint();
                                that._updateInputs( latLng, 'change.bymap' );
                            }
                        }
                    } );

                // watch out, default "Leaflet" link clicks away from page, loosing all data
                this.map.attributionControl.setPrefix( '' );

                // add layer control
                if ( layers.length > 1 ) {
                    L.control.layers( this._getBaseLayers( layers ), null ).addTo( this.map );
                }

                // change default leaflet layer control button
                that.$widget.find( '.leaflet-control-layers-toggle' ).append( '<span class="glyphicon glyphicon-globe"></span>' );

                // Add ignore and option-label class to Leaflet-added input elements and their labels
                // something weird seems to happen. It seems the layercontrol is added twice (second replacing first) 
                // which means the classes are not present in the final control. 
                // Using the baselayerchange event handler is a trick that seems to work.
                this.map.on( 'baselayerchange', function() {
                    that.$widget.find( '.leaflet-control-container input' ).addClass( 'ignore no-unselect' ).next( 'span' ).addClass( 'option-label' );
                } );

            }

            if ( !latLng ) {
                this._updatePolyline();
                this._updateMarkers();
                if ( this.points.length === 1 && this.points[ 0 ].toString() === '' ) {
                    if ( this.lastLatLng ) {
                        this.map.setView( this.lastLatLng, this.lastZoom || defaultZoom );
                    } else {
                        this.map.setView( L.latLng( 0, 0 ), zoom || defaultZoom );
                    }
                }
            } else {
                this.map.setView( latLng, zoom || defaultZoom );
            }
        };

        Geopicker.prototype._showIntersectError = function() {
            //this.$map.find( '.intersect-error' ).remove().end().append( '<div class="intersect-error">Cannot intersect border<div>' );
            alert( 'Borders cannot intersect!' );
        };

        Geopicker.prototype._getLayers = function() {
            var url,
                iterator = 1,
                layers = [];

            maps.forEach( function( map ) {
                // randomly pick a tile source from the array and store it in the maps config
                // so it will be re-used when the form is reset or multiple geo widgets are created
                map.tileIndex = ( map.tileIndex !== 'undefined' ) ? Math.round( Math.random() * 100 ) % map.tiles.length : map.tileIndex;
                url = map.tiles[ map.tileIndex ];
                layers.push( L.tileLayer( url, {
                    id: map.id || name,
                    maxZoom: map.maxzoom || 18,
                    minZoom: map.minzoom || 0,
                    name: map.name || 'map-' + iterator++,
                    attribution: map.attribution || ''
                } ) );
            } );

            return layers;
        };

        Geopicker.prototype._getDefaultLayer = function( layers ) {
            var defaultLayer,
                that = this;

            layers.reverse().some( function( layer ) {
                defaultLayer = layer;
                return that.props.appearances.some( function( appearance ) {
                    return appearance === layer.options.name;
                } );
            } );

            return defaultLayer;
        };

        Geopicker.prototype._getBaseLayers = function( layers ) {
            var baseLayers = {};

            layers.forEach( function( layer ) {
                baseLayers[ layer.options.name ] = layer;
            } );

            return baseLayers;
        };

        /**
         * Updates the markers on the dynamic map from the current list of points.
         */
        Geopicker.prototype._updateMarkers = function() {
            var coords = [],
                markers = [],
                that = this;

            // console.debug( 'updating markers', this.points );

            if ( this.markerLayer ) {
                this.markerLayer.clearLayers();
            }

            if ( this.points.length < 2 && this.points[ 0 ].join() === '' ) {
                return;
            }

            this.points.forEach( function( latLng, index ) {
                var icon = that.props.type === 'geopoint' ? iconSingle : ( index === that.currentIndex ? iconMultiActive : iconMulti );
                if ( that._isValidLatLng( latLng ) ) {
                    coords.push( latLng );
                    markers.push( L.marker( latLng, {
                        icon: icon,
                        clickable: true,
                        draggable: true,
                        alt: index,
                        opacity: 0.9
                    } ).on( 'click', function( e ) {
                        if ( e.target.options.alt === 0 && that.props.type === 'geoshape' ) {
                            that._closePolygon();
                        } else {
                            that._setCurrent( e.target.options.alt );
                        }
                    } ).on( 'dragend', function( e ) {
                        var latLng = e.target.getLatLng(),
                            index = e.target.options.alt;
                        if ( that.polyline && that.updatedPolylineWouldIntersect( latLng, index ) ) {
                            that._showIntersectError();
                            that._updateMarkers();
                        } else {
                            // first set the current index the point dragged
                            that._setCurrent( index );
                            that._updateInputs( latLng, 'change.bymap' );
                            that._updateMap();
                        }
                    } ) );
                } else {
                    console.log( 'this latLng was not considered valid', latLng );
                }
            } );

            // console.log( 'markers to update', markers );

            if ( markers.length > 0 ) {
                this.markerLayer = L.layerGroup( markers ).addTo( this.map );
                // change the view to fit all the markers
                // don't use this for multiple markers, it messed up map clicks to place points
                if ( this.points.length === 1 || !this._isValidLatLngList( this.points ) ) {
                    // center the map, keep zoom level unchanged
                    this.map.setView( coords[ 0 ], this.lastZoom || defaultZoom );
                }
            }
        };

        /**
         * Updates the polyline on the dynamic map from the current list of points
         */
        Geopicker.prototype._updatePolyline = function() {
            var polylinePoints;

            if ( this.props.type === 'geopoint' ) {
                return;
            }

            // console.log( 'updating polyline' );
            if ( this.points.length < 2 || !this._isValidLatLngList( this.points ) ) {
                // remove quirky line remainder
                if ( this.map ) {
                    if ( this.polyline ) {
                        this.map.removeLayer( this.polyline );
                    }
                    if ( this.polygon ) {
                        this.map.removeLayer( this.polygon );
                    }
                }
                this.polyline = null;
                this.polygon = null;
                // console.log( 'list of points invalid' );
                return;
            }

            if ( this.props.type === 'geoshape' ) {
                this._updatePolygon();
            }

            polylinePoints = ( this.points[ this.points.length - 1 ].join( '' ) !== '' ) ? this.points : this.points.slice( 0, this.points.length - 1 );

            if ( !this.polyline ) {
                this.polyline = L.polyline( polylinePoints, {
                    color: 'red'
                } );
                this.map.addLayer( this.polyline );
            } else {
                this.polyline.setLatLngs( polylinePoints );
            }

            this.map.fitBounds( this.polyline.getBounds() );
        };


        /**
         * Updates the polygon on the dynamic map from the current list of points.
         * A polygon is a type of polyline. This function is ALWAYS called by _updatePolyline.
         */
        Geopicker.prototype._updatePolygon = function() {
            var polygonPoints;

            if ( this.props.type === 'geopoint' || this.props.type === 'geotrace' ) {
                return;
            }

            // console.log( 'updating polygon' );
            polygonPoints = ( this.points[ this.points.length - 1 ].join( '' ) !== '' ) ? this.points : this.points.slice( 0, this.points.length - 1 );

            if ( !this.polygon ) {
                // console.log( 'creating new polygon' );
                this.polygon = L.polygon( polygonPoints, {
                    color: 'red',
                    stroke: false
                } );
                this.map.addLayer( this.polygon );
            } else {
                // console.log( 'updating existing polygon', this.points );
                this.polygon.setLatLngs( polygonPoints );
            }

            this._updateArea( polygonPoints );
        };

        Geopicker.prototype._updateArea = function( points ) {
            var area, readableArea;

            if ( points.length > 2 ) {
                area = L.GeometryUtil.geodesicArea( points );
                readableArea = L.GeometryUtil.readableArea( area );

                L.popup( {
                    className: 'enketo-area-popup'
                } )
                    .setLatLng( this.polygon.getBounds().getCenter() )
                    .setContent( readableArea )
                    .openOn( this.map );
            } else {
                this.map.closePopup();
            }

        };

        Geopicker.prototype._addPoint = function() {
            this._addPointBtn( this.points.length + 1 );
            this.points.push( [] );
            this._setCurrent( this.points.length - 1 );
            this._updateValue();
        };

        /**
         * Edits a point in the list of points
         * @param  {Array.<number>|{lat: number, lng: number, alt: number, acc: number}} latLng LatLng object or array
         * @return {Boolean]}        Whether point changed.
         */
        Geopicker.prototype._editPoint = function( latLng ) {
            var changed,
                oldVal = this.points[ this.currentIndex ];

            this.points[ this.currentIndex ] = latLng;

            changed = this._updateValue();

            if ( changed ) {
                this._updateMap();
            }
            return changed;
        };

        /**
         * Removes the current point
         */
        Geopicker.prototype._removePoint = function() {
            var newIndex = this.currentIndex;
            this.points.splice( this.currentIndex, 1 );
            this._updateValue();
            this.$points.find( '.point' ).eq( this.currentIndex ).remove();
            if ( typeof this.points[ this.currentIndex ] === 'undefined' ) {
                newIndex = this.currentIndex - 1;
            }
            this._setCurrent( newIndex );
            // this will call updateMarkers for the second time which is not so efficient
            this._updateMap();
        };

        Geopicker.prototype._closePolygon = function() {
            var lastPoint = this.points[ this.points.length - 1 ];
            // console.debug( 'closing polygon' );

            // check if chain can be closed
            if ( this.points.length < 3 || ( this.points.length === 3 && !this._isValidLatLng( this.points[ 2 ] ) ) || ( JSON.stringify( this.points[ 0 ] ) === JSON.stringify( lastPoint ) ) ) {
                return;
            }

            // determine which point the make the closing point
            // if the last point is not a valid point, assume the user wants to use this to close
            // otherwise create a new point.
            if ( !this._isValidLatLng( lastPoint ) ) {
                console.log( 'current last point is not a valid point, so will use this as closing point' );
                this.currentIndex = this.points.length - 1;
            } else {
                console.log( 'current last point is valid, so will create a new one to use to close' );
                this._addPoint();
            }

            this._updateInputs( this.points[ 0 ] );
        };

        /**
         * Updates the (fake) input element for latitude, longitude, altitude and accuracy
         *
         * @param  @param  {Array.<number>|{lat: number, lng: number, alt: number, acc: number}} coords latitude, longitude, altitude and accuracy
         * @param  {string=} ev  [description]
         */
        Geopicker.prototype._updateInputs = function( coords, ev ) {
            var lat = coords[ 0 ] || coords.lat || '',
                lng = coords[ 1 ] || coords.lng || '',
                alt = coords[ 2 ] || coords.alt || '',
                acc = coords[ 3 ] || coords.acc || '';

            ev = ( typeof ev !== 'undefined' ) ? ev : 'change';

            this.$lat.val( Math.round( lat * 10000 ) / 10000 || '' );
            this.$lng.val( Math.round( lng * 10000 ) / 10000 || '' );
            this.$alt.val( Math.round( alt * 10 ) / 10 || '' );
            this.$acc.val( Math.round( acc * 10 ) / 10 || '' ).trigger( ev );
        };

        /**
         * Disables the widget
         */
        Geopicker.prototype.disable = function() {
            this.$map.hide();
            this.$widget.find( '.btn' ).addClass( 'disabled' );
        };

        /**
         * Enables a disabled widget
         */
        Geopicker.prototype.enable = function() {
            this.$map.show();
            this.$widget.find( '.btn' ).removeClass( 'disabled' );
        };

        /**
         * Check if a polyline created from the current collection of points
         * where one point is added or edited would have intersections.
         * @param  {[type]} latLng [description]
         * @param  {[type]} index  [description]
         * @return {[type]} [description]
         */
        Geopicker.prototype.updatedPolylineWouldIntersect = function( latLng, index ) {
            var pointsToTest = [],
                polylinePoints, polylineToTest, intersects;

            if ( this.points < 3 ) {
                return false;
            }

            // create a deep copy of the current points
            $.extend( true, pointsToTest, this.points );

            // edit/add one point
            pointsToTest[ index ] = [ latLng[ 0 ] || latLng.lat, latLng[ 1 ] || latLng.lng ];

            // check whether last point is empty and remove it if so
            polylinePoints = ( pointsToTest[ pointsToTest.length - 1 ].join( '' ) !== '' ) ? pointsToTest : pointsToTest.slice( 0, pointsToTest.length - 1 );

            // remove last one if closed
            // This introduces a bug as it enables creating a spiral that is closed
            // with an intersection.
            if ( polylinePoints[ 0 ][ 0 ] === polylinePoints[ polylinePoints.length - 1 ][ 0 ] &&
                polylinePoints[ 0 ][ 1 ] === polylinePoints[ polylinePoints.length - 1 ][ 1 ] ) {
                polylinePoints = polylinePoints.slice( 0, polylinePoints.length - 1 );
            }

            // create polyline
            polylineToTest = L.polyline( polylinePoints, {
                color: 'white'
            } );

            // add to map because the Polyline draw extension expects this
            this.map.addLayer( polylineToTest );

            // check for intersection
            intersects = polylineToTest.intersects();

            // clean up
            this.map.removeLayer( polylineToTest );

            return intersects;
        };

        // extend Leaflet
        // From https://github.com/Leaflet/Leaflet.draw/blob/master/src/ext/GeometryUtil.js
        L.GeometryUtil = L.extend( L.GeometryUtil || {}, {
            // Ported from the OpenLayers implementation. See https://github.com/openlayers/openlayers/blob/master/lib/OpenLayers/Geometry/LinearRing.js#L270
            geodesicArea: function( latLngs ) {
                var EARTH_RADIUS = 6378100,
                    pointsCount = latLngs.length,
                    area = 0.0,
                    d2r = L.LatLng.DEG_TO_RAD, // Math.PI / 180
                    p1, p2;

                if ( pointsCount > 2 ) {
                    for ( var i = 0; i < pointsCount; i++ ) {
                        p1 = {
                            lat: latLngs[ i ][ 0 ],
                            lng: latLngs[ i ][ 1 ]
                        };
                        p2 = {
                            lat: latLngs[ ( i + 1 ) % pointsCount ][ 0 ],
                            lng: latLngs[ ( i + 1 ) % pointsCount ][ 1 ]
                        };

                        area += ( ( p2.lng - p1.lng ) * d2r ) *
                            ( 2 + Math.sin( p1.lat * d2r ) + Math.sin( p2.lat * d2r ) );
                    }
                    area = area * EARTH_RADIUS * EARTH_RADIUS / 2.0;
                }

                return Math.abs( area );
            },

            readableArea: function( area ) {
                var areaStr;

                if ( area >= 10000 ) {
                    areaStr = ( area * 0.0001 ).toFixed( 2 ) + ' ha';
                } else {
                    areaStr = area.toFixed( 2 ) + ' m&sup2;';
                }

                return areaStr;
            }
        } );
        // From  https://github.com/Leaflet/Leaflet.draw/blob/master/src/ext/Polyline.Intersect.js
        L.Polyline.include( {
            // Check to see if this polyline has any linesegments that intersect.
            // NOTE: does not support detecting intersection for degenerate cases.
            intersects: function() {
                var points = this._originalPoints,
                    len = points ? points.length : 0,
                    i, p, p1;

                if ( this._tooFewPointsForIntersection() ) {
                    return false;
                }

                for ( i = len - 1; i >= 3; i-- ) {
                    p = points[ i - 1 ];
                    p1 = points[ i ];


                    if ( this._lineSegmentsIntersectsRange( p, p1, i - 2 ) ) {
                        return true;
                    }
                }
                return false;
            },

            // Check for intersection if new latlng was added to this polyline.
            // NOTE: does not support detecting intersection for degenerate cases.
            newLatLngIntersects: function( latlng, skipFirst ) {
                // Cannot check a polyline for intersecting lats/lngs when not added to the map
                if ( !this._map ) {
                    return false;
                }

                return this.newPointIntersects( this._map.latLngToLayerPoint( latlng ), skipFirst );
            },

            // Check for intersection if new point was added to this polyline.
            // newPoint must be a layer point.
            // NOTE: does not support detecting intersection for degenerate cases.
            newPointIntersects: function( newPoint, skipFirst ) {
                var points = this._originalPoints,
                    len = points ? points.length : 0,
                    lastPoint = points ? points[ len - 1 ] : null,
                    // The previous previous line segment. Previous line segment doesn't need testing.
                    maxIndex = len - 2;

                if ( this._tooFewPointsForIntersection( 1 ) ) {
                    return false;
                }

                return this._lineSegmentsIntersectsRange( lastPoint, newPoint, maxIndex, skipFirst ? 1 : 0 );
            },

            // Polylines with 2 sides can only intersect in cases where points are collinear (we don't support detecting these).
            // Cannot have intersection when < 3 line segments (< 4 points)
            _tooFewPointsForIntersection: function( extraPoints ) {
                var points = this._originalPoints,
                    len = points ? points.length : 0;
                // Increment length by extraPoints if present
                len += extraPoints || 0;

                return !this._originalPoints || len <= 3;
            },

            // Checks a line segment intersections with any line segments before its predecessor.
            // Don't need to check the predecessor as will never intersect.
            _lineSegmentsIntersectsRange: function( p, p1, maxIndex, minIndex ) {
                var points = this._originalPoints,
                    p2, p3;

                minIndex = minIndex || 0;

                // Check all previous line segments (beside the immediately previous) for intersections
                for ( var j = maxIndex; j > minIndex; j-- ) {
                    p2 = points[ j - 1 ];
                    p3 = points[ j ];

                    if ( L.LineUtil.segmentsIntersect( p, p1, p2, p3 ) ) {
                        // console.debug( 'intersection found between', p, p1, p2, p3 );
                        return true;
                    }
                }

                return false;
            }
        } );
        L.Util.extend( L.LineUtil, {
            // Checks to see if two line segments intersect. Does not handle degenerate cases.
            // http://compgeom.cs.uiuc.edu/~jeffe/teaching/373/notes/x06-sweepline.pdf
            segmentsIntersect: function( /*Point*/ p, /*Point*/ p1, /*Point*/ p2, /*Point*/ p3 ) {
                return this._checkCounterclockwise( p, p2, p3 ) !==
                    this._checkCounterclockwise( p1, p2, p3 ) &&
                    this._checkCounterclockwise( p, p1, p2 ) !==
                    this._checkCounterclockwise( p, p1, p3 );
            },

            // check to see if points are in counterclockwise order
            _checkCounterclockwise: function( /*Point*/ p, /*Point*/ p1, /*Point*/ p2 ) {
                return ( p2.y - p.y ) * ( p1.x - p.x ) > ( p1.y - p.y ) * ( p2.x - p.x );
            }
        } );

        $.fn[ pluginName ] = function( options, event ) {

            return this.each( function() {
                var $this = $( this ),
                    data = $( this ).data( pluginName );

                options = options || {};

                if ( !data && typeof options === 'object' ) {
                    $this.data( pluginName, ( data = new Geopicker( this, options, event ) ) );
                } else if ( data && typeof options == 'string' ) {
                    //pass the context, used for destroy() as this method is called on a cloned widget
                    data[ options ]( this );
                }
            } );
        };

    } );
