/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
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

define( [ 'jquery', 'gmapsDone', 'js/Widget' ], function( $, gmapsDone, Widget ) {
    "use strict";

    var pluginName = 'geopointpicker';

    /**
     * Geopoint widget Class
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Geopointpicker( element, options ) {
        //call the super class constructor
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Geopointpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Geopointpicker.prototype.constructor = Geopointpicker;

    Geopointpicker.prototype._init = function() {
        var that = this,
            inputVals;

        this._addDomElements();

        inputVals = this.$inputOrigin.val().split( ' ' );
        this.updateMapFn = "_updateDynamicMap";

        this.$widget.find( 'input:not([name="search"])' ).on( 'change change.bymap change.bysearch', function( event ) {
            var lat = ( that.$lat.val() !== '' ) ? that.$lat.val() : 0.0,
                lng = ( that.$lng.val() !== '' ) ? that.$lng.val() : 0.0,
                alt = ( that.$alt.val() !== '' ) ? that.$alt.val() : 0.0,
                acc = that.$acc.val(),
                value = ( lat === 0 && lng === 0 ) ? '' : lat + ' ' + lng + ' ' + alt + ' ' + acc;

            event.stopImmediatePropagation();

            that.$inputOrigin.val( value ).trigger( 'change' );

            if ( event.namespace !== 'bymap' && event.namespace !== 'bysearch' ) {
                that._updateMap( lat, lng );
            }

            if ( event.namespace !== 'bysearch' && this.$search ) {
                that.$search.val( '' );
            }
        } );

        this.$widget.on( 'focus blur', 'input', function( event ) {
            that.$inputOrigin.trigger( event.type );
        } );

        if ( inputVals[ 3 ] ) {
            this.$acc.val( inputVals[ 3 ] );
        }
        if ( inputVals[ 2 ] ) {
            this.$alt.val( inputVals[ 2 ] );
        }
        if ( inputVals[ 1 ] ) {
            this.$lng.val( inputVals[ 1 ] );
        }
        if ( inputVals[ 0 ].length > 0 ) {
            this.$lat.val( inputVals[ 0 ] ).trigger( 'change' );
        }

        if ( this.$detect ) {
            this._enableDetection();
        }

        if ( !this.options.touch ) {
            gmapsDone( function() {
                if ( that._dynamicMapAvailable() ) {
                    that._updateMap( 0, 0, 1 );
                    if ( that.$search ) {
                        that._enableSearch();
                    }
                }
            } );
        } else if ( this.$map ) {
            this._updateMapFn = "_updateStaticMap";
            this._updateMap( 0, 0, 1 );
            $( window ).on( 'resize', function() {
                var resizeCount = $( window ).data( 'resizecount' ) || 0;
                resizeCount++;
                $( window ).data( 'resizecount', resizeCount );
                window.setTimeout( function() {
                    if ( resizeCount == $( window ).data( 'resizecount' ) ) {
                        $( window ).data( 'resizecount', 0 );
                        //do all the things when resizing stops
                        that._updateMap();
                    }
                }, 500 );
            } );
        }
    };

    Geopointpicker.prototype._addDomElements = function() {
        var detect =
            '<button name="geodetect" type="button" class="btn" title="detect current location" data-placement="top">' +
            '<i class="icon-crosshairs"></i></button>',
            search =
                '<div class="input-append">' +
                '<input class="geo ignore" name="search" type="text" placeholder="search for place or address" disabled="disabled"/>' +
                '<button type="button" class="btn add-on"><i class="icon-search"></i>' +
                '</div>',
            map = '<div class="map-canvas-wrapper"><div class="map-canvas"></div></div>';

        this.$inputOrigin = $( this.element );
        this.$form = this.$inputOrigin.closest( 'form' );
        this.$widget = $(
            '<div class="geopoint widget">' +
            '<div class="search-bar no-search-input no-map"></div>' +
            '<div class="geo-inputs">' +
            '<label class="geo">latitude (x.y &deg;)<input class="ignore" name="lat" type="number" step="0.0001" /></label>' +
            '<label class="geo">longitude (x.y &deg;)<input class="ignore" name="long" type="number" step="0.0001" /></label>' +
            '<label class="geo"><input class="ignore" name="alt" type="number" step="0.1" />altitude (m)</label>' +
            '<label class="geo"><input class="ignore" name="acc" type="number" step="0.1" />accuracy (m)</label>' +
            '</div>' +
            '</div>'
        );

        //if geodetection is supported, add the button
        if ( navigator.geolocation ) {
            this.$widget.find( '.search-bar' ).append( detect );
            this.$detect = this.$widget.find( 'button[name="geodetect"]' );
        }
        //if not on a mobile device, add the search field
        if ( this.options.touch !== true ) {
            this.$widget.find( '.search-bar' ).removeClass( 'no-search-input' ).append( search );
            this.$search = this.$widget.find( '[name="search"]' );
        }
        //if not on a mobile device or specifically requested, add the map canvas
        if ( this.options.touch !== true || ( this.options.touch === true && this.$inputOrigin.parents( '.or-appearance-maps' ).length > 0 ) ) {
            this.$widget.find( '.search-bar' ).removeClass( 'no-map' ).after( map );
            this.$map = this.$widget.find( '.map-canvas' );
        }

        this.$lat = this.$widget.find( '[name="lat"]' );
        this.$lng = this.$widget.find( '[name="long"]' );
        this.$alt = this.$widget.find( '[name="alt"]' );
        this.$acc = this.$widget.find( '[name="acc"]' );

        this.$inputOrigin.hide().after( this.$widget ).parent().addClass( 'clearfix' );
    };

    /**
     * Enables geo detection using the built-in browser geoLocation functionality
     */
    Geopointpicker.prototype._enableDetection = function() {
        var that = this;
        this.$detect.click( function( event ) {
            event.preventDefault();
            navigator.geolocation.getCurrentPosition( function( position ) {
                that._updateMap( position.coords.latitude, position.coords.longitude );
                that._updateInputs( position.coords.latitude, position.coords.longitude, position.coords.altitude, position.coords.accuracy );
            } );
            return false;
        } );
    };

    /**
     * Enables search functionality using the Google Maps API v3
     */
    Geopointpicker.prototype._enableSearch = function() {
        var geocoder = new google.maps.Geocoder(),
            that = this;
        this.$search.prop( 'disabled', false );
        this.$search.on( 'change', function( event ) {
            event.stopImmediatePropagation();
            //console.debug('search field click event');
            var address = $( this ).val();
            if ( typeof geocoder !== 'undefined' ) {
                geocoder.geocode( {
                        'address': address,
                        'bounds': that.map.getBounds()
                    },
                    function( results, status ) {
                        if ( status == google.maps.GeocoderStatus.OK ) {
                            that.$search.attr( 'placeholder', 'search' );
                            var loc = results[ 0 ].geometry.location;
                            //console.log(loc);
                            that._updateMap( loc.lat(), loc.lng() );
                            that._updateInputs( loc.lat(), loc.lng(), null, null, 'change.bysearch' );
                        } else {
                            that.$search.val( '' );
                            that.$search.attr( 'placeholder', address + ' not found, try something else.' );
                        }
                    }
                );
            }
            return false;
        } );
    };

    /**
     * Whether google maps are available (whether scripts have loaded).
     */
    Geopointpicker.prototype._dynamicMapAvailable = function() {
        return ( this.$map && typeof google !== 'undefined' && typeof google.maps !== 'undefined' );
    };

    /**
     * Calls the appropriate map update function.
     *
     * @param  {number=} lat  latitude
     * @param  {number=} lng  longitude
     * @param  {number=} zoom zoom level which defaults to 15
     */
    Geopointpicker.prototype._updateMap = function( lat, lng, zoom ) {
        if ( !this.$map ) {
            return;
        }
        lat = lat || Number( this.$lat.val() );
        lng = lng || Number( this.$lng.val() );
        zoom = zoom || 15;
        if ( lat === 0 && lng === 0 ) zoom = 1;
        return this[ this.updateMapFn ]( lat, lng, zoom );
    };

    /**
     * Loads a static map with placemarker. Does not use Google Maps v3 API (uses Static Maps API instead)
     *
     * @param  {number} lat  latitude
     * @param  {number} lng  longitude
     * @param  {number} zoom default zoom level is 15
     */
    Geopointpicker.prototype._updateStaticMap = function( lat, lng, zoom ) {
        var params,
            width = this.$map.width(),
            height = this.$map.height(),
            mapsAPIKeyStr = ( typeof settings !== 'undefined' && settings[ 'mapsStaticAPIKey' ] ) ? '&key=' + settings[ 'mapsStaticAPIKey' ] : '';

        params = "center=" + lat + "," + lng + "&size=" + width + "x" + height + "&zoom=" + zoom + "&sensor=false" + mapsAPIKeyStr;
        this.$map.empty().append( '<img src="http://maps.googleapis.com/maps/api/staticmap?' + params + '"/>' );
    };

    /**
     * Updates the dynamic (Maps API v3) map to show the provided coordinates (in the center), with the provided zoom level
     *
     * @param  {number} lat  latitude
     * @param  {number} lng  longitude
     * @param  {number} zoom zoom
     */
    Geopointpicker.prototype._updateDynamicMap = function( lat, lng, zoom ) {
        var $map = this.$map,
            that = this;

        if ( this._dynamicMapAvailable() && typeof google.maps.LatLng !== 'undefined' ) {
            var mapOptions = {
                zoom: zoom,
                center: new google.maps.LatLng( lat, lng ),
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false
            };
            this.map = new google.maps.Map( this.$map[ 0 ], mapOptions );
            this._placeMarker();
            // place marker where user clicks
            google.maps.event.addListener( this.map, 'click', function( event ) {
                that._updateInputs( event.latLng.lat(), event.latLng.lng(), '', '', 'change.bymap' );
                that._placeMarker( event.latLng );
            } );
        }
    };

    /**
     * Moves the existing marker to the provided coordinates or places a new one in the center of the map
     *
     * @param  {Object.<string, number>=} latLng [description]
     */
    Geopointpicker.prototype._placeMarker = function( latLng ) {
        var that;
        latLng = latLng || this.map.getCenter();

        if ( typeof this.marker !== 'undefined' ) {
            this.marker.setMap( null );
        }

        this.marker = new google.maps.Marker( {
            position: latLng,
            map: this.map,
            draggable: true
        } );
        that = this;

        // dragging markers for non-touch screens
        if ( !this.options.touch ) {
            google.maps.event.addListener( this.marker, 'dragend', function() {
                that._updateInputs( that.marker.getPosition().lat(), that.marker.getPosition().lng(), '', '', 'change.bymap' );
                that._centralizeWithDelay();
            } );
            this._centralizeWithDelay( 5000 );
        }

        this._centralizeWithDelay( 0 );
    };

    /**
     * Shifts the map so that the marker is in the center after a small delay.
     */
    Geopointpicker.prototype._centralizeWithDelay = function( delay ) {
        var that = this;
        window.setTimeout( function() {
            that.map.panTo( that.marker.getPosition() );
        }, delay );
    };

    /**
     * Updates the (fake) input element for latitude, longitude, altitude and accuracy
     *
     * @param  {number} lat [description]
     * @param  {number} lng [description]
     * @param  {?(string|number)} alt [description]
     * @param  {?(string|number)} acc [description]
     * @param  {string=} ev  [description]
     */
    Geopointpicker.prototype._updateInputs = function( lat, lng, alt, acc, ev ) {
        alt = alt || '';
        acc = acc || '';
        ev = ev || 'change';
        this.$lat.val( Math.round( lat * 10000 ) / 10000 );
        this.$lng.val( Math.round( lng * 10000 ) / 10000 );
        this.$alt.val( Math.round( alt * 10 ) / 10 );
        this.$acc.val( Math.round( acc * 10 ) / 10 ).trigger( ev );
    };

    $.fn[ pluginName ] = function( options, event ) {
        var loadStarted = false;

        return this.each( function() {
            var $this = $( this ),
                data = $( this ).data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Geopointpicker( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                //pass the context, used for destroy() as this method is called on a cloned widget
                data[ options ]( this );
            }
        } );
    };

} );
