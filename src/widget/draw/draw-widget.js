'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'drawWidget';
var support = require( '../../js/support' );
var fileManager = require( 'enketo/file-manager' );
var SignaturePad = require( 'signature_pad' );
var t = require( 'enketo/translator' ).t;
var dialog = require( 'enketo/dialog' );
var utils = require( '../../js/utils' );
var Promise = require( 'lie' );

/**
 * SignaturePad.prototype.fromDataURL is asynchronous and does not return a 
 * Promise. This is a rewrite returning a promise and the objectUrl.
 * @param {*} objectUrl 
 * @param {*} options 
 */
SignaturePad.prototype.fromObjectURL = function( objectUrl, options ) {
    var image = new Image();
    options = options || {};
    var ratio = options.ratio || window.devicePixelRatio || 1;
    var width = options.width || ( this._canvas.width / ratio );
    var height = options.height || ( this._canvas.height / ratio );
    var that = this;

    this._reset();

    return new Promise( function( resolve ) {
        image.src = objectUrl;
        image.onload = () => {
            that._ctx.drawImage( image, 0, 0, width, height );
            resolve( objectUrl );
        };
        that._isEmpty = false;
    } );
};

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

    if ( this.props.load ) {
        this._handleFiles( existingFilename );
    }

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
        accept: el.getAttribute( 'accept' ),
        capture: el.getAttribute( 'capture' )
    };
};

// All this is copied from the file-picker widget
DrawWidget.prototype._handleFiles = function( loadedFileName ) {
    // Monitor maxSize changes to update placeholder text in annotate widget. This facilitates asynchronous 
    // obtaining of max size from server without slowing down form loading.
    this._updatePlaceholder();
    this.$widget.closest( 'form.or' ).on( 'updateMaxSize', this._updatePlaceholder.bind( this ) );

    var that = this;

    var $input = this.$widget.find( 'input[type=file]' );
    var $fakeInput = this.$widget.find( '.fake-file-input' );

    // show loaded file name or placeholder regardless of whether widget is supported
    this._showFileName( loadedFileName );

    $input
        .on( 'click.' + this.namespace, function( event ) {
            // The purpose of this handler is to block the filepicker window
            // when the label is clicked outside of the input.
            if ( that.props.readonly || event.namespace !== 'propagate' ) {
                that.$fakeInput.focus();
                event.stopImmediatePropagation();
                return false;
            }
        } )
        .on( 'change.' + this.namespace, function() {
            // Get the file
            var file = this.files[ 0 ];

            if ( file ) {
                // Process the file
                if ( !fileManager.isTooLarge( file ) ) {
                    // Update UI
                    that.pad.clear();
                    that._loadFileIntoPad( this.files[ 0 ] )
                        .then( function() {
                            that._updateValue.call( that );
                            that._showFileName( file.name );
                        } );
                    // that._updateDownloadLink( url, fileName );
                } else {
                    that._showFeedback( t( 'filepicker.toolargeerror', { maxSize: fileManager.getMaxSizeReadable() } ) );
                }
            } else {
                that._showFileName( null );
            }
        } );

    $fakeInput
        .on( 'click.' + this.namespace, function( event ) {
            /* 
                The purpose of this handler is to selectively propagate clicks on the fake
                input to the underlying file input (to show the file picker window).
                It blocks propagation if the filepicker has a value to avoid accidentally
                clearing files in a loaded record, hereby blocking native browser file input behavior
                to clear values. Instead the reset button is the only way to clear a value.
            */
            if ( that.props.readonly || $input[ 0 ].value || $fakeInput[ 0 ].value ) {
                $( this ).focus();
                event.stopImmediatePropagation();
                return false;
            }
            event.preventDefault();
            $input.trigger( 'click.propagate' );
        } )
        .on( 'change.' + this.namespace, function() {
            // For robustness, avoid any editing of filenames by user.
            return false;
        } );
};

DrawWidget.prototype._showFileName = function( fileName ) {
    this.$widget.find( '.fake-file-input' ).val( fileName ).prop( 'readonly', !!fileName );
};

DrawWidget.prototype._updatePlaceholder = function() {
    this.$widget.find( '.fake-file-input' ).attr( 'placeholder', t( 'filepicker.placeholder', { maxSize: fileManager.getMaxSizeReadable() || '?MB' } ) );
};

DrawWidget.prototype._getMarkup = function() {
    // HTML syntax copied from filepicker widget
    var load = this.props.load ? '<input type="file" class="ignore draw-widget__load"' +
        ( this.props.capture !== null ? ' capture="' + this.props.capture + '"' : '' ) + ' accept="' + this.props.accept + '"/>' +
        '<div class="widget file-picker">' +
        '<input class="ignore fake-file-input"/>' +
        '<div class="file-feedback"></div>' +
        '</div>' : '';
    var fullscreenBtns = this.props.touch ? '<button type="button" class="show-canvas-btn btn btn-default">Draw/Sign</button>' +
        '<button type="button" class="hide-canvas-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>' : '';
    var $widget = $( '<div class="widget draw-widget">' +
        '<div class="draw-widget__body">' + fullscreenBtns + load +
        '<canvas class="draw-widget__body__canvas noSwipe" tabindex="1"></canvas><div class="draw-widget__colorpicker"></div></div>' +
        '<div class="draw-widget__footer">' +
        '<button type="button" class="btn-icon-only draw-widget__btn-reset" ><i class="icon icon-refresh"> </i></button>' +
        '<a class="btn-icon-only btn-download" download href=""><i class="icon icon-download"> </i></a>' +
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
    // Note that this.element has become a text input.
    $( this.element ).val( this.props.filename ).trigger( 'change' );
    this._updateDownloadLink( this.cache, this.props.filename );
};

DrawWidget.prototype._reset = function() {
    var that = this;

    if ( this.element.value ) {
        dialog.confirm( t( 'drawwidget.resetWarning' ) )
            .then( function() {
                that.pad.clear();
                that.cache = null;
                delete that.element.dataset.loadedFileName;
                that.element.dataset.filenamePostfix = '';
                $( that.element ).val( '' ).trigger( 'change' );
                // annotate file input
                that.$widget.find( 'input[type=file]' ).val( '' ).trigger( 'change' );
                that._updateDownloadLink( '', '' );
            } );
    }
};

DrawWidget.prototype._loadFileIntoPad = function( filename ) {
    var that = this;
    return fileManager.getFileUrl( filename )
        .then( that.pad.fromObjectURL.bind( that.pad ) )
        .then( function( url ) {
            that.element.value = filename;
            // Update the download link for:
            // - files that were loaded from the record
            // - an annotate file that was uploaded within the session before an annotation was added by the user
            that._updateDownloadLink( url, that.props.filename );
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

DrawWidget.prototype._updateDownloadLink = function( url, fileName ) {
    if ( url && url.substring( 0, 5 ) !== 'blob:' ) {
        url = URL.createObjectURL( utils.dataUriToBlobSync( url ) );
    }
    this.$widget.find( '.btn-download' ).attr( {
        'href': url || '',
        'download': fileName || ''
    } );
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
