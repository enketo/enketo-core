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
    var convertor = require( './usng.js' );
    var Promise = require( 'lie' );
    var t = require( 'translator' ).t;
    var PLUGIN_NAME = 'esriGeopicker';
    var OVERRIDE_PLUGIN_NAME = 'geopicker';
    var ESRI_ARGIS_JS_URL = config[ 'esriArcGisJsUrl' ] || 'https://js.arcgis.com/4.0/';
    var PRECISION = 10;
    var NORTHING_OFFSET = 10000000.0;
    var esriArcGisJsRequest;
    var esri;

    /**
     * Geopicker widget Class
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Geopicker( element, options ) {
        this.namespace = PLUGIN_NAME;
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
                $.getScript( ESRI_ARGIS_JS_URL )
                    .done( function() {
                        // TODO: is it 100% sure that window.require is available at this point?
                        // The script has has loaded, but has it executed?
                        window.require( [
                            'esri/geometry/Point',
                            'esri/Map',
                            'esri/WebMap',
                            'esri/views/MapView',
                            'esri/widgets/Locate',
                            'esri/widgets/Search',
                            'dojo/promise/all',
                            'dojo/domReady!'
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
                var $utms;
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
                that.$widget.find( '[name="lat"], [name="long"], [name="alt"], [name="acc"]' ).on( 'change', function( event ) {
                    var changed;
                    var lat = that.$lat.val() !== '' ? Number( that.$lat.val() ) : '';
                    var lng = that.$lng.val() !== '' ? Number( that.$lng.val() ) : '';
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
                    changed = that._updateValue();
                    if ( changed ) {
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

                $utms = that.$zoneutm.add( that.$hemisphereutm ).add( that.$eastingutm ).add( that.$northingutm );
                $utms.on( 'change', function() {
                    var names = [ 'zone', 'hemisphere', 'easting', 'northing' ];
                    var utm = {};
                    var empties = 0;
                    $utms.each( function( index, input ) {
                        utm[ names[ index ] ] = input.value;
                        // Hemisphere can be empty if zone is number + letter.
                        // By design this is not a very thorough check to make sure there is some error indication to user.
                        if ( index !== 1 ) {
                            empties = input.value === '' ? empties + 1 : empties;
                        } else if ( input.value === '' && !/[A-z]$/.test( utm.zone ) ) {
                            empties++;
                        }
                    } );
                    if ( empties === 0 ) {
                        that._updateInputs( that._utmToLatLng( utm ) );
                    }
                } );

                // handle map visibility switcher
                that.$widget.find( '.toggle-map-visibility-btn' ).on( 'click', function( event ) {
                    that.$map.toggleClass( 'hide-map' );
                    that._updateMap( that.points[ that.currentIndex ] );
                } );

                // handle input type switcher
                that.$inputTypeSwitcher.on( 'change', function( event ) {
                    var type = this.value;
                    that._switchInputType( type );
                    return false;
                } );

                // handle click of "empty" button
                that.$widget.find( '[name="empty"]' ).on( 'click', function() {
                    that._updateInputs( {} );
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
                } else {
                    that.$detect.click()
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
        var modes = [ 'MGRS', 'UTM', 'dms' ];
        var index = modes.indexOf( type );
        var active = '';
        var inactive = '';

        if ( index !== -1 ) {
            modes.splice( index, 1 );
            active = type.toLowerCase() + '-input-mode';
        }
        inactive = modes.map( function( t ) {
            return t.toLowerCase() + '-input-mode';
        } ).join( ' ' );

        this.$inputGroup.addClass( active ).removeClass( inactive );
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
        var centerMark = '<span class="center-mark esri-geopoint-marker" style="display:none;"> </span>';
        var toggleMapBtn = this.props.compact ? '<button type="button" class="toggle-map-visibility-btn"> </button>' : '';
        var locateBtn = this.props.detect ? '<button name="geodetect" type="button" tabindex="0" class="btn btn-default esri-locate esri-widget-button esri-widget esri-component">' +
            '<span aria-hidden="true" class="esri-icon esri-icon-locate" title="Find my location"></span></button>' : '';
        var map = '<div class="map-canvas-wrapper' + ( this.props.compact ? ' hide-map' : '' ) +
            '"><div class="interaction-blocker"></div><div class=map-canvas id="' +
            this.mapId + '"></div>' + centerMark + toggleMapBtn + '</div>';
        var latTxt = t( 'geopicker.latitude' ) || 'latitude (a.b &deg;)';
        var lngTxt = t( 'geopicker.longitude' ) || 'longitude (a.b &deg;)';
        var altTxt = t( 'geopicker.altitude' ) || 'altitude (m)';
        var accTxt = t( 'geopicker.accuracy' ) || 'accuracy (m):';
        var decTxt = t( 'esri-geopicker.decimal' ) || 'decimal';
        var notAvTxt = t( 'esri-geopicker.notavailable' ) || 'Not Available';
        var zHide = typeof this.options.helpers.arcGis === 'object' && this.options.helpers.arcGis.hasZ === false ? ' alt-hide' : '';
        var mgrsSelectorTxt = t( 'esri-geopicker.mgrs' ) || 'MGRS';
        var utmSelectorTxt = t( 'esri-geopicker.utm' ) || 'UTM';
        var degSelectorTxt = t( 'esri-geopicker.degrees' ) || 'degrees, minutes, seconds';
        var mgrsLabelTxt = t( 'esri-geopicker.coordinate-mgrs' ) || 'MGRS coordinate';
        var latDegTxt = t( 'esri-geopicker.latitude-degrees' ) || 'latitude (d&deg m&rsquo; s&rdquo; N)';
        var lngDegTxt = t( 'esri-geopicker.latitude-degrees' ) || 'longitude (d&deg m&rsquo; s&rdquo; W)';
        var utmZoneTxt = t( 'esri-geopicker.utm-zone' ) || 'zone';
        var utmHemisphereTxt = t( 'esri-geopicker.utm-hemisphere' ) || 'hemisphere';
        var hemNorthTxt = t( 'esri-geopicker.utm-north' ) || 'North';
        var hemSouthTxt = t( 'esri-geopicker.utm-soutch' ) || 'South';
        var utmEastingTxt = t( 'esri-geopicker.utm-easting' ) || 'easting (m)';
        var utmNorthingTxt = t( 'esri-geopicker.utm-northing' ) || 'northing (m)';
        var d = '<span class="geo-unit">&deg;</span>';
        var m = '<span class="geo-unit">&rsquo;</span>';
        var s = '<span class="geo-unit">&rdquo;</span>';

        this.$widget = $(
            '<div class="esri-geopicker widget">' +
            '<div class="geo-inputs ' + zHide + '">' +
            '<label class="geo-selector"><select name="geo-input-type" class="ignore"><option value="decimal" selected>' + decTxt + '</option>' +
            '<option value="MGRS">' + mgrsSelectorTxt + '</option>' +
            '<option value="dms">' + degSelectorTxt + '</option>' +
            '<option value="UTM">' + utmSelectorTxt + '</option>' +
            '</select>' + locateBtn + '</label>' +
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
            '<label class="geo zone-utm">' + utmZoneTxt + '<input class="ignore" name="zone-utm" type="text"/></label>' +
            '<label class="geo hemisphere-utm">' + utmHemisphereTxt + '<select class="ignore" name="hemisphere-utm"><option value="">...</option>' +
            '<option value="N">' + hemNorthTxt + '</option><option value="S">' + hemSouthTxt + '</option></select></label>' +
            '<label class="geo easting-utm">' + utmEastingTxt + '<input class="ignore" name="easting-utm" type="number" step="0.1" min="0"/></label>' +
            '<label class="geo northing-utm">' + utmNorthingTxt + '<input class="ignore" name="northing-utm" type="number" step="0.1"/></label>' +
            '<label class="geo lat">' + latTxt + '<input class="ignore" name="lat" type="number" step="0.000001" min="-90" max="90"/></label>' +
            '<label class="geo long">' + lngTxt + '<input class="ignore" name="long" type="number" step="0.000001" min="-180" max="180"/></label>' +
            '<label class="geo alt">' + altTxt + '<input class="ignore" name="alt" type="number" step="0.1" /></label>' +
            '<label class="geo acc-empty"><span class="geo-label">' + accTxt + '</span><input class="ignore" readonly name="acc" type="number" step="0.1" placeholder="' + notAvTxt + '"/>' +
            '<button type="button" class="btn btn-icon-only" name="empty"><span class="icon icon-trash"> </span></button></label>' +
            '</div>' +
            '</div>'
        );

        // add the map canvas
        this.$widget.prepend( map );
        this.$map = this.$widget.find( '.map-canvas-wrapper' );
        this.$placemarker = this.$widget.find( '.esri-geopoint-marker' );
        this.$inputGroup = this.$widget.find( '.geo-inputs' );
        this.$detect = this.$widget.find( '[name="geodetect"]' );
        this.$inputTypeSwitcher = this.$inputGroup.find( '[name="geo-input-type"]' );
        this.$lat = this.$inputGroup.find( '[name="lat"]' );
        this.$lng = this.$inputGroup.find( '[name="long"]' );
        this.$alt = this.$inputGroup.find( '[name="alt"]' );
        this.$acc = this.$inputGroup.find( '[name="acc"]' );
        this.$mgrs = this.$inputGroup.find( '[name="mgrs"]' );
        this.$latdms = this.$inputGroup.find( '.lat-dms' );
        this.$lngdms = this.$inputGroup.find( '.long-dms' );
        this.$zoneutm = this.$inputGroup.find( '[name="zone-utm"]' );
        this.$hemisphereutm = this.$inputGroup.find( '[name="hemisphere-utm"]' );
        this.$eastingutm = this.$inputGroup.find( '[name="easting-utm"]' );
        this.$northingutm = this.$inputGroup.find( '[name="northing-utm"]' );

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
            // we need to avoid a missing alt in case acc is not empty!
            var alt = typeof point.altitude === 'number' ? point.altitude : 0.0;
            var acc = typeof point.accuracy === 'number' ? point.accuracy : 0.0;

            geopoint = ( typeof lat === 'number' && typeof lng === 'number' ) ? lat + ' ' + lng + ' ' + alt + ' ' + acc : '';

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

        lat = ( typeof latLng.latitude === 'number' ) ? latLng.latitude : null;
        lng = ( typeof latLng.longitude === 'number' ) ? latLng.longitude : null;

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
            basemap: 'streets',
            ground: 'world-elevation'
        };
        var firstTime = true;
        var fallback = true;
        var arcGisOptions = this.options.helpers.arcGis || {};

        webMapId = arcGisOptions.webMapId || this._getWebMapIdFromFormClasses( this.options.helpers.formClasses );
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
            latitude: center.latitude.toPrecision( PRECISION ),
            longitude: center.longitude.toPrecision( PRECISION )
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
                console.error( 'error occurred trying to obtain position, defaulting to 0,0' );
                that._updateInputs( {
                    latitude: 0,
                    longitude: 0
                } );
                $icon.addClass( 'esri-icon-locate' ).removeClass( 'esri-rotating esri-icon-loading-indicator' );
            }, options );
            return false;
        } );
    };

    Geopicker.prototype._addUserPanHandler = function( mapView ) {
        var that = this;
        mapView.watch( 'stationary', function( newValue, oldValue, propertyName, target ) {
            var currentCenter;

            // We should only watch movement that is done by user dragging map not programmatic map updating.
            // We should be able to check for the animation.state property, but I did not succeed with this.
            if ( !that.mapUpdating && newValue === true ) {
                currentCenter = that._getMapCenter();
                // TODO: add changed check before updating inputs
                if ( !that._sameLatLng( currentCenter, that.points[ that.currentIndex ] ) ) {
                    // console.debug( 'stationary and not programmatically updating map' );
                    that._updateInputs( that._getMapCenter() );
                } else {
                    // console.debug( 'map did not change' );
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
                    if ( !that._isValidLatLng( point ) ) {
                        console.error( 'Not a valid geopoint. Not updating map' );
                        that._updateInputs( point );
                        that.$placemarker.hide();
                    } else if ( !that._sameLatLng( point, currentCenter ) ) {
                        that.$placemarker.show();
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
                        that.$placemarker.show();
                        console.log( 'No need to update the map view.' );
                    }
                } );
        }
    };

    Geopicker.prototype._sameLatLng = function( a, b ) {
        return a && b && a.latitude - b.latitude === 0 && a.longitude - b.longitude === 0;
    };

    Geopicker.prototype._latLngToDms = function( latitude, longitude, prec ) {
        prec = prec || PRECISION;

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

        prec = prec || PRECISION;
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

        return symbol + ( decDeg + decMin + decSec ).toPrecision( PRECISION );
    };

    Geopicker.prototype._latLngToUtm = function( latitude, longitude ) {
        var utm = [];
        var hemisphere = 'N';
        var easting;
        var northing;

        convertor.LLtoUTM( latitude, longitude, utm );

        easting = Math.round( utm[ 0 ] * 10 ) / 10;
        northing = Math.round( utm[ 1 ] * 10 ) / 10;

        if ( utm[ 1 ] < 0 ) {
            hemisphere = 'S';
            northing = NORTHING_OFFSET + northing;
        }

        return {
            zone: utm[ 2 ],
            hemisphere: hemisphere,
            easting: easting,
            northing: northing
        };
    };

    Geopicker.prototype._utmToLatLng = function( utm ) {
        var latLng = {};
        var match = utm.zone.toString().match( /[A-z]$/ );
        var zoneLetter = match ? match[ 0 ] : null;
        // Convert northing to negative notation if in Southern Hemisphere, because usng.js requires this.
        // If zoneLetter is used, ignore the hemisphere value.
        if ( zoneLetter ) {
            utm.zone = parseInt( utm.zone, 10 );
            utm.northing = zoneLetter.toUpperCase() < 'N' ? utm.northing - NORTHING_OFFSET : utm.northing;
        } else if ( utm.hemisphere === 'S' ) {
            utm.northing -= NORTHING_OFFSET
        }
        convertor.UTMtoLL( utm.northing, utm.easting, utm.zone, latLng );
        return {
            latitude: latLng.lat.toPrecision( PRECISION ),
            longitude: latLng.lon.toPrecision( PRECISION )
        };
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
        var utm;

        if ( !point ) {
            return;
        }

        lat = typeof point.latitude !== 'undefined' && point.latitude !== '' ? Number( point.latitude ).toPrecision( PRECISION ) : '';
        lng = typeof point.longitude !== 'undefined' && point.longitude !== '' ? Number( point.longitude ).toPrecision( PRECISION ) : '';
        alt = point.altitude || '';
        acc = point.accuracy || '';

        ev = ( typeof ev !== 'undefined' ) ? ev : 'change';

        this.$lat.val( lat );
        this.$lng.val( lng );
        this.$alt.val( alt );
        this.$acc.val( acc ).trigger( ev );

        // update secondary inputs without firing a change event
        this.$mgrs.val( convertor.LLtoMGRS( lat, lng, 5 ) );

        dms = this._latLngToDms( lat, lng, 5 );
        this.$latdms.find( 'input, select' ).each( function( index ) {
            this.value = dms.latitude[ index ];
        } );
        this.$lngdms.find( 'input, select' ).each( function( index ) {
            this.value = dms.longitude[ index ];
        } );

        utm = this._latLngToUtm( lat, lng );
        this.$zoneutm.val( utm.zone );
        this.$hemisphereutm.val( utm.hemisphere );
        this.$eastingutm.val( utm.easting );
        this.$northingutm.val( utm.northing );
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
                    .find( 'input, select:not([name="geo-input-type"]), textarea' ).prop( 'disabled', true )
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
                    .removeData( OVERRIDE_PLUGIN_NAME )
                    .off( '.' + this.namespace )
                    .show()
                    .next( '.widget' ).remove();
            } );
    };

    $.fn[ PLUGIN_NAME ] = function( options, event ) {

        return this.each( function() {
            var $this = $( this );
            var data = $( this ).data( OVERRIDE_PLUGIN_NAME );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( OVERRIDE_PLUGIN_NAME, new Geopicker( this, options, event ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': PLUGIN_NAME,
        'selector': 'input[data-type-xml="geopoint"]',
        'helpersRequired': [ 'arcGis', 'formClasses' ]
    };
} );
