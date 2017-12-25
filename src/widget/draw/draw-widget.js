'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'drawWidget';
var support = require( '../../js/support' );
var fileManager = require( '../../js/file-manager' );
var SignaturePad = require( 'signature_pad' );

/**
 * Widget to obtain user-provided drawings or signature.
 * 
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {*}    options   options
 * @param {*=}                            event     event
 */

function DrawWidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

DrawWidget.prototype = Object.create( Widget.prototype );
DrawWidget.prototype.constructor = DrawWidget;

/**
 * Initialize datepicker widget
 */
DrawWidget.prototype._init = function() {
    var canvas;
    var that = this;
    var existingFilename = this.element.dataset.loadedFileName;

    this.element.type = 'text';
    this.element.dataset.drawing = true;
    this.props = this._getProps( this.element );
    this.$widget = this._getMarkup();
    canvas = this.$widget[ 0 ].querySelector( '.draw-widget__body__canvas' );

    $( this.element ).after( this.$widget );

    this._handleResize( canvas );
    this._resizeCanvas( canvas );

    this.initialize = fileManager.init()
        .then( function() {
            that.pad = new SignaturePad( canvas, {
                onEnd: that._updateValue.bind( that ),
                penColor: that.props.colors[ 0 ] || 'black'
            } );
            if ( existingFilename ) {
                that.pad.off();
                return that._loadFileIntoPad( existingFilename );
            }
            return true;
        } )
        .then( function() {
            that.pad.on();
            that.$widget
                .find( '.draw-widget__btn-reset' ).on( 'click', that._reset.bind( that ) )
                .end().find( '.draw-widget__load' ).on( 'change', function() {
                    if ( this.files[ 0 ] ) {
                        that.pad.clear();
                        that._loadFileIntoPad( this.files[ 0 ] );
                        that._updateValue.call( that );
                    }
                } )
                .end().find( '.draw-widget__colorpicker' )
                .on( 'click', '.current', function() {
                    $( this ).parent().toggleClass( 'reveal' );
                } ).on( 'click', '[data-color]:not(.current)', function() {
                    $( this ).siblings().removeClass( 'current' ).end().addClass( 'current' )
                        .parent().removeClass( 'reveal' );
                    that.pad.penColor = this.dataset.color;
                } )
                .end().find( '.show-canvas-btn' ).on( 'click', function() {
                    that.$widget.addClass( 'full-screen' );
                    that._resizeCanvas( canvas );
                    if ( !that.props.readonly ) {
                        that.pad.on();
                    }
                    return false;
                } )
                .end().find( '.hide-canvas-btn' ).on( 'click', function() {
                    that.$widget.removeClass( 'full-screen' );
                    that.pad.off();
                    that._resizeCanvas( canvas );
                    return false;
                } ).click();

            $( canvas )
                .on( 'canvasreload.' + that.namespace, function() {
                    if ( that.cache ) {
                        that.pad.fromDataURL( that.cache );
                    }
                } );

            if ( that.props.readonly ) {
                that.disable( that.element );
            }
        } )
        .catch( function( error ) {
            that._showFeedback( error.message );
        } );

    $( this.element )
        .on( 'applyfocus', function() {
            canvas.focus();
        } )
        .closest( '[role="page"]' ).on( 'pageflip.enketo', function() {
            // When an existing value is loaded into the canvas and is not 
            // the first page, it won't become visible until the canvas is clicked
            // or the window is resized:
            // https://github.com/kobotoolbox/enketo-express/issues/895
            // This also fixes a similar issue with an empty canvas:
            // https://github.com/kobotoolbox/enketo-express/issues/844
            that._resizeCanvas( canvas );
        } );
};

DrawWidget.prototype._getProps = function( el ) {
    var $q = $( el ).closest( '.question' );
    return {
        readonly: el.readOnly,
        filename: $q.hasClass( 'or-appearance-draw' ) ? 'drawing.png' : ( $q.hasClass( 'or-appearance-signature' ) ? 'signature.png' : 'annotation.png' ),
        load: $q.hasClass( 'or-appearance-annotate' ),
        colors: $q.hasClass( 'or-appearance-signature' ) ? [] : [ 'black', 'lightblue', 'blue', 'red', 'orange', 'cyan', 'yellow', 'lightgreen', 'green', 'pink', 'purple', 'lightgray', 'darkgray' ],
        touch: support.touch,
    };
};

DrawWidget.prototype._getMarkup = function() {
    var load = this.props.load ? '<input type="file" accept="image/*" class="ignore draw-widget__load"/>' : '';
    var fullscreenBtns = this.props.touch ? '<button type="button" class="show-canvas-btn btn btn-default">Draw/Sign</button>' +
        '<button type="button" class="hide-canvas-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>' : '';
    var $widget = $( '<div class="widget draw-widget">' +
        '<div class="draw-widget__body">' + fullscreenBtns + load +
        '<canvas class="draw-widget__body__canvas noSwipe" tabindex="1"></canvas><div class="draw-widget__colorpicker"></div></div>' +
        '<div class="draw-widget__footer">' +
        '<button type="button" class="btn-icon-only draw-widget__btn-reset" ><i class="icon icon-refresh"> </i></button>' +
        '<div class="draw-widget__feedback"></div>' +
        '</div>' +
        '</div>' );
    var $colorpicker = $widget.find( '.draw-widget__colorpicker' );

    this.props.colors.forEach( function( color, index ) {
        var current = index === 0 ? ' current' : '';
        $colorpicker.append( '<div class="' + current + '"data-color="' + color + '" style="background: ' + color + ';" />' );
    } );

    return $widget;
};

DrawWidget.prototype._updateValue = function() {
    var now = new Date();
    var postfix = '-' + now.getHours() + '_' + now.getMinutes() + '_' + now.getSeconds();
    // pad.toData() doesn't seem to work when redrawing on a smaller canvas. Doesn't scale.
    // pad.toDataURL() is crude and memory-heavy but the advantage is that it will also work for appearance=annotate
    this.cache = this.pad.toDataURL();
    this.element.dataset.filenamePostfix = postfix;
    delete this.element.dataset.loadedFileName;
    $( this.element ).val( this.props.filename ).trigger( 'change' );
};

DrawWidget.prototype._reset = function() {
    this.pad.clear();
    this.cache = null;
    delete this.element.dataset.loadedFileName;
    this.element.dataset.filenamePostfix = '';
    $( this.element ).val( '' ).trigger( 'change' );
};

DrawWidget.prototype._loadFileIntoPad = function( filename ) {
    var that = this;
    return fileManager.getFileUrl( filename )
        .then( function( url ) {
            that.pad.fromDataURL( url, {} );
            that.cache = url;
            that.element.value = filename;
        } )
        .catch( function() {
            that._showFeedback( 'File "' + filename + '" could not be found (leave unchanged if already submitted and you want to preserve it).', 'error' );
        } );
};

DrawWidget.prototype._showFeedback = function( message ) {
    message = message || '';

    // replace text and replace all existing classes with the new status class
    this.$widget.find( '.draw-widget__feedback' ).text( message );
};

DrawWidget.prototype._handleResize = function( canvas ) {
    var that = this;
    $( window ).on( 'resize', function() {
        that._resizeCanvas( canvas );
    } );
};

// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
DrawWidget.prototype._resizeCanvas = function( canvas ) {
    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    var ratio = Math.max( window.devicePixelRatio || 1, 1 );
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext( '2d' ).scale( ratio, ratio );
    $( canvas ).trigger( 'canvasreload.' + this.namespace );
};

DrawWidget.prototype.disable = function( element ) {
    var that = this;

    this.initialize
        .then( function() {
            that.pad.off();
            $( element )
                .next( '.widget' )
                .find( '.draw-widget__btn-reset' )
                .prop( 'disabled', true );
        } );
};

DrawWidget.prototype.enable = function( element ) {
    var that = this;

    this.initialize
        .then( function() {
            that.pad.on();
            if ( !element.readOnly ) {
                $( element )
                    .next( '.widget' )
                    .find( '.draw-widget__btn-reset' )
                    .prop( 'disabled', false );
            }
            // https://github.com/enketo/enketo-core/issues/450
            // When loading a question with a relevant, it is invisible 
            // until branch.js removes the "pre-init" class. The rendering of the 
            // canvas may therefore still be ongoing when this widget is instantiated.
            // For that reason we call _resizeCanvas when enable is called to make
            // sure the canvas is rendered properly.
            that._resizeCanvas( $( element ).closest( '.question' )[ 0 ].querySelector( '.draw-widget__body__canvas' ) );
        } );
};

/** 
 * Updates value when it is programmatically cleared.
 * There is no way to programmatically update a file input other than clearing it, so that's all
 * we need to do.
 * 
 * @param  {[type]} element [description]
 * @return {[type]}         [description]
 */
DrawWidget.prototype.update = function( element ) {
    if ( element.value === '' ) {
        this._reset();
    }
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new DrawWidget( this, options, event ) );
        }
        if ( data && typeof options === 'string' ) {
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    // note that the selector needs to match both the pre-instantiated form and the post-instantiate form (type attribute changes)
    'selector': '.or-appearance-draw input[data-type-xml="binary"][accept^="image"], .or-appearance-signature input[data-type-xml="binary"][accept^="image"], .or-appearance-annotate input[data-type-xml="binary"][accept^="image"]'
};
