if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
/**
 * @preserve Copyright 2016 Martijn van de Rijdt
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

define( function( require, exports, module ) {
    'use strict';
    var $ = require( 'jquery' );
    var Widget = require( '../../js/Widget' );
    var config = require( 'text!enketo-config' );
    var Promise = require( 'lie' );
    var t = require( 'translator' ).t;
    var pluginName = 'esriGeopicker';
    var overridePluginName = 'geopicker';
    var esriArcGisJsUrl = config[ 'esriArcGisJsUrl' ] || 'https://js.arcgis.com/4.0/';
    var convertor = require( './usng.js' );
    var precision = 10;
    var esriArcGisJsRequest;
    var esri;

    //TODO: obtain webmapId

    /**
     * Geopicker widget Class
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Geopicker( element, options ) {
        this.namespace = pluginName;
        // call the super class constructor
        Widget.call( this, element, options );

        this._init();
    }

    // copy the prototype functions from the Widget super class
    Geopicker.prototype = Object.create( Widget.prototype );

    // ensure the constructor is the new one
    Geopicker.prototype.constructor = Geopicker;

    Geopicker.prototype._loadEsriArcGisJs = function() {
        // Request Esri ArcGIS JS script only once, using a variable outside of the scope of the current widget
        // in case multiple widgets exist in the same form
        if ( !esriArcGisJsRequest ) {
            esriArcGisJsRequest = new Promise( function( resolve, reject ) {
                // make the request for the Esri script asynchronously
                $.getScript( esriArcGisJsUrl )
                    .done( function() {
                        // TODO: is it 100% sure that window.require is available at this point?
                        // The script has has loaded, but has it executed?
                        window.require( [
                            "esri/geometry/Point",
                            "esri/Map",
                            "esri/WebMap",
                            "esri/views/MapView",
                            "esri/widgets/Locate",
                            "esri/widgets/Search",
                            "dojo/promise/all",
                            "dojo/domReady!"
                        ], function(
                            Point,
                            Map,
                            WebMap,
                            MapView,
                            Locate,
                            Search
                        ) {
                            esri = {
                                Point: Point,
                                Map: Map,
                                WebMap: WebMap,
                                MapView: MapView,
                                Locate: Locate,
                                Search: Search
                            };
                            resolve( true );
                        } );
                    } )
                    .fail( function() {
                        console.error( new Error( 'failed to load ESRI ArcGIS JS script' ) );
                        resolve( false );
                    } );
            } );
        }

        return esriArcGisJsRequest;
    };

    /**
     * Initializes the picker
     */
    Geopicker.prototype._init = function() {
        var loadedVal = $( this.element ).val().trim();
        var that = this;

        this._loadEsriArcGisJs()
            .then( function( mapScriptsAvailable ) {
                that.mapSupported = mapScriptsAvailable;
                that.$question = $( that.element ).closest( '.question, .note' );
                that.mapId = 'map' + Math.round( Math.random() * 10000000 );
                that.props = that._getProps();
                //that.mapNavigationDisabled = false;
                that.mapUpdating = false;
                that.currentIndex = 0;
                that.points = [];

                that._addDomElements();

                // handle point input changes
                that.$widget.find( '[name="lat"], [name="long"], [name="alt"], [name="acc"]' ).on( 'change change.bymap change.bysearch', function( event ) {
                    var updated;
                    var lat = that.$lat.val() ? Number( that.$lat.val() ) : '';
                    var lng = that.$lng.val() ? Number( that.$lng.val() ) : '';
                    // we need to avoid a missing alt in case acc is not empty!
                    var alt = that.$alt.val() ? Number( that.$alt.val() ) : '';
                    var acc = that.$acc.val() ? Number( that.$acc.val() ) : '';
                    var point = {
                        latitude: lat,
                        longitude: lng,
                        altitude: alt,
                        accuracy: acc
                    };

                    event.stopImmediatePropagation();

                    that.points[ that.currentIndex ] = {
                        latitude: point.latitude,
                        longitude: point.longitude,
                        altitude: point.altitude,
                        accuracy: point.accuracy
                    };
                    updated = that._updateValue();
                    if ( updated ) {
                        that._updateMap( that.points[ that.currentIndex ] );
                    }
                } );

                that.$mgrs.on( 'change', function() {
                    var latLng = [];
                    convertor.USNGtoLL( this.value, latLng );
                    that._updateInputs( {
                        latitude: latLng[ 0 ],
                        longitude: latLng[ 1 ]
                    } );
                } );

                that.$latdms.add( that.$lngdms ).on( 'change', function() {
                    var lats = that.$latdms.find( 'input, select' ).map( function() {
                        return this.value;
                    } ).get();
                    var longs = that.$lngdms.find( 'input, select' ).map( function() {
                        return this.value;
                    } ).get();
                    // if none of the 8 input values is empty, proceed
                    var empties = lats.concat( longs ).some( function( val ) {
                        return val === '' || val === undefined || val === null;
                    } );
                    if ( !empties ) {
                        that._updateInputs( {
                            latitude: that._dmsToDecimal( lats ),
                            longitude: that._dmsToDecimal( longs )
                        } );
                    }
                } );

                // handle input switcher
                that.$widget.find( '.toggle-map-visibility-btn' ).on( 'click', function( event ) {
                    that.$map.toggleClass( 'hide-map' );
                    that._updateMap( that.points[ that.currentIndex ] );
                } );

                // handle input switcher
                that.$inputTypeSwitcher.on( 'change', function( event ) {
                    var type = this.value;
                    that._switchInputType( type );
                    return false;
                } );

                // disable map navigation on touchscreens until user clicks map
                // using a hack until the ARCGis JS API has a way to do this programmatically.
                if ( that.props.touch && that.mapSupported && !that.props.readonly ) {
                    that.$widget.addClass( 'no-scroll' );
                    //that.mapNavigationDisabled = true;
                    that.$map.find( '.interaction-blocker' ).one( 'click', function() {
                        //that.mapNavigationDisabled = false;
                        that.$widget.removeClass( 'no-scroll' );
                    } );
                }

                // pass blur and focus events back to original input
                that.$widget.on( 'focus blur', 'input', function( event ) {
                    $( that.element ).trigger( event.type );
                } );

                that._addRegularLocate();

                that._updateMap();

                // load default value
                if ( loadedVal ) {
                    $( that.element ).val().trim().split( ';' ).forEach( function( geopoint, i ) {
                        var point = {};
                        geopoint.trim().split( ' ' ).forEach( function( coordinate, index ) {
                            point[ [ 'latitude', 'longitude', 'altitude', 'accuracy' ][ index ] ] = Number( coordinate );
                        } );
                        that.points[ i ] = point;
                    } );
                    that._updateInputs( that.points[ that.currentIndex ] );
                }

                if ( that.props.readonly ) {
                    that.disable( that.element );
                }

            } )
            .catch( function( error ) {
                // TODO: use in offline-only mode
                console.error( 'Esri geo widget initialization error', error );
            } );


    };

    Geopicker.prototype._switchInputType = function( type ) {
        if ( type === 'MGRS' ) {
            this.$inputGroup.addClass( 'mgrs-input-mode' ).removeClass( 'dms-input-mode' );
        } else if ( type === 'dms' ) {
            this.$inputGroup.addClass( 'dms-input-mode' ).removeClass( 'mgrs-input-mode' );
        } else {
            this.$inputGroup.removeClass( 'dms-input-mode mgrs-input-mode' );
        }
    };

    /**
     * Gets the widget properties and features.
     *
     * @return {{ detect: boolean, compact: boolean, type: string, touch: boolean, readonly: boolean}} The widget properties object
     */
    Geopicker.prototype._getProps = function() {
        var that = this;
        var appearances = this.$question.attr( 'class' ).split( ' ' )
            .filter( function( item ) {
                return item !== 'or-appearance-maps' && /or-appearance-/.test( item );
            } ).map( function( appearance, index ) {
                return appearance.substring( 14 );
            } );
        var compact = appearances.indexOf( 'compact' ) !== -1;

        return {
            detect: !!navigator.geolocation,
            compact: compact === true || that.mapSupported === false,
            type: this.element.attributes[ 'data-type-xml' ].value,
            touch: this.options.touch,
            readonly: this.element.readOnly
        };
    };

    /**
     * Adds the DOM elements
     */
    Geopicker.prototype._addDomElements = function() {
        var centerMark = '<span class="center-mark esri-geopoint-marker"> </span>';
        var toggleMapBtn = this.props.compact ? '<button type="button" class="toggle-map-visibility-btn"> </button>' : '';
        var locateBtn = this.props.detect ? '<button name="geodetect" type="button" tabindex="0" class="btn btn-default esri-locate esri-widget-button esri-widget esri-component">' +
            '<span aria-hidden="true" class="esri-icon esri-icon-locate" title="Find my location"></span></button>' : '';
        var map = '<div class="map-canvas-wrapper' + ( this.props.compact ? ' hide-map' : '' ) +
            '"><div class="interaction-blocker"></div><div class=map-canvas id="' +
            this.mapId + '"></div>' + centerMark + toggleMapBtn + '</div>';
        var latTxt = t( 'geopicker.latitude' ) || 'latitude (x.y &deg;)';
        var lngTxt = t( 'geopicker.longitude' ) || 'longitude (x.y &deg;)';
        var altTxt = t( 'geopicker.altitude' ) || 'altitude (m)';
        var accTxt = t( 'geopicker.accuracy' ) || 'accuracy (m)';
        var decTxt = t( 'esri-geopicker.decimal' ) || 'decimal';
        var mgrsSelectorTxt = t( 'esri-geopicker.mgrs' ) || 'MGRS';
        var degSelectorTxt = t( 'esri-geopicker.degrees' ) || 'degrees, minutes, seconds';
        var mgrsLabelTxt = t( 'esri-geopicker.coordinate-mgrs' ) || 'MGRS coordinate';
        var latDegTxt = t( 'esri-geopicker.latitude-degrees' ) || 'latitude (d&deg m&rsquo; s&rdquo; N)';
        var lngDegTxt = t( 'esri-geopicker.latitude-degrees' ) || 'longitude (d&deg m&rsquo; s&rdquo; W)';
        var d = '<span class="geo-unit">&deg;</span>';
        var m = '<span class="geo-unit">&rsquo;</span>';
        var s = '<span class="geo-unit">&rdquo;</span>';

        this.$widget = $(
            '<div class="esri-geopicker widget">' +
            '<div class="geo-inputs">' +
            '<label class="geo-selector"><select name="geo-input-type" class="ignore"><option value="decimal" selected>' + decTxt + '</option>' +
            '<option value="MGRS">' + mgrsSelectorTxt + '</option>' +
            '<option value="dms">' + degSelectorTxt + '</option></select>' + locateBtn + '</label>' +
            '<label class="geo mgrs">' + mgrsLabelTxt + '<input class="ignore" name="mgrs" type="text" /></label>' +
            '<label class="geo lat-dms"><span class="geo-label">' + latDegTxt + '</span>' +
            '<span><input class="ignore" name="lat-deg" type="number" step="1" min="-90" max="90"/>' + d + '</span>' +
            '<span><input class="ignore" name="lat-min" type="number" step="1" min="0" max="59"/>' + m + '</span>' +
            '<span><input class="ignore" name="lat-sec" type="number" step="1" min="0" max="59"/>' + s + '</span>' +
            '<select class="ignore" name="lat-hem"><option value="N">N</option><option value="S">S</option></select>' +
            '</label>' +
            '<label class="geo long-dms"><span class="geo-label">' + lngDegTxt + '</span>' +
            '<span><input class="ignore" name="long-deg" type="number" step="1" min="-180" max="180"/>' + d + '</span>' +
            '<span><input class="ignore" name="long-min" type="number" step="1" min="0" max="59"/>' + m + '</span>' +
            '<span><input class="ignore" name="long-sec" type="number" step="1" min="0" max="59"/>' + s + '</span>' +
            '<select class="ignore" name="long-hem"><option value="W">W</option><option value="E">E</option></select>' +
            '</label>' +
            '<label class="geo lat">' + latTxt + '<input class="ignore" name="lat" type="number" step="0.000001" min="-90" max="90"/></label>' +
            '<label class="geo long">' + lngTxt + '<input class="ignore" name="long" type="number" step="0.000001" min="-180" max="180"/></label>' +
            '<label class="geo">' + altTxt + '<input class="ignore" name="alt" type="number" step="0.1" /></label>' +
            '<label class="geo">' + accTxt + '<input class="ignore" readonly name="acc" type="number" step="0.1" /></label>' +
            '</div>' +
            '</div>'
        );

        // add the map canvas
        this.$widget.prepend( map );
        this.$map = this.$widget.find( '.map-canvas-wrapper' );

        this.$inputGroup = this.$widget.find( '.geo-inputs' );
        this.$detect = this.$widget.find( '[name="geodetect"]' );
        this.$inputTypeSwitcher = this.$inputGroup.find( '[name="geo-input-type"]' );

        // touchscreen maps
        if ( this.props.touch && this.mapSupported ) {
            // TODO block scrolling
        }

        this.$lat = this.$inputGroup.find( '[name="lat"]' );
        this.$lng = this.$inputGroup.find( '[name="long"]' );
        this.$alt = this.$inputGroup.find( '[name="alt"]' );
        this.$acc = this.$inputGroup.find( '[name="acc"]' );
        this.$mgrs = this.$inputGroup.find( '[name="mgrs"]' );
        this.$latdms = this.$inputGroup.find( '.lat-dms' );
        this.$lngdms = this.$inputGroup.find( '.long-dms' );

        $( this.element ).hide().after( this.$widget ); //.parent().addClass( 'clearfix' );
    };

    /**
     * Updates the value in the original input element.
     *
     * @return {Boolean} Whether the value was changed.
     */
    Geopicker.prototype._updateValue = function() {
        var oldValue = $( this.element ).val();
        var newValue = '';
        var that = this;

        //this._markAsValid();

        // all points should be valid geopoints and only the last item may be empty
        this.points.forEach( function( point, index, array ) {
            var geopoint;
            var lat = typeof point.latitude === 'number' ? point.latitude : null;
            var lng = typeof point.longitude === 'number' ? point.longitude : null;
            var alt = typeof point.altitude === 'number' ? point.altitude : 0.0;
            var acc = typeof point.accuracy === 'number' ? point.accuracy : 0.0;

            geopoint = ( lat && lng ) ? lat + ' ' + lng + ' ' + alt + ' ' + acc : '';

            if ( !( geopoint === '' && index === array.length - 1 ) ) {
                newValue += geopoint;

                if ( index !== array.length - 1 ) {
                    newValue += ';';
                }
            } else {
                // remove trailing semi-colon
                newValue = newValue.substring( 0, newValue.lastIndexOf( ';' ) );
            }
        } );

        if ( oldValue !== newValue ) {
            $( this.element ).val( newValue ).trigger( 'change' );
            return true;
        } else {
            return false;
        }
    };

    /**
     * Checks an Openrosa geopoint for validity. This function is used to provide more detailed
     * error feedback than provided by the form controller. This can be used to pinpoint the exact
     * invalid geopoints in a list of geopoints (the form controller only validates the total list).
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
            ( typeof coords[ 2 ] === 'undefined' || !isNaN( coords[ 2 ] ) ) &&
            ( typeof coords[ 3 ] === 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) )
        );
    };

    /**
     * Validates an individual latlng Array or Object
     * @param  {(Array.<number|string>|{lat: number, long:number})}  latLng latLng object or array
     * @return {Boolean}        Whether latLng is valid or not
     */
    Geopicker.prototype._isValidLatLng = function( latLng ) {
        var lat;
        var lng;

        lat = ( typeof latLng[ 0 ] === 'number' ) ? latLng[ 0 ] : ( typeof latLng.lat === 'number' ) ? latLng.lat : null;
        lng = ( typeof latLng[ 1 ] === 'number' ) ? latLng[ 1 ] : ( typeof latLng.lng === 'number' ) ? latLng.lng : null;

        return ( lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 );
    };

    /**
     * Updates the map to either show the provided coordinates (in the center), with the provided zoom level
     * or update any markers, polylines, or polygons.
     *
     * @param  @param  {Array.<number>|{lat: number, lng: number}} latLng  latitude and longitude coordinates
     * @param  {number=} zoom zoom level
     * @return {Function} Returns call to function
     */
    Geopicker.prototype._updateMap = function( point, zoom ) {
        var that = this;

        // check if the widget is supposed to have a map
        if ( that.$map.hasClass( 'hide-map' ) || !that.mapSupported ) {
            return;
        }

        // add the map 
        if ( !this.mapView ) {
            this._addDynamicMap();
        }

        // update the map
        if ( point ) {
            this._updateDynamicMapView( point, zoom );
        }
    };

    Geopicker.prototype._addDynamicMap = function() {
        var that = this;
        var map;
        var mapCenter;
        var currentScale;
        var webMapId = '';
        var webMapConfig = {
            basemap: "streets",
            ground: "world-elevation"
        };
        var firstTime = true;
        var fallback = true;

        webMapId = this.options.helpers.webMapId || this._getWebMapIdFromFormClasses( this.options.helpers.formClasses );
        //'ef9c7fbda731474d98647bebb4b33c20'; 
        //'f2e9b762544945f390ca4ac3671cfa72';
        //'ad5759bf407c4554b748356ebe1886e5';
        //'71ba2a96c368452bb73d54eadbd59faa';
        //'45ded9b3e0e145139cc433b503a8f5ab';

        if ( webMapId && webMapId !== 'null' ) {
            webMapConfig.portalItem = {
                id: webMapId
            };
            fallback = false;
        }
        map = new esri.WebMap( webMapConfig );

        map.load()
            .otherwise( function( error ) {
                console.error( 'error loading webmap with webmapId: ' + webMapId, error );
                delete webMapConfig.portalItem;
                map = new esri.WebMap( webMapConfig );
                fallback = true;
                return map.load();
            } )
            .then( function() {
                //console.debug( 'map loaded', that.mapNavigationDisabled );
                //if ( that.mapNavigationDisabled ) {
                //console.debug( 'disabling map navigation', typeof map.disableMapNavigation, map );
                //map.disableMapNavigation();
                //}
            } )
            .otherwise( function( error ) {
                console.error( 'error loading alternative fallback webmap: ', error );
            } );

        that.mapView = new esri.MapView( {
            map: map,
            container: that.mapId,
            zoom: ( fallback ) ? 2 : null
        } );

        that._addUserPanHandler( that.mapView );

        // We need to add the "ignore" class to all inputs that arcGIS has added to avoid issues with Enketo's engine
        this.mapView.watch( 'ready', function( isReady ) {
            if ( isReady && firstTime ) {
                firstTime = false;
                that.$widget.find( '#' + that.mapId ).find( 'input, textarea, select' ).addClass( 'ignore' );
            }
        } );

        that._addEsriSearch( that.mapView );
        that._addEsriLocate( that.mapView );
    };

    Geopicker.prototype._getMapCenter = function() {
        var center = this.mapView.center;
        // Map updater compares the current map center with the map center of a provided point.
        // It is crucial to use the same precision for both, to not create an infinite loop.
        // If the webform is offline, it is undefined;
        return ( !center ) ? undefined : {
            latitude: center.latitude.toPrecision( precision ),
            longitude: center.longitude.toPrecision( precision )
        };
    };

    /*
    Geopicker.prototype._enableNavigation = function() {
        this.mapView.map.enableMapNavigation();
    };
    */

    Geopicker.prototype._addEsriSearch = function( mapView ) {
        var that = this;
        var searchWidget = new esri.Search( {
            view: mapView,
            popupEnabled: false,
            popupOpenOnSelect: false,
            autoSelect: false
        } );

        searchWidget.startup();

        searchWidget.on( 'search-complete', function( evt ) {
            var p;

            try {
                p = evt.results[ 0 ].results[ 0 ].extent.center;
                that._updateInputs( p );
            } catch ( err ) {
                console.log( err );
            }
        } );

        this.mapView.ui.add( searchWidget, {
            position: "top-left",
            index: 0
        } );
    };

    /**
     * Enables geo detection in an Esri mapview.
     */
    Geopicker.prototype._addEsriLocate = function( mapView ) {
        var that = this;
        var locateBtn = new esri.Locate( {
            view: mapView,
            graphic: null,
            goToLocationEnabled: false
        } );

        locateBtn.startup();

        locateBtn.on( 'locate', function( evt ) {
            that._updateInputs( evt.position.coords );
        } );

        this.mapView.ui.add( locateBtn, {
            position: "top-left",
            index: 1
        } );
    };

    /**
     * Enables geo detection using the built-in browser geoLocation functionality.
     */
    Geopicker.prototype._addRegularLocate = function() {
        var that = this;
        var options = {
            enableHighAccuracy: true,
            maximumAge: 0
        };
        var $icon = this.$detect.find( '.esri-icon' );

        this.$detect.click( function( event ) {
            event.preventDefault();
            $icon.removeClass( 'esri-icon-locate' ).addClass( 'esri-rotating esri-icon-loading-indicator' );
            navigator.geolocation.getCurrentPosition( function( position ) {
                that._updateInputs( position.coords );
                $icon.addClass( 'esri-icon-locate' ).removeClass( 'esri-rotating esri-icon-loading-indicator' );
            }, function() {
                console.error( 'error occurred trying to obtain position' );
                $icon.addClass( 'esri-icon-locate' ).removeClass( 'esri-rotating esri-icon-loading-indicator' );
            }, options );
            return false;
        } );
    };

    Geopicker.prototype._addUserPanHandler = function( mapView ) {
        var that = this;
        mapView.watch( 'stationary', function( newValue, oldValue, propertyName, target ) {
            var currentCenter;
            //console.debug( 'result', propertyName, oldValue, newValue, target );

            // We should only watch movement that is done by user dragging map not programmatic map updating.
            // We should be able to check for the animation.state property, but I did not succeed with this.
            if ( !that.mapUpdating && newValue === true ) {
                currentCenter = that._getMapCenter();
                // TODO: add changed check before updating inputs
                if ( !that._sameLatLng( currentCenter, that.points[ that.currentIndex ] ) ) {
                    console.debug( 'stationary and not programmatically updating map' );
                    that._updateInputs( that._getMapCenter() );
                } else {
                    console.debug( 'map did not change' );
                }
            }
        } );
    };

    Geopicker.prototype._updateDynamicMapView = function( point, zoom ) {
        var esriPoint;
        var currentCenter;
        var that = this;

        if ( point && this.mapView ) {
            this.mapView
                .then( function() {
                    currentCenter = that._getMapCenter();

                    if ( !that._sameLatLng( point, currentCenter ) ) {
                        esriPoint = new esri.Point( point );
                        that.mapUpdating = true;
                        that.mapView.goTo( esriPoint )
                            .then( function( viewAnimation ) {
                                if ( viewAnimation ) {
                                    viewAnimation.then( function( state ) {
                                        that.mapUpdating = false;
                                    } );
                                } else {
                                    that.mapUpdating = false;
                                }
                            } );
                    } else {
                        console.debug( 'no need to update the map view' );
                    }
                } );
        }
    };

    Geopicker.prototype._sameLatLng = function( a, b ) {
        return a && b && a.latitude - b.latitude === 0 && a.longitude - b.longitude === 0;
    };

    Geopicker.prototype._latLngToDms = function( latitude, longitude, prec ) {
        var card;

        prec = prec || precision;

        return {
            latitude: this._decimalToDms( latitude, prec ).concat( [ ( latitude > 0 ) ? 'N' : 'S' ] ),
            longitude: this._decimalToDms( longitude, prec ).concat( [ ( longitude > 0 ) ? 'E' : 'W' ] )
        };
    };

    Geopicker.prototype._decimalToDms = function( decimal, prec ) {
        var absDecimal;
        var deg;
        var minRemaining;
        var min;
        var sec;

        prec = prec || precision;
        absDecimal = Math.abs( decimal );
        deg = Math.floor( absDecimal );
        minRemaining = ( absDecimal - deg ) * 60;
        min = Math.floor( minRemaining );
        sec = Number( ( ( minRemaining - min ) * 60 ).toPrecision( prec ) );

        return [ deg, min, sec ];
    };

    Geopicker.prototype._dmsToDecimal = function( dms ) {
        var dec;
        var decDeg;
        var decMin;
        var decSec;
        var symbol;

        if ( !Array.isArray( dms ) ) {
            return 'NaN';
        }

        decDeg = Math.abs( dms[ 0 ] ) || 0;
        decMin = ( Math.abs( dms[ 1 ] ) || 0 ) / 60;
        decSec = ( Math.abs( dms[ 2 ] ) || 0 ) / 3600;
        symbol = ( Number( dms[ 0 ] ) < 0 || dms[ 3 ] === 'S' || dms[ 3 ] === 'W' ) ? '-' : '';

        return symbol + ( decDeg + decMin + decSec ).toPrecision( precision );
    };

    /*
    Geopicker.prototype._changeSpatialReference = function( esriPoint ) {
        var spatialRef = esri.SpatialReference.WGS84;
        if ( esri.webMercatorUtils.canProject( esriPoint.spatialReference, spatialRef ) ) {
            console.debug( 'projecting to', spatialRef );
            esriPoint = esri.webMercatorUtils.project( esriPoint, spatialRef );
        }
        return esriPoint;
    };
    */

    /**
     * Updates the (fake) input element for latitude, longitude, altitude and accuracy
     *
     * @param  @param  {{latitude: number, longitude: number, altitude: number, accuracy: number}} point latitude, longitude, altitude and accuracy
     * @param  {string=} ev  [description]
     */
    Geopicker.prototype._updateInputs = function( point, ev ) {
        var lat;
        var lng;
        var alt;
        var acc;
        var dms;

        if ( !point ) {
            return;
        }

        lat = point.latitude ? Number( point.latitude ).toPrecision( precision ) : '';
        lng = point.longitude ? Number( point.longitude ).toPrecision( precision ) : '';
        alt = point.altitude || '';
        acc = point.accuracy || '';

        ev = ( typeof ev !== 'undefined' ) ? ev : 'change';

        this.$lat.val( lat || '' );
        this.$lng.val( lng || '' );
        this.$alt.val( alt || '' );
        this.$acc.val( acc || '' ).trigger( ev );

        // update secondary inputs without firing a change event
        this.$mgrs.val( convertor.LLtoMGRS( lat, lng, 5 ) );
        dms = this._latLngToDms( lat, lng, 5 );
        this.$latdms.find( 'input, select' ).each( function( index ) {
            this.value = dms.latitude[ index ];
        } );
        this.$lngdms.find( 'input, select' ).each( function( index ) {
            this.value = dms.longitude[ index ];
        } );
    };

    Geopicker.prototype._getWebMapIdFromFormClasses = function( classes ) {
        var webMapId;
        classes = Array.isArray( classes ) ? classes : [];
        classes.some( function( cls ) {
            var parts = cls.split( '::' );
            if ( parts.length > 1 && parts[ 0 ].toLowerCase() === 'arcgis' ) {
                webMapId = parts[ 1 ];
                return true;
            }
            return false;
        } );
        return webMapId;
    };

    /**
     * Disables the widget
     */
    Geopicker.prototype.disable = function( element ) {
        // Due to async initialization, it is possible disable is called before it has initialized.
        this._loadEsriArcGisJs()
            .then( function() {
                $( element )
                    .next( '.widget' )
                    .addClass( 'readonly' )
                    .find( 'input, select, textarea' ).prop( 'disabled', true )
                    .end()
                    .find( '.btn' ).prop( 'disabled', true );
            } );
    };

    /**
     * Enables a disabled widget
     */
    Geopicker.prototype.enable = function( element ) {
        if ( !this.props.readonly ) {
            // Due to async initialization, it is possible enable is called before it has initialized.
            this._loadEsriArcGisJs()
                .then( function() {
                    $( element )
                        .next( '.widget' )
                        .removeClass( 'readonly' )
                        .find( 'input, select, textarea' ).prop( 'disabled', false )
                        .end()
                        .find( '.btn' ).prop( 'disabled', false );
                } );
        }
    };

    Geopicker.prototype.destroy = function( element ) {
        this._loadEsriArcGisJs()
            .then( function() {
                $( element )
                    .removeData( overridePluginName )
                    .off( '.' + this.namespace )
                    .show()
                    .next( '.widget' ).remove();
            } );
    };

    $.fn[ pluginName ] = function( options, event ) {

        return this.each( function() {
            var $this = $( this );
            var data = $( this ).data( overridePluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( overridePluginName, new Geopicker( this, options, event ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[data-type-xml="geopoint"]',
        'helpersRequired': [ 'webMapId', 'formClasses' ]
    };
} );
