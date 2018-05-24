'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'imageMap';
var t = require( 'enketo/translator' ).t;

/**
 * Image Map widget that turns an SVG image into a clickable map 
 * by matching radiobutton/checkbox values with id attribute values in the SVG
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */
function ImageMap( element, options /*, event*/ ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this.options = options;
    this._init();
}

ImageMap.prototype = Object.create( Widget.prototype );

ImageMap.prototype.constructor = ImageMap;

ImageMap.prototype._init = function() {
    var that = this;
    var img = this.element.querySelector( 'img' );
    this.$inputs = $( this.element ).find( 'input' );
    this.props = this._getProps();
    this.element.classList.add( 'or-image-map-initialized' );
    /*
     * To facilitate Enketo Express' offline webforms,
     * where the img source is populated after form loading, we initialize upon image load
     * if the src attribute is not yet populated.
     *
     * We could use the same with online-only forms, but that would cause a loading delay.
     */
    if ( !img ) {
        return this._showSvgNotFoundError();
    } else if ( img.getAttribute( 'src' ) ) {
        this._addMarkup( img ).then( this._addFunctionality.bind( this ) );
    } else {
        $( img )
            .on( 'load', function() {
                that._addMarkup( img ).then( that._addFunctionality.bind( that ) );
            } );
        // Ignore errors, because an img element without source may throw one.
        // E.g. in Enketo Express inside a repeat: https://github.com/kobotoolbox/enketo-express/issues/961
    }
};

ImageMap.prototype._addFunctionality = function( $widget ) {
    this.$svg = $widget.find( 'svg' );
    this.$tooltip = $widget.find( '.image-map__ui__tooltip' );
    if ( this.props.readonly ) {
        this.disable();
    }
    this._setSvgClickHandler();
    this._setChangeHandler();
    this._setHoverHandler();
    this._updateImage();
};

ImageMap.prototype._getProps = function() {
    return {
        readonly: this.$inputs[ 0 ].readOnly
    };
};

ImageMap.prototype._addMarkup = function( img ) {
    var that = this;
    var src = img.getAttribute( 'src' );

    /**
     * For translated forms, we now discard everything except the first image,
     * since we're assuming the images will be the same in all languages.
     */
    return $.get( src )
        .then( function( data ) {
            var $svg;
            var $widget;
            var width;
            var height;
            if ( that._isSvgDoc( data ) ) {
                $svg = that._removeUnmatchedIds( $( data.querySelector( 'svg' ) ) );
                $widget = $( '<div class="widget image-map"/>' )
                    .append( '<div class="image-map__ui"><span class="image-map__ui__tooltip"></span></div>' )
                    .append( $svg );
                // remove images in all languages
                $( that.element ).find( 'img' ).remove();
                $( that.element ).find( '.option-wrapper' ).before( $widget );
                // Resize, using original unscaled SVG dimensions
                // svg.getBBox() only works after SVG has been added to DOM.
                // In FF getBBox causes an "NS_ERROR_FAILURE" exception likely because the SVG
                // image has not finished rendering. This doesn't always happen though.
                // For now, we just log the FF error, and hope that resizing is done correctly via
                // attributes.
                var bbox = {};
                try {
                    bbox = $svg[ 0 ].getBBox();
                } catch ( e ) {
                    console.error( 'Could not obtain Boundary Box of SVG element', e );
                }

                width = bbox.width || $svg.attr( 'width' );
                height = bbox.height || $svg.attr( 'height' );
                $svg.attr( 'viewBox', [ 0, 0, parseInt( width, 10 ), parseInt( height, 10 ) ].join( ' ' ) );

                return $widget;
            } else {
                throw ( 'Image is not an SVG doc' );
            }
        } )
        .catch( this._showSvgNotFoundError.bind( that ) );
};

ImageMap.prototype._showSvgNotFoundError = function() {
    $( this.element ).find( '.option-wrapper' ).before( '<div class="widget image-map"><div class="image-map__error">' + t( 'imagemap.svgNotFound' ) + '</div></div>' );
};

/**
 * Removes id attributes from unmatched path elements in order to prevent hover effect (and click listener).
 * 
 * @return {jQuery} [description]
 */
ImageMap.prototype._removeUnmatchedIds = function( $svg ) {
    var that = this;
    $svg.find( 'path[id], g[id]' ).each( function() {
        if ( !that._getInput( this.id ) ) {
            this.removeAttribute( 'id' );
        }
    } );

    return $svg;
};

ImageMap.prototype._getInput = function( id ) {
    return this.element.querySelector( 'input[value="' + id + '"]' );
};

ImageMap.prototype._setSvgClickHandler = function() {
    var that = this;

    this.$svg.not( '[or-readonly]' ).on( 'click', 'path[id], g[id]', function( event ) {
        var id = event.target.id || $( event.target ).closest( 'g[id]' )[ 0 ].id;
        var input = that._getInput( id );
        if ( input ) {
            $( input ).prop( 'checked', !input.checked ).trigger( 'change' );
        }
    } );
};

ImageMap.prototype._setChangeHandler = function() {
    this.$inputs.on( 'change inputupdate.enketo', this._updateImage.bind( this ) );
};

ImageMap.prototype._setHoverHandler = function() {
    var that = this;

    this.$svg
        .on( 'mouseenter', 'path[id], g[id]', function( event ) {
            var id = event.target.id || $( event.target ).closest( 'g[id]' )[ 0 ].id;
            var optionLabel = $( that._getInput( id ) ).siblings( '.option-label.active' ).text();
            that.$tooltip.text( optionLabel );
        } )
        .on( 'mouseleave', 'path[id], g[id]', function() {
            that.$tooltip.text( '' );
        } );
};

ImageMap.prototype._isSvgDoc = function( data ) {
    return typeof data === 'object' && data.querySelector( 'svg' );
};

/**
 * Updates 'selected' attributes in SVG
 * Always update the map after the value has changed in the original input elements
 */
ImageMap.prototype._updateImage = function() {
    var that = this;
    var values = this.options.helpers.input.getVal( this.$inputs.eq( 0 ) );

    this.$svg.find( 'path[or-selected], g[or-selected]' ).removeAttr( 'or-selected' );

    if ( typeof values === 'string' ) {
        values = [ values ];
    }

    values.forEach( function( value ) {
        if ( value ) {
            // if multiple values have the same id, change all of them (e.g. a province that is not contiguous)
            that.$svg.find( 'path#' + value + ',g#' + value ).attr( 'or-selected', '' );
        }
    } );
};

ImageMap.prototype.disable = function() {
    this.$svg.attr( 'or-readonly', '' );
};

ImageMap.prototype.enable = function() {
    if ( !this.props.readonly ) {
        this.$svg.removeAttr( 'or-readonly' );
    }
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new ImageMap( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.simple-select.or-appearance-image-map',
    'helpersRequired': [ 'input' ]
};
