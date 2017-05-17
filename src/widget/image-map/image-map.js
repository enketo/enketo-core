'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'imageMap';

/**
 * Image Map widget that turns an SVG image into a clickable map 
 * by matching radiobutton/checkbox values with id attribute values in the SVG
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */
function ImageMap( element, options, event ) {
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

    /*
     * To facilitate Enketo Express' offline webforms,
     * where the img source is populated after form loading, we initialize upon image load
     * if the src attribute is not yet populated.
     *
     * We could use the same with online-only forms, but that would cause a loading delay.
     */
    if ( img.getAttribute( 'src' ) ) {
        this._addMarkup( img ).then( this._addFunctionality.bind( this ) );
    } else {
        $( img )
            .on( 'load', function() {
                that._addMarkup( img ).then( that._addFunctionality.bind( that ) );
            } );
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
    return $.get( src ).then( function( data ) {
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
            width = $svg.attr( 'width' ) || $svg[ 0 ].getBBox().width;
            height = $svg.attr( 'height' ) || $svg[ 0 ].getBBox().height;
            $svg.attr( 'viewBox', [ 0, 0, width, height ].join( ' ' ) );

            return $widget;
        }
    } );
};

/**
 * Removes id attributes from unmatched path elements in order to prevent hover effect (and click listener).
 * 
 * @return {jQuery} [description]
 */
ImageMap.prototype._removeUnmatchedIds = function( $svg ) {
    var that = this;
    $svg.find( 'path[id]' ).each( function() {
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

    this.$svg.not( '[or-readonly]' ).on( 'click', 'path[id]', function( event ) {

        var input = that._getInput( event.target.id );
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
        .on( 'mouseenter', 'path[id]', function( event ) {
            var optionLabel = $( that._getInput( event.target.id ) ).siblings( '.option-label.active' ).text();
            that.$tooltip.text( optionLabel );
        } )
        .on( 'mouseleave', 'path[id]', function( event ) {
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

    this.$svg.find( 'path[or-selected]' ).removeAttr( 'or-selected' );

    if ( typeof values === 'string' ) {
        values = [ values ];
    }

    values.forEach( function( value ) {
        if ( value ) {
            // if multiple values have the same id, change all of them (e.g. a province that is not contiguous)
            that.$svg.find( 'path#' + value ).attr( 'or-selected', '' );
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
