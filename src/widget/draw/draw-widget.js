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
 * In addition it also fixes a bug where a loaded image is stretched to fit
 * the canvas.
 * 
 * @param {*} objectUrl 
 * @param {*} options 
 */
SignaturePad.prototype.fromObjectURL = function( objectUrl, options ) {
    var image = new Image();
    options = options || {};
    var deviceRatio = options.ratio || window.devicePixelRatio || 1;
    var width = options.width || ( this._canvas.width / deviceRatio );
    var height = options.height || ( this._canvas.height / deviceRatio );
    var that = this;

    this._reset();

    return new Promise( function( resolve ) {
        image.src = objectUrl;
        image.onload = function() {
            var imgWidth = image.width;
            var imgHeight = image.height;
            var hRatio = width / imgWidth;
            var vRatio = height / imgHeight;
            var left;
            var top;

            if ( hRatio < 1 || vRatio < 1 ) { //if image is bigger than canvas then fit within the canvas
                var ratio = Math.min( hRatio, vRatio );
                left = ( width - imgWidth * ratio ) / 2;
                top = ( height - imgHeight * ratio ) / 2;
                that._ctx.drawImage( image, 0, 0, imgWidth, imgHeight, left, top, imgWidth * ratio, imgHeight * ratio );
            } else { // if image is smaller than canvas then show it in the center and don't stretch it
                left = ( width - imgWidth ) / 2;
                top = ( height - imgHeight ) / 2;
                that._ctx.drawImage( image, left, top, imgWidth, imgHeight );
            }
            resolve( objectUrl );
        };
        that._isEmpty = false;
    } );
};

/**
 * Similar to SignaturePad.prototype.fromData except that it doesn't clear the canvas.
 * This is to facilitate undoing a drawing stroke over a background (bitmap) image.
 * 
 * @param {*} pointGroups 
 */
SignaturePad.prototype.updateData = function( pointGroups ) {
    var that = this;
    this._fromData(
        pointGroups,
        function( curve, widths ) { that._drawCurve( curve, widths.start, widths.end ); },
        function( rawPoint ) { that._drawDot( rawPoint ); }
    );

    this._data = pointGroups;
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
            that.pad.off();
            if ( existingFilename ) {
                that.element.value = existingFilename;
                return that._loadFileIntoPad( existingFilename )
                    .then( that._updateDownloadLink.bind( that ) );
            }
            return true;
        } );
    this.disable();
    this.initialize
        .then( function() {
            that.$widget
                .find( '.draw-widget__btn-reset' ).on( 'click', that._reset.bind( that ) )
                .end().find( '.draw-widget__colorpicker' )
                .on( 'click', '.current', function() {
                    $( this ).parent().toggleClass( 'reveal' );
                } )
                .on( 'click', '[data-color]:not(.current)', function() {
                    $( this ).siblings().removeClass( 'current' ).end().addClass( 'current' )
                        .parent().removeClass( 'reveal' );
                    that.pad.penColor = this.dataset.color;
                } )
                .end().find( '.draw-widget__undo' ).on( 'click', function() {
                    var data = that.pad.toData();
                    that.pad.clear();
                    var fileInput = that.$widget[ 0 ].querySelector( 'input[type=file]' );
                    // that.element.dataset.loadedFileName will have been removed only after resetting 
                    var fileToLoad = fileInput && fileInput.files[ 0 ] ? fileInput.files[ 0 ] : that.element.dataset.loadedFileName;
                    that._loadFileIntoPad( fileToLoad )
                        .then( function() {
                            that.pad.updateData( data.slice( 0, -1 ) );
                            that._updateValue();
                            that.pad.penColor = that.$widget.find( '.draw-widget__colorpicker .current' )[ 0 ].dataset.color;
                        } );
                } )
                .end().find( '.show-canvas-btn' ).on( 'click', function() {
                    that.$widget.addClass( 'full-screen' );
                    that._resizeCanvas( canvas );
                    that.enable();
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
                        that.pad.fromObjectURL( that.cache );
                    }
                } );
            that.enable();
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
    var type = $q.hasClass( 'or-appearance-draw' ) ? 'drawing' : ( $q.hasClass( 'or-appearance-signature' ) ? 'signature' : 'annotation' );
    return {
        readonly: el.readOnly,
        type: type,
        filename: type + '.png',
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
                            that.enable();
                        } );
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
        '<canvas class="draw-widget__body__canvas noSwipe disabled" tabindex="1"></canvas>' +
        '<div class="draw-widget__colorpicker"></div>' +
        ( this.props.type === 'signature' ? '' : '<button class="btn-icon-only draw-widget__undo" type=button><i class="icon icon-undo"> </i></button>' ) +
        '</div>' +
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
    // Note that this.element has become a text input.
    $( this.element ).val( this.props.filename ).trigger( 'change' );
    this._updateDownloadLink( this.cache );
};

DrawWidget.prototype._reset = function() {
    var that = this;

    if ( this.element.value ) {
        // This discombulated line is to help the i18next parser pick up all 3 keys.
        var item = this.props.type === 'signature' ?
            t( 'drawwidget.signature' ) : ( this.props.type === 'drawing' ? t( 'drawwidget.drawing' ) : t( 'drawwidget.annotation' ) );
        dialog.confirm( t( 'filepicker.resetWarning', { item: item } ) )
            .then( function() {
                that.pad.clear();
                that.cache = null;
                // Only upon reset is loadedFileName removed, so that "undo" will work
                // for drawings loaded from storage.
                delete that.element.dataset.loadedFileName;
                that.element.dataset.filenamePostfix = '';
                $( that.element ).val( '' ).trigger( 'change' );
                // Annotate file input
                that.$widget.find( 'input[type=file]' ).val( '' ).trigger( 'change' );
                that._updateDownloadLink( '' );
                that.disable();
                that.enable();
            } );
    }
};

/**
 * 
 * @param {*} file Either a filename or a file.
 */
DrawWidget.prototype._loadFileIntoPad = function( file ) {
    var that = this;
    if ( !file ) {
        return Promise.resolve( '' );
    }
    return fileManager.getObjectUrl( file )
        .then( that.pad.fromObjectURL.bind( that.pad ) )
        .then( function( objectUrl ) {
            that.cache = objectUrl;
            return objectUrl;
        } )
        .catch( function() {
            that._showFeedback( 'File could not be loaded (leave unchanged if already submitted and you want to preserve it).', 'error' );
        } );
};

DrawWidget.prototype._showFeedback = function( message ) {
    message = message || '';

    // replace text and replace all existing classes with the new status class
    this.$widget.find( '.draw-widget__feedback' ).text( message );
};

DrawWidget.prototype._updateDownloadLink = function( url ) {
    if ( url && url.indexOf( 'data:' ) === 0 ) {
        url = URL.createObjectURL( utils.dataUriToBlobSync( url ) );
    }

    this.$widget.find( '.btn-download' ).attr( {
        'href': url || '',
        'download': url ? utils.getFilename( { name: this.element.value }, this.element.dataset.filenamePostfix ) : ''
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

DrawWidget.prototype.disable = function() {
    var that = this;
    var canvas = this.$widget.find( '.draw-widget__body__canvas' )[ 0 ];

    this.initialize
        .then( function() {
            that.pad.off();
            canvas.classList.add( 'disabled' );
            that.$widget
                .find( '.draw-widget__btn-reset' )
                .prop( 'disabled', true );
        } );
};

DrawWidget.prototype.enable = function() {
    var that = this;
    var canvas = this.$widget.find( '.draw-widget__body__canvas' )[ 0 ];
    var touchNotFull = this.props.touch && !this.$widget.is( '.full-screen' );
    var needFile = this.props.load && !this.element.value;

    this.initialize
        .then( function() {
            if ( !that.props.readonly && !needFile && !touchNotFull ) {
                that.pad.on();
                canvas.classList.remove( 'disabled' );
                that.$widget
                    .find( '.draw-widget__btn-reset' )
                    .prop( 'disabled', false );
            }
            // https://github.com/enketo/enketo-core/issues/450
            // When loading a question with a relevant, it is invisible 
            // until branch.js removes the "pre-init" class. The rendering of the 
            // canvas may therefore still be ongoing when this widget is instantiated.
            // For that reason we call _resizeCanvas when enable is called to make
            // sure the canvas is rendered properly.
            that._resizeCanvas( canvas );
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
