'use strict';

var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );
var config = require( 'enketo-config' );
var convertor = require( './usng.js' );
var Promise = require( 'lie' );
var t = require( 'translator' ).t;
var PLUGIN_NAME = 'esriGeopicker';
var OVERRIDE_PLUGIN_NAME = 'geopicker';
var DEFAULT_BASEMAPS = typeof config.arcGis === 'object' && Array.isArray( config.arcGis.basemaps ) ? config.arcGis.basemaps : [ 'streets', 'satellite', 'topo' ];
var DEFAULT_HAS_Z = typeof config.arcGis === 'object' && typeof config.arcGis.hasZ === 'boolean' ? config.arcGis.hasZ : true;
var DEFAULT_WEBMAP_ID = typeof config.arcGis === 'object' && config.arcGis.webMapId ? config.arcGis.webMapId : undefined;
var ESRI_ARCGIS_JS_URL = typeof config.arcGis === 'object' && config.arcGis.jsUrl ? config.arcGis.jsUrl : 'https://js.arcgis.com/4.3/';
var ESRI_ARCGIS_CSS_URL = typeof config.arcGis === 'object' && config.arcGis.cssUrl ? config.arcGis.cssUrl : ESRI_ARCGIS_JS_URL + 'esri/css/main.css';
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
            // append CSS
            $( 'head' ).append( '<link type="text/css" rel="stylesheet" href="' + ESRI_ARCGIS_CSS_URL + '">' );
            // make the request for the Esri script asynchronously
            $.getScript( ESRI_ARCGIS_JS_URL )
                .done( function() {
                    // TODO: is it 100% sure that window.require is available at this point?
                    // The script has has loaded, but has it executed?
                    window.require( [
                        'esri/geometry/Point',
                        'esri/Map',
                        'esri/WebMap',
                        'esri/views/MapView',
                        'esri/widgets/BasemapToggle',
                        'esri/widgets/Locate',
                        'esri/widgets/Search'
                    ], function(
                        Point,
                        Map,
                        WebMap,
                        MapView,
                        BasemapToggle,
                        Locate,
                        Search
                    ) {
                        esri = {
                            Point: Point,
                            Map: Map,
                            WebMap: WebMap,
                            MapView: MapView,
                            BasemapToggle: BasemapToggle,
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
    var that = this;

    this._loadEsriArcGisJs()
        .then( function( mapScriptsAvailable ) {
            var $utms;
            that.mapSupported = mapScriptsAvailable;
            that.$question = $( that.element ).closest( '.question' );
            that.mapId = 'map' + Math.round( Math.random() * 10000000 );
            that.props = that._getProps();
            //that.mapNavigationDisabled = false;;
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
            that.$widget.find( '.toggle-map-visibility-btn' ).on( 'click', function() {
                that.$map.toggleClass( 'hide-map' );
                that._updateMap( that.points[ that.currentIndex ] );
            } );

            // handle input type switcher
            that.$inputTypeSwitcher.on( 'change', function() {
                var type = this.value;
                that._switchInputType( type );
                return false;
            } );

            // handle show/hide input switcher and set initial state
            // copy hide-input class from question to widget and add show/hide input controller
            that.$widget
                .toggleClass( 'hide-input', that.$question.hasClass( 'or-appearance-hide-input' ) )
                .find( '.toggle-input-visibility-btn' ).on( 'click', function() {
                    that.$widget.toggleClass( 'hide-input' );
                } );

            // handle click of "empty" button
            that.$widget.find( '[name="empty"]' ).on( 'click', function() {
                that._updateInputs( {} );
            } );

            // disable map navigation until user clicks map
            // using a hack until the ARCGis JS API has a way to do this programmatically.
            if ( that.mapSupported && !that.props.readonly ) {
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
            if ( !that._loadVal() ) {
                that.$detect.click();
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

/**
 * Loads a value from the original input element into the widget.
 * This function could be called upon intialization to load the default value.
 * It could also be called when the value has updated due a calculation.
 * 
 * @param  {[type]} val [description]
 * @return {[type]}     [description]
 */
Geopicker.prototype._loadVal = function( val ) {
    var that = this;
    var value = ( typeof val !== 'undefined' ) ? val : this.element.value.trim();

    if ( value && typeof value === 'string' ) {
        value.split( ';' ).forEach( function( geopoint, i ) {
            var point = {};
            geopoint.trim().split( ' ' ).forEach( function( coordinate, index ) {
                point[ [ 'latitude', 'longitude', 'altitude', 'accuracy' ][ index ] ] = Number( coordinate );
            } );
            that.points[ i ] = point;
        } );
        this._updateInputs( this.points[ this.currentIndex ] );
        // The map won't be updated automatically because the input value is considered to be unchanged
        that._updateMap( this.points[ this.currentIndex ] );
    }

    return value;
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
    var arcGisOptions = this.options.helpers.arcGis || {};
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
        readonly: this.element.readOnly,
        hasZ: typeof arcGisOptions.hasZ === 'boolean' ? arcGisOptions.hasZ : DEFAULT_HAS_Z,
        basemaps: Array.isArray( arcGisOptions.basemaps ) && arcGisOptions.basemaps.length > 0 ? arcGisOptions.basemaps : DEFAULT_BASEMAPS,
        webMapId: arcGisOptions.webMapId || this._getWebMapIdFromFormClasses( this.options.helpers.formClasses ) || DEFAULT_WEBMAP_ID
    };
};

/**
 * Adds the DOM elements
 */
Geopicker.prototype._addDomElements = function() {
    var centerMark = '<span class="center-mark esri-geopoint-marker" style="display:none;"> </span>';
    var toggleMapBtn = this.props.compact ? '<button type="button" class="toggle-map-visibility-btn"> </button>' : '';
    var toggleInputVisibilityBtn = '<button type="button" class="toggle-input-visibility-btn"> </button>';
    var locateBtn = this.props.detect ? '<button name="geodetect" type="button" tabindex="0" class="btn btn-default esri-locate esri-widget-button esri-widget esri-component">' +
        '<span aria-hidden="true" class="esri-icon esri-icon-locate" title="Find my location"></span></button>' : '';
    var map = '<div class="map-canvas-wrapper' + ( this.props.compact ? ' hide-map' : '' ) +
        '"><div class="interaction-blocker"></div><div class=map-canvas id="' +
        this.mapId + '"></div>' + centerMark + toggleMapBtn + '</div>';
    var latTxt = t( 'geopicker.latitude' );
    var lngTxt = t( 'geopicker.longitude' );
    var altTxt = t( 'geopicker.altitude' );
    var accTxt = t( 'geopicker.accuracy' );
    var decTxt = t( 'esri-geopicker.decimal' );
    var notAvTxt = t( 'esri-geopicker.notavailable' );
    var zHide = this.props.hasZ ? '' : ' alt-hide';
    var mgrsSelectorTxt = t( 'esri-geopicker.mgrs' );
    var utmSelectorTxt = t( 'esri-geopicker.utm' );
    var degSelectorTxt = t( 'esri-geopicker.degrees' );
    var mgrsLabelTxt = t( 'esri-geopicker.coordinate-mgrs' );
    var latDegTxt = t( 'esri-geopicker.latitude-degrees' );
    var lngDegTxt = t( 'esri-geopicker.longitude-degrees' );
    var utmZoneTxt = t( 'esri-geopicker.utm-zone' );
    var utmHemisphereTxt = t( 'esri-geopicker.utm-hemisphere' );
    var hemNorthTxt = t( 'esri-geopicker.utm-north' );
    var hemSouthTxt = t( 'esri-geopicker.utm-south' );
    var utmEastingTxt = t( 'esri-geopicker.utm-easting' );
    var utmNorthingTxt = t( 'esri-geopicker.utm-northing' );
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
        '</div>' + toggleInputVisibilityBtn +
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
    var webMapConfig = {
        basemap: this.props.basemaps[ 0 ],
        ground: 'world-elevation'
    };
    var firstTime = true;
    var fallback = true;

    if ( this.props.webMapId && this.props.webMapId !== 'null' ) {
        webMapConfig.portalItem = {
            id: this.props.webMapId
        };
        fallback = false;
    }
    map = new esri.WebMap( webMapConfig );

    map.load()
        .otherwise( function( error ) {
            console.error( 'error loading webmap with webmapId: ' + this.props.webMapId, error );
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

    if ( !window.map ) {
        window.map = map;
    }

    this.mapView = new esri.MapView( {
        map: map,
        container: that.mapId,
        zoom: ( fallback ) ? 2 : null
    } );

    that.mapUpdating = that.mapView;

    that._addUserPanHandler( that.mapView );

    // We need to add the "ignore" class to all inputs that arcGIS has added to avoid issues with Enketo's engine
    this.mapView.watch( 'ready', function( isReady ) {
        if ( isReady && firstTime ) {
            firstTime = false;
            that.$widget.find( '#' + that.mapId ).find( 'input, textarea, select' ).addClass( 'ignore' );
        }
    } );

    this._addEsriSearch( this.mapView );
    this._addEsriLocate( this.mapView );
    this._addBasemapToggle( that.mapView, this.props.basemaps );
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

    searchWidget.renderNow();

    searchWidget.on( 'search-complete', function( evt ) {
        var p;

        try {
            p = evt.results[ 0 ].results[ 0 ].extent.center;
            that._updateInputs( p );
        } catch ( err ) {
            console.log( err );
        }
    } );

    mapView.ui.add( searchWidget, {
        position: 'top-left',
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

    locateBtn.renderNow();

    locateBtn.on( 'locate', function( evt ) {
        that._updateInputs( evt.position.coords );
    } );

    mapView.ui.add( locateBtn, {
        position: 'top-left',
        index: 1
    } );
};

Geopicker.prototype._addBasemapToggle = function( mapView, basemapList ) {
    var that = this;
    var basemapToggle = new esri.BasemapToggle( {
        view: mapView,
        nextBasemap: that._getNextBasemap( mapView.map.basemap.id, basemapList )
    } );

    basemapToggle.renderNow();

    basemapToggle.on( 'toggle', function( evt ) {
        // If the supplied basemap is not valid, the evt on the next toggle returns null
        var currentId = ( evt && evt.current ) ? evt.current.id : null;
        var nextBasemap = that._getNextBasemap( currentId, basemapList );
        // TODO: it might be more efficient to maintain an array of Basemap instances
        // instead of strings. 
        basemapToggle.nextBasemap = nextBasemap;
    } );

    mapView.ui.add( basemapToggle, {
        position: "bottom-left"
    } );
};

Geopicker.prototype._getNextBasemap = function( currentBasemap, basemapList ) {
    var currentIndex;
    var nextBasemap = basemapList[ 0 ];

    if ( currentBasemap ) {
        currentIndex = basemapList.indexOf( currentBasemap );

        if ( currentIndex !== -1 && currentIndex !== basemapList.length - 1 ) {
            nextBasemap = basemapList[ currentIndex + 1 ];
        }
    }

    return nextBasemap;
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
        if ( newValue === true ) {
            that.mapUpdating
                .then( function() {
                    currentCenter = that._getMapCenter();
                    if ( !that._sameLatLng( currentCenter, that.points[ that.currentIndex ] ) ) {
                        // console.debug( 'stationary and not programmatically updating map' );
                        that._updateInputs( that._getMapCenter() );
                    } else {
                        // console.debug( 'map did not change' );
                    }
                } );
        }
    } );
};

Geopicker.prototype._updateDynamicMapView = function( point, zoom ) {
    var esriPoint;
    var currentCenter;
    var that = this;

    if ( point && this.mapView ) {
        this.mapUpdating = this.mapUpdating
            .then( function() {
                currentCenter = that._getMapCenter();
                if ( !that._isValidLatLng( point ) ) {
                    console.error( 'Not a valid geopoint. Not updating map' );
                    that._updateInputs( point );
                    that.$placemarker.hide();
                } else if ( !that._sameLatLng( point, currentCenter ) ) {
                    that.$placemarker.show();
                    esriPoint = new esri.Point( point );
                    return that.mapView.goTo( esriPoint )
                        .then( function( viewAnimation ) {
                            if ( viewAnimation ) {
                                return viewAnimation;
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
        utm.northing -= NORTHING_OFFSET;
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
    var that = this;
    // Due to async initialization, it is possible enable is called before it has initialized.
    this._loadEsriArcGisJs()
        .then( function() {
            if ( !that.props.readonly ) {
                $( element )
                    .next( '.widget' )
                    .removeClass( 'readonly' )
                    .find( 'input, select, textarea' ).prop( 'disabled', false )
                    .end()
                    .find( '.btn' ).prop( 'disabled', false );
            }
        } );
};

Geopicker.prototype.update = function( element ) {
    var that = this;
    this._loadEsriArcGisJs()
        .then( function() {
            that._loadVal( element.value );
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
