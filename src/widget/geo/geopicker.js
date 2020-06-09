import $ from 'jquery';
import Widget from '../../js/widget';
import config from 'enketo/config';
import L from 'leaflet';
import { t } from 'enketo/translator';
import support from '../../js/support';
import types from '../../js/types';
import dialog from 'enketo/dialog';
import { elementDataStore as data } from '../../js/dom-utils';
let googleMapsScriptRequest;

const defaultZoom = 15;
// MapBox TileJSON format
const maps = ( config && config.maps && config.maps.length > 0 ) ? config.maps : [ {
    'name': 'streets',
    'maxzoom': 24,
    'tiles': [ 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' ],
    'attribution': '© <a href="http://openstreetmap.org">OpenStreetMap</a> | <a href="www.openstreetmap.org/copyright">Terms</a>'
} ];
let searchSource = 'https://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true&key={api_key}';
const googleApiKey = config.googleApiKey || config.google_api_key;
const iconSingle = L.divIcon( {
    iconSize: 24,
    className: 'enketo-geopoint-marker'
} );
const iconMulti = L.divIcon( {
    iconSize: 16,
    className: 'enketo-geopoint-circle-marker'
} );
const iconMultiActive = L.divIcon( {
    iconSize: 16,
    className: 'enketo-geopoint-circle-marker-active'
} );

// Leaflet extensions.
import 'leaflet-draw';
import 'leaflet.gridlayer.googlemutant';

/**
 * @typedef LatLngArray
 * @description An array of two (or four) elements, `[0]` latitude and `[1]` longitude.
 * @property {string|number} 0 - Latitude
 * @property {string|number} 1 - Longitude
 * @property {string|number} [2] - Altitude
 * @property {string|number} [3] - Accuracy
 */

/**
 * @typedef LatLngObj
 * @property {number} lat - Latitude
 * @property {number} long - Longitude
 * @property {number} [alt] - Altitude
 * @property {number} [acc] - Accuracy
 */

/**
 * @augments Widget
 */
class Geopicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input[data-type-xml="geopoint"], .question input[data-type-xml="geotrace"], .question input[data-type-xml="geoshape"]';
    }

    /**
     * @param {Element} element - The element to instantiate the widget on
     * @return {boolean} To instantiate or not to instantiate, that is the question.
     */
    static condition( element ) {
        // Allow geopicker and ArcGIS geopicker to be used in same form
        return !data.has( element, 'ArcGisGeopicker' );
    }

    _init() {
        const loadedVal = this.originalInputValue;
        const that = this;

        this.$form = $( this.element ).closest( 'form.or' );
        this.$question = $( this.element ).closest( '.question' );

        this.mapId = Math.round( Math.random() * 10000000 );

        this._addDomElements();
        this.currentIndex = 0;
        this.points = [];

        // load default value
        if ( loadedVal ) {
            this.value = loadedVal;
        }

        // handle point input changes
        this.$widget.find( '[name="lat"], [name="long"], [name="alt"], [name="acc"]' ).on( 'change change.bymap change.bysearch', event => {
            const lat = that.$lat.val() ? Number( that.$lat.val() ) : '';
            const lng = that.$lng.val() ? Number( that.$lng.val() ) : '';
            // we need to avoid a missing alt in case acc is not empty!
            const alt = that.$alt.val() ? Number( that.$alt.val() ) : '';
            const acc = that.$acc.val() ? Number( that.$acc.val() ) : '';
            const latLng = {
                lat,
                lng
            };

            event.stopImmediatePropagation();

            // if the points array contains empty points, skip the intersection check, it will be done before closing the polygon
            if ( event.namespace !== 'bymap' && event.namespace !== 'bysearch' && that.polyline && that.props.type === 'geoshape' && !that.containsEmptyPoints( that.points, that.currentIndex ) && that.updatedPolylineWouldIntersect( latLng, that.currentIndex ) ) {
                that._showIntersectError();
                that._updateInputs( that.points[ that.currentIndex ], 'nochange' );
            } else {
                that._editPoint( [ lat, lng, alt, acc ] );

                if ( event.namespace !== 'bysearch' && that.$search ) {
                    that.$search.val( '' );
                }
            }
        } );

        // handle KML input changes
        this.$kmlInput.on( 'change', function( event ) {
            const $addPointBtn = that.$points.find( '.addpoint' );
            const $progress = $( this ).prev( '.paste-progress' ).removeClass( 'hide' );
            const value = event.target.value;
            const coords = that._convertKmlCoordinatesToLeafletCoordinates( value );

            // reset textarea
            event.target.value = '';

            setTimeout( () => {
                // mimic manual input point-by-point
                coords.forEach( ( latLng, index ) => {
                    that._updateInputs( latLng );
                    if ( index < coords.length - 1 ) {
                        $addPointBtn.click();
                    }
                } );
                // remove progress bar;
                $progress.remove();
                // switch to points input mode
                that._switchInputType( 'points' );
            }, 10 );
        } );

        // handle input switcher
        this.$widget.find( '.toggle-input-type-btn' ).on( 'click', () => {
            const type = that.$inputGroup.hasClass( 'kml-input-mode' ) ? 'points' : 'kml';
            that._switchInputType( type );

            return false;
        } );

        // handle original input changes
        $( this.element )
            .on( 'change', function() {
                that.$kmlInput.prop( 'disabled', !!this.value );
            } )
            .on( 'applyfocus', () => {
                that.$widget[ 0 ].querySelector( 'input' ).focus();
            } );

        // handle point switcher
        this.$points.on( 'click', '.point', function() {
            that._setCurrent( that.$points.find( '.point' ).index( $( this ) ) );
            that._switchInputType( 'points' );

            return false;
        } );

        // handle addpoint button click
        this.$points.find( '.addpoint' ).on( 'click', () => {
            that._addPoint();

            return false;
        } );

        // handle polygon close button click
        this.$widget.find( '.close-chain-btn' ).on( 'click', () => {
            that._closePolygon();

            return false;
        } );

        // handle point remove click
        this.$widget.find( '.btn-remove' ).on( 'click', () => {
            if ( that.points.length < 2 ) {
                that._updateInputs( [] );
            } else {
                dialog.confirm( t( 'geopicker.removePoint' ) )
                    .then( confirmed => {
                        if ( confirmed ) {
                            that._removePoint();
                        }
                    } )
                    .catch( () => {} );
            }
        } );

        // handle fullscreen map button click
        this.$map.find( '.show-map-btn' ).on( 'click', () => {
            that.$widget.find( '.search-bar' ).removeClass( 'hide-search' );
            that.$widget.addClass( 'full-screen' );
            that._updateMap();

            return false;
        } );

        // ensure all tiles are displayed when revealing page, https://github.com/kobotoolbox/enketo-express/issues/188
        // remove handler once it has been used
        this.$form.on( `pageflip.map${this.mapId}`, event => {
            if ( that.map && $.contains( event.target, that.element ) ) {
                that.map.invalidateSize();
                that.$form.off( `pageflip.map${that.mapId}` );
            }
        } );

        // add wide class if question is wide
        if ( this.props.wide ) {

            this.$widget.addClass( 'wide' );
        }

        // copy hide-input class from question to widget and add show/hide input controller
        this.$widget
            .toggleClass( 'hide-input', this.$question.hasClass( 'or-appearance-hide-input' ) )
            .find( '.toggle-input-visibility-btn' ).on( 'click', function() {
                that.$widget.toggleClass( 'hide-input' );
                $( this ).toggleClass( 'open', that.$widget.hasClass( 'hide-input' ) );
                if ( that.map ) {
                    that.map.invalidateSize( false );
                }
            } ).toggleClass( 'open', that.$widget.hasClass( 'hide-input' ) );

        // hide map controller
        this.$widget.find( '.hide-map-btn' ).on( 'click', () => {
            that.$widget.find( '.search-bar' ).addClass( 'hide-search' );
            that.$widget.removeClass( 'full-screen' ).find( '.map-canvas' ).removeClass( 'leaflet-container' )
                .find( '.leaflet-google-layer' ).remove();
            if ( that.map ) {
                that.map.remove();
                that.map = null;
                that.polygon = null;
                that.polyline = null;
            }

            return false;
        } );

        // enable search
        if ( this.props.search ) {
            this._enableSearch();
        }

        // enable detection
        if ( this.props.detect ) {
            this._enableDetection();
        }

        if ( this.props.readonly ) {
            this.disable();
        }

        // create "point buttons"
        if ( loadedVal ) {
            this.points.forEach( () => {
                that._addPointBtn();
            } );
        } else {
            this._addPoint();
        }

        // set map location on load
        if ( !loadedVal ) {
            // set worldview in case permissions take too long (e.g. in FF);
            this._updateMap( [ 0, 0 ], 1 );
            if ( this.props.detect ) {
                navigator.geolocation.getCurrentPosition( position => {
                    that._updateMap( [ position.coords.latitude, position.coords.longitude ], defaultZoom );
                } );
            }
        } else {
            // center map around first loaded geopoint value
            //this._updateMap( L.latLng( this.points[ 0 ][ 0 ], this.points[ 0 ][ 1 ] ) );
            this._updateMap();
            this._setCurrent( this.currentIndex );
        }
    }

    /**
     * @param {string} type - Type of input to switch to
     */
    _switchInputType( type ) {
        if ( type === 'kml' ) {
            this.$inputGroup.addClass( 'kml-input-mode' );
        } else if ( type === 'points' ) {
            this.$inputGroup.removeClass( 'kml-input-mode' );
        }
    }

    /**
     * Adds a point button in the point navigation bar
     */
    _addPointBtn() {
        this.$points.find( '.addpoint' ).before( '<a href="#" class="point" aria-label="point"> </a>' );
    }

    /**
     * Adds the DOM elements
     */
    _addDomElements() {
        const map = `<div class="map-canvas-wrapper"><div class=map-canvas id="map${this.mapId}"></div></div>`;
        const points = '<div class="points"><button type="button" class="addpoint">+</button></div>';
        const kml = `
            <a href="#" class="toggle-input-type-btn">
                <span class="kml-input">KML</span>
                <span class="points-input" data-i18n="geopicker.points">${t( 'geopicker.points' )}</span>
            </a>
            <label class="geo kml">
                <span data-i18n="geopicker.kmlcoords">${t( 'geopicker.kmlcoords' )}</span>
                <progress class="paste-progress hide"></progress>
                <textarea class="ignore" name="kml" placeholder="${ t( 'geopicker.kmlpaste' )}" data-i18n="geopicker.kmlpaste"></textarea>
                <span class="disabled-msg">remove all points to enable</span>
            </label>`;

        const close = `<button type="button" class="close-chain-btn btn btn-default btn-xs" data-i18n="geopicker.closepolygon">${t( 'geopicker.closepolygon' )}</button>`;
        const mapBtn = '<button type="button" class="show-map-btn btn btn-default">Map</button>';

        this.$widget = $(
            `<div class="geopicker widget">
                <div class="search-bar hide-search no-map no-detect">
                    <button type="button" class="hide-map-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>
                    <button name="geodetect" type="button" class="btn btn-default" title="detect current location" data-placement="top"><span class="icon icon-crosshairs"> </span></button>
                    <div class="input-group">
                        <input class="geo ignore" name="search" type="text" placeholder="${t( 'geopicker.searchPlaceholder' )}" data-i18n="geopicker.searchPlaceholder" disabled="disabled"/>
                        <button type="button" class="btn btn-default search-btn"><i class="icon icon-search"> </i></button>
                    </div>
                </div>
                <div class="geo-inputs">
                    <label class="geo lat">
                        <span data-i18n="geopicker.latitude">${t( 'geopicker.latitude' )}</span>
                        <input class="ignore" name="lat" type="number" step="0.000001" min="-90" max="90"/>
                    </label>
                    <label class="geo long">
                        <span data-i18n="geopicker.longitude">${t( 'geopicker.longitude' )}</span>
                        <input class="ignore" name="long" type="number" step="0.000001" min="-180" max="180"/>
                    </label>
                    <label class="geo alt">
                        <span data-i18n="geopicker.altitude">${t( 'geopicker.altitude' )}</span>
                        <input class="ignore" name="alt" type="number" step="0.1" />
                    </label>
                    <label class="geo acc">
                        <span data-i18n="geopicker.accuracy">${t( 'geopicker.accuracy' )}</span>
                        <input class="ignore" name="acc" type="number" step="0.1" />
                    </label>
                    <button type="button" class="btn-icon-only btn-remove" aria-label="remove"><span class="icon icon-trash"> </span></button>
                </div>
            </div>`
        );

        // add the detection button
        if ( this.props.detect ) {
            this.$widget.find( '.search-bar' ).removeClass( 'no-detect' );
            this.$detect = this.$widget.find( 'button[name="geodetect"]' );
        }

        this.$search = this.$widget.find( '[name="search"]' );
        this.$inputGroup = this.$widget.find( '.geo-inputs' );

        // add the map canvas
        if ( this.props.map ) {
            this.$widget.find( '.search-bar' ).removeClass( 'no-map' ).after( map );
            this.$map = this.$widget.find( '.map-canvas' );
            // add the hide/show inputs button
            this.$map.parent().append( '<button type="button" class="toggle-input-visibility-btn" aria-label="toggle input"> </button>' );
        } else {
            this.$map = $();
        }

        // touchscreen maps
        if ( this.props.touch && this.props.map ) {
            this.$map.append( mapBtn );
        }

        // unhide search bar
        // TODO: can be done in CSS?
        if ( !this.props.touch ) {
            this.$widget.find( '.search-bar' ).removeClass( 'hide-search' );
        }

        // if geoshape or geotrace
        if ( this.props.type !== 'geopoint' ) {
            // add points bar
            this.$points = $( points );
            this.$widget.prepend( this.$points );
            // add polygon 'close' button
            if ( this.props.type === 'geoshape' ) {
                this.$inputGroup.append( close );
            }
            // add KML paste textarea;
            const $kml = $( kml );
            this.$kmlInput = $kml.find( '[name="kml"]' );
            this.$inputGroup.prepend( $kml );
        } else {
            this.$points = $();
            this.$kmlInput = $();
        }

        this.$lat = this.$widget.find( '[name="lat"]' );
        this.$lng = this.$widget.find( '[name="long"]' );
        this.$alt = this.$widget.find( '[name="alt"]' );
        this.$acc = this.$widget.find( '[name="acc"]' );


        $( this.element ).hide().after( this.$widget ).parent().addClass( 'clearfix' );
    }

    /**
     * Updates the value in the original input element.
     *
     * @return {boolean} Whether the value was changed.
     */
    _updateValue() {
        this._markAsValid();
        const oldValue = this.originalInputValue;
        const newValue = this.value;

        // console.log( 'updating value by joining', this.points, 'old value', oldValue, 'new value', newValue );

        if ( oldValue !== newValue ) {
            this.originalInputValue = newValue;

            return true;
        } else {
            return false;
        }
    }

    /**
     * Checks an Openrosa geopoint for validity. This function is used to provide more detailed
     * error feedback than provided by the form controller. This can be used to pinpoint the exact
     * invalid geopoints in a list of geopoints (the form controller only validates the total list).
     *
     * @param {string} geopoint - Geopoint to check
     * @return {boolean} Whether geopoint is valid.
     */
    _isValidGeopoint( geopoint ) {
        return geopoint ? types.geopoint.validate( geopoint ) : false;
    }

    /**
     * Validates a list of latLng Arrays or Objects.
     *
     * @param {Array<LatLngArray|LatLngObj>} latLngs - Array of latLng objects or arrays.
     * @return {boolean} Whether list is valid or not.
     */
    _isValidLatLngList( latLngs ) {
        const that = this;

        return latLngs.every( ( latLng, index, array ) => that._isValidLatLng( latLng ) || ( latLng.join() === '' && index === array.length - 1 ) );
    }

    /**
     * @param {LatLngArray|LatLngObj} latLng - Geo array or object to clean
     */
    _cleanLatLng( latLng ) {
        if ( Array.isArray( latLng ) ) {
            return [ latLng[ 0 ], latLng[ 1 ] ];
        }

        return latLng;
    }

    /**
     * Validates an individual latlng Array or Object
     *
     * @param {LatLngArray|LatLngObj} latLng - latLng object or array
     * @return {boolean} Whether latLng is valid or not
     */
    _isValidLatLng( latLng ) {
        const lat = ( typeof latLng[ 0 ] === 'number' ) ? latLng[ 0 ] : ( typeof latLng.lat === 'number' ) ? latLng.lat : null;
        const lng = ( typeof latLng[ 1 ] === 'number' ) ? latLng[ 1 ] : ( typeof latLng.lng === 'number' ) ? latLng.lng : null;

        // This conversion seems backwards, but it is helpful to have only one place where geopoints are validated.
        return types.geopoint.validate( [ lat, lng ].join( ' ' ) );
    }

    /**
     * Marks a point as invalid in the points navigation bar
     *
     * @param {number} index - Index of point
     */
    _markAsInvalid( index ) {
        this.$points.find( '.point' ).eq( index ).addClass( 'has-error' );
    }

    /**
     * Marks all points as valid in the points navigation bar
     */
    _markAsValid() {
        this.$points.find( '.point' ).removeClass( 'has-error' );
    }

    /**
     * Changes the current point in the list of points
     *
     * @param {number} index - The index to set to current
     */
    _setCurrent( index ) {
        this.currentIndex = index;
        this.$points.find( '.point' ).removeClass( 'active' ).eq( index ).addClass( 'active' );
        this._updateInputs( this.points[ index ], '' );
        // make sure that the current marker is marked as active
        if ( this.map && ( !this.props.touch || this._inFullScreenMode() ) ) {
            this._updateMarkers();
        }
        // console.debug( 'set current index to ', this.currentIndex );
    }

    /**
     * Enables geo detection using the built-in browser geoLocation functionality
     */
    _enableDetection() {
        const that = this;
        const options = {
            enableHighAccuracy: true,
            maximumAge: 0
        };
        this.$detect.click( event => {
            event.preventDefault();
            navigator.geolocation.getCurrentPosition( position => {
                const latLng = {
                    lat: Math.round( position.coords.latitude * 1000000 ) / 1000000,
                    lng: Math.round( position.coords.longitude * 1000000 ) / 1000000
                };

                if ( that.polyline && that.props.type === 'geoshape' && that.updatedPolylineWouldIntersect( latLng, that.currentIndex ) ) {
                    that._showIntersectError();
                } else {
                    //that.points[that.currentIndex] = [ position.coords.latitude, position.coords.longitude ];
                    //that._updateMap( );
                    that._updateInputs( [ latLng.lat, latLng.lng, position.coords.altitude, position.coords.accuracy ] );
                    // if current index is last of points, automatically create next point
                    if ( that.currentIndex === that.points.length - 1 && that.props.type !== 'geopoint' ) {
                        that._addPoint();
                    }
                }
            }, () => {
                console.error( 'error occurred trying to obtain position' );
            }, options );

            return false;
        } );
    }

    /**
     * Enables search functionality using the Google Maps API v3
     * This only changes the map view. It does not record geopoints.
     */
    _enableSearch() {
        const that = this;

        if ( googleApiKey ) {
            searchSource = searchSource.replace( '{api_key}', googleApiKey );
        } else {
            searchSource = searchSource.replace( '&key={api_key}', '' );
        }

        this.$search
            .prop( 'disabled', false )
            .on( 'change', function( event ) {
                let address = $( this ).val();
                event.stopImmediatePropagation();

                if ( address ) {
                    address = address.split( /\s+/ ).join( '+' );
                    $
                        .get( searchSource.replace( '{address}', address ), response => {
                            let latLng;
                            if ( response.results && response.results.length > 0 && response.results[ 0 ].geometry && response.results[ 0 ].geometry.location ) {
                                latLng = response.results[ 0 ].geometry.location;
                                that._updateMap( [ latLng.lat, latLng.lng ], defaultZoom );
                                that.$search.closest( '.input-group' ).removeClass( 'has-error' );
                            } else {
                                //TODO: add error message
                                that.$search.closest( '.input-group' ).addClass( 'has-error' );
                                console.warn( `Location "${address}" not found` );
                            }
                        }, 'json' )
                        .fail( () => {
                            //TODO: add error message
                            that.$search.closest( '.input-group' ).addClass( 'has-error' );
                            console.error( 'Error. Geocoding service may not be available or app is offline' );
                        } )
                        .always( () => {

                        } );
                }
            } );
    }

    /**
     * @return {boolean} Whether map is available for manipulation
     */
    _dynamicMapAvailable() {
        return !!this.map;
    }

    /**
     * @return {boolean} Whether map is in fullscreen mode
     */
    _inFullScreenMode() {
        return this.$widget.hasClass( 'full-screen' );
    }

    /**
     * Updates the map to either show the provided coordinates (in the center), with the provided zoom level
     * or update any markers, polylines, or polygons.
     *
     * @param {LatLngArray|LatLngObj} latLng - Latitude and longitude coordinates
     * @param {number} [zoom] - zoom level
     */
    _updateMap( latLng, zoom ) {
        const that = this;

        // check if the widget is supposed to have a map
        if ( !this.props.map ) {
            return;
        }

        // determine zoom level
        if ( !zoom ) {
            if ( this.map ) {
                // note: there are conditions where getZoom returns undefined!
                zoom = this.map.getZoom() || defaultZoom;
            } else {
                zoom = defaultZoom;
            }
        }

        // update last requested map coordinates to be used to initialize map in mobile fullscreen view
        if ( latLng ) {
            this.lastLatLng = latLng;
            this.lastZoom = zoom;
        }

        // update the map if it is visible
        if ( !this.props.touch || this._inFullScreenMode() ) {
            this.loadMap = this.loadMap || this._addDynamicMap();
            this.loadMap
                .then( () => {
                    that._updateDynamicMapView( latLng, zoom );
                } );

        }
    }

    /**
     * @return {Promise} A Promise that resolves with undefined.
     */
    _addDynamicMap() {
        const that = this;

        return this._getLayers()
            .then( layers => {
                const options = {
                    layers: that._getDefaultLayer( layers )
                };

                that.map = L.map( `map${that.mapId}`, options )
                    .on( 'click', e => {
                        let latLng;
                        let indexToPlacePoint;

                        if ( that.props.readonly ) {
                            return false;
                        }

                        latLng = e.latlng;
                        indexToPlacePoint = ( that.$lat.val() && that.$lng.val() ) ? that.points.length : that.currentIndex;

                        // reduce precision to 6 decimals
                        latLng.lat = Math.round( latLng.lat * 1000000 ) / 1000000;
                        latLng.lng = Math.round( latLng.lng * 1000000 ) / 1000000;

                        // Skip intersection check if points contain empties. It will be done later, before the polygon is closed.
                        if ( that.props.type === 'geoshape' && !that.containsEmptyPoints( that.points, indexToPlacePoint ) && that.updatedPolylineWouldIntersect( latLng, indexToPlacePoint ) ) {
                            that._showIntersectError();
                        } else {
                            if ( !that.$lat.val() || !that.$lng.val() || that.props.type === 'geopoint' ) {
                                that._updateInputs( latLng, 'change.bymap' );
                            } else if ( that.$lat.val() && that.$lng.val() ) {
                                that._addPoint();
                                that._updateInputs( latLng, 'change.bymap' );
                            } else {
                                // do nothing if the field has a current marker
                                // instead the user will have to drag to change it by map
                            }
                        }
                    } );

                // watch out, default "Leaflet" link clicks away from page, loosing all data
                that.map.attributionControl.setPrefix( '' );

                // add layer control
                if ( layers.length > 1 ) {
                    L.control.layers( that._getBaseLayers( layers ), null ).addTo( that.map );
                }

                // change default leaflet layer control button
                that.$widget.find( '.leaflet-control-layers-toggle' ).append( '<span class="icon icon-globe"></span>' );

                // Add ignore and option-label class to Leaflet-added input elements and their labels
                // something weird seems to happen. It seems the layercontrol is added twice (second replacing first)
                // which means the classes are not present in the final control.
                // Using the baselayerchange event handler is a trick that seems to work.
                that.map.on( 'baselayerchange', () => {
                    that.$widget.find( '.leaflet-control-container input' ).addClass( 'ignore no-unselect' ).next( 'span' ).addClass( 'option-label' );
                } );
            } );
    }

    /**
     * @param {LatLngArray|LatLngObj} latLng - Latitude and longitude coordinates
     * @param {number} [zoom] - zoom level
     */
    _updateDynamicMapView( latLng, zoom ) {
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
    }

    /**
     * Displays intersect error
     */
    _showIntersectError() {
        dialog.alert( t( 'geopicker.bordersintersectwarning' ) );
    }

    /**
     * Obtains the tile layers according to the definition in the app configuration.
     *
     * @return {Promise} A promise that resolves with the map layers.
     */
    _getLayers() {
        const that = this;
        const tasks = [];

        maps.forEach( ( map, index ) => {
            if ( typeof map.tiles === 'string' && /^GOOGLE_(SATELLITE|ROADMAP|HYBRID|TERRAIN)/.test( map.tiles ) ) {
                tasks.push( that._getGoogleTileLayer( map, index ) );
            } else
            if ( map.tiles ) {
                tasks.push( that._getLeafletTileLayer( map, index ) );
            } else {
                console.error( 'Configuration error for map tiles. Not a valid tile layer: ', map );
            }
        } );

        return Promise.all( tasks );
    }

    /**
     * Asynchronously (fake) obtains a Leaflet/Mapbox tilelayer
     *
     * @param {object} map - Map layer as defined in the apps configuration.
     * @param {number} index - The index of the layer.
     * @return {Promise} A promise that resolves with a Leaflet tile layer.
     */
    _getLeafletTileLayer( map, index ) {
        let url;
        const options = this._getTileOptions( map, index );

        // randomly pick a tile source from the array and store it in the maps config
        // so it will be re-used when the form is reset or multiple geo widgets are created
        map.tileIndex = ( map.tileIndex === undefined ) ? Math.round( Math.random() * 100 ) % map.tiles.length : map.tileIndex;
        url = map.tiles[ map.tileIndex ];

        return Promise.resolve( L.tileLayer( url, options ) );
    }

    /**
     * Asynchronously obtains a Google Maps tilelayer
     *
     * @param {object} map - Map layer as defined in the apps configuration.
     * @param {number} index - The index of the layer.
     * @return {Promise} A promise that resolves with a Google Maps layer.
     */
    _getGoogleTileLayer( map, index ) {
        const options = this._getTileOptions( map, index );
        // valid values for type are 'roadmap', 'satellite', 'terrain' and 'hybrid'
        options.type = map.tiles.substring( 7 ).toLowerCase();

        return this._loadGoogleMapsScript()
            .then( () => L.gridLayer.googleMutant( options ) );
    }

    /**
     * Creates the tile layer options object from the maps configuration and defaults.
     *
     * @param {object} map - Map layer as defined in the apps configuration.
     * @param {number} index - The index of the layer.
     * @return {{id: string, maxZoom: number, minZoom: number, name: string, attribution: string}} Tilelayer options object
     */
    _getTileOptions( map, index ) {
        const name = map.name || `map-${index + 1}`;

        return {
            id: map.id || name,
            maxZoom: map.maxzoom || 18,
            minZoom: map.minzoom || 0,
            name,
            attribution: map.attribution || ''
        };
    }

    /**
     * Loader for the Google Maps script that can be called multiple times, but will ensure the
     * script is only requested once.
     *
     * @return {Promise} A promise that resolves with undefined.
     */
    _loadGoogleMapsScript() {
        // request Google maps script only once, using a variable outside of the scope of the current widget
        // in case multiple widgets exist in the same form
        if ( !googleMapsScriptRequest ) {
            // create deferred object, also outside of the scope of the current widget
            googleMapsScriptRequest = new Promise( resolve => {
                let apiKeyQueryParam, loadUrl;

                // create a global callback to be called by the Google Maps script once this has loaded
                window.gmapsLoaded = () => {
                    // clean up the global function
                    delete window.gmapsLoaded;
                    // resolve the deferred object
                    resolve();
                };
                // make the request for the Google Maps script asynchronously
                apiKeyQueryParam = ( googleApiKey ) ? `&key=${googleApiKey}` : '';
                loadUrl = `https://maps.google.com/maps/api/js?v=3.exp${apiKeyQueryParam}&libraries=places&callback=gmapsLoaded`;
                $.getScript( loadUrl );
            } );
        }

        // return the promise of the deferred object outside of the scope of the current widget
        return googleMapsScriptRequest;
    }

    /**
     * @param {Array<object>} layers - Map layers
     * @return {object} Default layer
     */
    _getDefaultLayer( layers ) {
        let defaultLayer;
        const that = this;

        layers.reverse().some( layer => {
            defaultLayer = layer;

            return that.props.appearances.some( appearance => appearance === layer.options.name );
        } );

        return defaultLayer;
    }

    /**
     * @param {Array<object>} layers - Map layers
     * @return {Array<object>} Base layers
     */
    _getBaseLayers( layers ) {
        const baseLayers = {};

        layers.forEach( layer => {
            baseLayers[ layer.options.name ] = layer;
        } );

        return baseLayers;
    }

    /**
     * Updates the markers on the dynamic map from the current list of points.
     */
    _updateMarkers() {
        const coords = [];
        const markers = [];
        const that = this;

        // console.debug( 'updating markers', this.points );

        if ( this.markerLayer ) {
            this.markerLayer.clearLayers();
        }

        if ( this.points.length < 2 && this.points[ 0 ].join() === '' ) {
            return;
        }

        this.points.forEach( ( latLng, index ) => {
            const icon = that.props.type === 'geopoint' ? iconSingle : ( index === that.currentIndex ? iconMultiActive : iconMulti );
            if ( that._isValidLatLng( latLng ) ) {
                coords.push( that._cleanLatLng( latLng ) );
                markers.push( L.marker( that._cleanLatLng( latLng ), {
                    icon,
                    clickable: !that.props.readonly,
                    draggable: !that.props.readonly,
                    alt: index,
                    opacity: 0.9
                } ).on( 'click', e => {
                    if ( e.target.options.alt === 0 && that.props.type === 'geoshape' ) {
                        that._closePolygon();
                    } else {
                        that._setCurrent( e.target.options.alt );
                    }
                } ).on( 'dragend', e => {
                    const latLng = e.target.getLatLng(),
                        index = e.target.options.alt;

                    // reduce precision to 6 decimals
                    latLng.lat = Math.round( latLng.lat * 1000000 ) / 1000000;
                    latLng.lng = Math.round( latLng.lng * 1000000 ) / 1000000;

                    if ( that.polyline && that.props.type === 'geoshape' && that.updatedPolylineWouldIntersect( latLng, index ) ) {
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
                console.warn( 'this latLng was not considered valid', latLng );
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
    }

    /**
     * Updates the polyline on the dynamic map from the current list of points
     */
    _updatePolyline() {
        let polylinePoints;
        const that = this;

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

        polylinePoints = polylinePoints.map( point => that._cleanLatLng( point ) );

        if ( !this.polyline ) {
            this.polyline = L.polyline( polylinePoints, {
                color: 'red'
            } );
            this.map.addLayer( this.polyline );
        } else {
            this.polyline.setLatLngs( polylinePoints );
        }

        // possible bug in Leaflet, using timeout to work around
        setTimeout( () => {
            that.map.fitBounds( that.polyline.getBounds() );
        }, 0 );
    }

    /**
     * Updates the polygon on the dynamic map from the current list of points.
     * A polygon is a type of polyline. This function is ALWAYS called by _updatePolyline.
     */
    _updatePolygon() {
        let polygonPoints;
        const that = this;

        if ( this.props.type === 'geopoint' || this.props.type === 'geotrace' ) {
            return;
        }

        // console.log( 'updating polygon' );
        polygonPoints = ( this.points[ this.points.length - 1 ].join( '' ) !== '' ) ? this.points : this.points.slice( 0, this.points.length - 1 );

        polygonPoints = polygonPoints.map( point => that._cleanLatLng( point ) );

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
    }

    /**
     * Updates the area in m2 shown inside a polygon.
     *
     * @param {Array<LatLngObj>} points - A polygon.
     */
    _updateArea( points ) {
        let area;
        let readableArea;

        if ( points.length > 2 ) {
            const latLngs = points.map( point => ( {
                lat: point[ 0 ],
                lng: point[ 1 ]
            } ) );
            area = L.GeometryUtil.geodesicArea( latLngs );
            readableArea = L.GeometryUtil.readableArea( area, true );

            L
                .popup( {
                    className: 'enketo-area-popup'
                } )
                .setLatLng( this.polygon.getBounds().getCenter() )
                .setContent( readableArea )
                .openOn( this.map );
        } else {
            this.map.closePopup();
        }
    }

    /**
     * Adds a point.
     */
    _addPoint() {
        this._addPointBtn();
        this.points.push( [] );
        this._setCurrent( this.points.length - 1 );
        this._updateValue();
    }

    /**
     * Edits a point in the list of points.
     *
     * @param {LatLngArray|LatLngObj} latLng - LatLng object or array.
     * @return {boolean} Whether point changed.
     */
    _editPoint( latLng ) {
        let changed;

        this.points[ this.currentIndex ] = latLng;

        changed = this._updateValue();

        if ( changed ) {
            this._updateMap();
        }

        return changed;
    }

    /**
     * Removes the current point.
     */
    _removePoint() {
        let newIndex = this.currentIndex;
        this.points.splice( this.currentIndex, 1 );
        this._updateValue();
        this.$points.find( '.point' ).eq( this.currentIndex ).remove();
        if ( typeof this.points[ this.currentIndex ] === 'undefined' ) {
            newIndex = this.currentIndex - 1;
        }
        this._setCurrent( newIndex );
        // this will call updateMarkers for the second time which is not so efficient
        this._updateMap();
    }

    /**
     * Closes polygon
     */
    _closePolygon() {
        const lastPoint = this.points[ this.points.length - 1 ];
        // console.debug( 'closing polygon' );

        // check if chain can be closed
        if ( this.points.length < 3 || ( this.points.length === 3 && !this._isValidLatLng( this.points[ 2 ] ) ) || ( JSON.stringify( this.points[ 0 ] ) === JSON.stringify( lastPoint ) ) ) {
            return;
        }

        // determine which point the make the closing point
        // if the last point is not a valid point, assume the user wants to use this to close
        // otherwise create a new point.
        if ( !this._isValidLatLng( lastPoint ) ) {
            //console.log( 'current last point is not a valid point, so will use this as closing point' );
            this.currentIndex = this.points.length - 1;
        } else {
            //console.log( 'current last point is valid, so will create a new one to use to close' );
            this._addPoint();
        }

        // final check to see if there are intersections
        if ( this.polyline && !this.containsEmptyPoints( this.points, this.points.length ) && this.updatedPolylineWouldIntersect( this.points[ 0 ], this.currentIndex ) ) {
            return this._showIntersectError();
        }

        this._updateInputs( this.points[ 0 ] );
    }

    /**
     * Updates the (fake) input element for latitude, longitude, altitude and accuracy.
     *
     * @param {LatLngArray|LatLngObj} coords - Latitude, longitude, altitude and accuracy.
     * @param {string} [ev] - Event to dispatch.
     */
    _updateInputs( coords, ev ) {
        const lat = coords[ 0 ] || coords.lat || '';
        const lng = coords[ 1 ] || coords.lng || '';
        const alt = coords[ 2 ] || coords.alt || '';
        const acc = coords[ 3 ] || coords.acc || '';

        ev = ( typeof ev !== 'undefined' ) ? ev : 'change';

        this.$lat.val( lat || '' );
        this.$lng.val( lng || '' );
        this.$alt.val( alt || '' );
        this.$acc.val( acc || '' ).trigger( ev );
    }

    /**
     * Converts the contents of a single KML <coordinates> element (may inlude the coordinates tags as well) to an array
     * of geopoint coordinates used in the ODK XForm format. Note that the KML format does not allow spaces within a tuple of coordinates
     * only between. Separator between KML tuples can be newline, space or a combination.
     * It only extracts the value of the first <coordinates> element or, if <coordinates> are not included from the whole string.
     *
     * @param {string} kmlCoordinates - KML coordinates XML element or its content
     * @return {Array<Array<number>>} Array of geopoint coordinates
     */
    _convertKmlCoordinatesToLeafletCoordinates( kmlCoordinates ) {
        const coordinates = [];
        const reg = /<\s?coordinates>(([^<]|\n)*)<\/\s?coordinates\s?>/;
        const tags = reg.test( kmlCoordinates );

        kmlCoordinates = ( tags ) ? kmlCoordinates.match( reg )[ 1 ] : kmlCoordinates;
        kmlCoordinates.trim().split( /\s+/ ).forEach( item => {
            const coordinate = [];

            item.split( ',' ).forEach( ( c, index ) => {
                const value = Number( c );
                if ( index === 0 ) {
                    coordinate[ 1 ] = value;
                } else if ( index === 1 ) {
                    coordinate[ 0 ] = value;
                } else if ( index === 2 ) {
                    coordinate[ 2 ] = value;
                }
            } );

            coordinates.push( coordinate );
        } );

        return coordinates;
    }

    /**
     * Check if a polyline created from the current collection of points
     * where one point is added or edited would have intersections.
     *
     * @param {LatLngArray|LatLngObj} latLng - An object or array notation of point.
     * @param {number} index - Index of point to test.
     * @return {boolean} Whether polyline would have intersections.
     */
    updatedPolylineWouldIntersect( latLng, index ) {
        const pointsToTest = [];
        let polylinePoints;
        let polylineToTest;
        let intersects;
        const that = this;

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

        polylinePoints = polylinePoints.map( point => that._cleanLatLng( point ) );

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
    }

    /**
     * Checks whether the array of points contains empty ones.
     *
     * @param {Array<LatLngArray>} points - Array of geopoints
     * @param {number} [allowedIndex] - The index in which an empty value is allowed.
     * @return {boolean} Whether the array contains empty points.
     */
    containsEmptyPoints( points, allowedIndex ) {
        return points.some( ( point, index ) => index !== allowedIndex && ( !point[ 0 ] || !point[ 1 ] ) );
    }

    /**
     * Gets the widget properties and features.
     *
     * @return {{search: boolean, detect: boolean, map: boolean, updateMapFn: string, type: string}} The widget properties object
     */
    get props() {
        const props = this._props;

        props.detect = !!navigator.geolocation;
        props.map = !support.touch || props.appearances.includes( 'maps' ) || props.appearances.includes( 'placement-map' );
        props.search = props.map;
        props.touch = support.touch;
        props.wide = this.question.clientWidth / this.element.closest( 'form.or' ).clientWidth > 0.8;

        return props;
    }

    /**
     * @type {string}
     */
    get value() {
        let newValue = '';
        // all points should be valid geopoints and only the last item may be empty
        this.points.forEach( ( point, index, array ) => {
            let geopoint;
            const lat = typeof point[ 0 ] === 'number' ? point[ 0 ] : ( typeof point.lat === 'number' ? point.lat : null );
            const lng = typeof point[ 1 ] === 'number' ? point[ 1 ] : ( typeof point.lng === 'number' ? point.lng : null );
            const alt = typeof point[ 2 ] === 'number' ? point[ 2 ] : 0.0;
            const acc = typeof point[ 3 ] === 'number' ? point[ 3 ] : 0.0;

            geopoint = ( lat && lng ) ? `${lat} ${lng} ${alt} ${acc}` : '';

            // only last item may be empty
            // TODO: it is not great to have markAsInvalid functionality in the value getter.
            if ( !this._isValidGeopoint( geopoint ) && !( geopoint === '' && index === array.length - 1 ) ) {
                this._markAsInvalid( index );
            }
            // newGeoTraceValue += geopoint;
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

        return newValue;
    }

    set value( value ) {
        value.trim().split( ';' ).forEach( ( el, i ) => {
            // console.debug( 'adding loaded point', el.trim().split( ' ' ) );
            this.points[ i ] = el.trim().split( ' ' );
            this.points[ i ].forEach( ( str, i, arr ) => {
                arr[ i ] = Number( str );
            } );
        } );
    }

    /**
     * Enables a disabled widget
     */
    enable() {
        $( this.element )
            .next( '.widget' )
            .removeClass( 'readonly' )
            .find( 'input, select, textarea' ).prop( 'disabled', false )
            .end()
            .find( '.btn:not(.show-map-btn):not(.hide-map-btn), .btn-icon-only, .addpoint' ).prop( 'disabled', false );

        // ensure all tiles are displayed, https://github.com/kobotoolbox/enketo-express/issues/188
        if ( this.map ) {
            this.map.invalidateSize();
        }
    }

    /**
     * Disables the widget
     */
    disable() {
        $( this.element )
            .next( '.widget' )
            .addClass( 'readonly' )
            .find( 'input, select, textarea' ).prop( 'disabled', true )
            .end()
            .find( '.btn:not(.show-map-btn):not(.hide-map-btn), .btn-icon-only, .addpoint' ).prop( 'disabled', true );
    }

    /**
     * Updates the widget if the value has updated programmatically (e.g. due to a calculation)
     */
    update() {
        /**
         * It is somewhat complex to properly update, especially when the widget is currently
         * showing a list of geotrace/geoshape points. Hence we use the inefficient but robust
         * method to re-initialize instead.
         */
        const widget = this.element.parentElement.querySelector( '.widget' );
        if ( widget ) {
            widget.remove();
            this.loadMap = undefined;
            this.map = undefined;
            this.polyline = undefined;
            this.polygon = undefined;
            this._init();
        }
    }
}

export default Geopicker;
