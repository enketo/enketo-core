'use strict';
var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );
var fileManager = require( '../../js/file-manager' );
var utils = require( '../../js/utils' );
var pluginName = 'filepicker';
var t = require( 'translator' ).t;
var TranslatedError = require( '../../js/translated-error' );

/**
 * FilePicker that works both offline and online. It abstracts the file storage/cache away
 * with the injected fileManager.
 *
 * @constructor
 * @param {Element} element [description]
 * @param {*} options options
 * @param {*=} e     event
 */

function Filepicker( element, options, e ) {
    if ( e ) {
        e.stopPropagation();
        e.preventDefault();
    }
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

// copy the prototype functions from the Widget super class
Filepicker.prototype = Object.create( Widget.prototype );

// ensure the constructor is the new one
Filepicker.prototype.constructor = Filepicker;

/**
 * Initialize
 */
Filepicker.prototype._init = function() {
    var $input = $( this.element );
    var existingFileName = $input.attr( 'data-loaded-file-name' );
    var that = this;

    this.props = this._getProps();

    $input
        .prop( 'disabled', true )
        .addClass( 'hide' )
        .parent().addClass( 'with-media clearfix' );

    this.$widget = $(
            '<div class="widget file-picker">' +
            '<input class="ignore fake-file-input" type="button"/>' +
            '<div class="file-feedback"></div>' +
            '<div class="file-preview"></div>' +
            '</div>' )
        .insertAfter( $input );
    this.$feedback = this.$widget.find( '.file-feedback' );
    this.$preview = this.$widget.find( '.file-preview' );
    this.$fakeInput = this.$widget.find( '.fake-file-input' );
    // Focus listener needs to be added synchronously
    that._focusListener();

    // show loaded file name regardless of whether widget is supported
    if ( existingFileName ) {
        this._showFileName( existingFileName, this.props.mediaType );
    }

    if ( fileManager.isWaitingForPermissions() ) {
        this._showFeedback( t( 'filepicker.waitingForPermissions' ), 'warning' );
    }

    fileManager.init()
        .then( function() {
            that._showFeedback();
            that._changeListener();
            $input.prop( 'disabled', false );
            if ( existingFileName ) {
                fileManager.getFileUrl( existingFileName )
                    .then( function( url ) {
                        that._showPreview( url, that.props.mediaType );
                    } )
                    .catch( function() {
                        that._showFeedback( t( 'filepicker.notFound', {
                            existing: existingFileName
                        } ), 'error' );
                    } );
            }
        } )
        .catch( function( error ) {
            that._showFeedback( error, 'error' );
        } );
};

Filepicker.prototype._getProps = function() {
    return {
        mediaType: this.element.getAttribute( 'accept' ),
        readonly: this.element.readOnly,
    };
};

Filepicker.prototype._getMaxSubmissionSize = function() {
    var maxSize = $( document ).data( 'maxSubmissionSize' );
    return maxSize || 5 * 1024 * 1024;
};

Filepicker.prototype._changeListener = function() {
    var that = this;

    $( this.element )
        .on( 'click', function( event ) {
            if ( that.props.readonly || that.props.namespace !== 'propagate' ) {
                that.$fakeInput.focus();
                event.stopImmediatePropagation();
                return false;
            }
        } ).on( 'change.propagate.' + this.namespace, function( event ) {
            var file;
            var fileName;
            var postfix;
            var $input = $( this );
            var loadedFileName = $input.attr( 'data-loaded-file-name' );
            var now = new Date();

            if ( event.namespace === 'propagate' ) {
                // trigger eventhandler to update instance value
                $input.trigger( 'change.file' );
                return false;
            } else {
                event.stopImmediatePropagation();
            }

            // get the file
            file = this.files[ 0 ];
            postfix = '-' + now.getHours() + '_' + now.getMinutes() + '_' + now.getSeconds();
            this.dataset.filenamePostfix = postfix;
            fileName = utils.getFilename( file, postfix );

            // process the file
            fileManager.getFileUrl( file, fileName )
                .then( function( url ) {
                    // update UI
                    that._showPreview( url, that.props.mediaType );
                    that._showFeedback();
                    that._showFileName( fileName );
                    if ( loadedFileName && loadedFileName !== fileName ) {
                        $input.removeAttr( 'data-loaded-file-name' );
                    }
                    // update record
                    $input.trigger( 'change.propagate' );
                } )
                .catch( function( error ) {
                    // update record to clear any existing valid value
                    $input.val( '' ).trigger( 'change.propagate' );
                    // update UI
                    that._showFileName( '' );
                    that._showPreview( null );
                    that._showFeedback( error, 'error' );
                } );
        } );

    this.$fakeInput.on( 'click', function( e ) {
        e.preventDefault();
        $( that.element ).trigger( 'click.propagate' );
    } );
};

Filepicker.prototype._focusListener = function() {
    var that = this;

    // Handle focus on widget input
    this.$fakeInput.on( 'focus', function( event ) {
        $( that.element ).trigger( 'fakefocus' );
    } );

    // Handle focus on original input (goTo functionality)
    $( this.element ).on( 'applyfocus', function() {
        that.$fakeInput.focus();
    } );
};

Filepicker.prototype._showFileName = function( fileName ) {
    this.$fakeInput.val( fileName );
};

Filepicker.prototype._showFeedback = function( fb, status ) {
    var message = fb instanceof TranslatedError ? t( fb.translationKey, fb.translationOptions ) :
        fb instanceof Error ? fb.message :
        fb || '';
    status = status || '';
    // replace text and replace all existing classes with the new status class
    this.$feedback.text( message ).attr( 'class', 'file-feedback ' + status );
};

Filepicker.prototype._showPreview = function( url, mediaType ) {
    var $el;

    this.$widget.find( '.file-preview' ).empty();

    switch ( mediaType ) {
        case 'image/*':
            $el = $( '<img />' );
            break;
        case 'audio/*':
            $el = $( '<audio controls="controls"/>' );
            break;
        case 'video/*':
            $el = $( '<video controls="controls"/>' );
            break;
        default:
            $el = $( '<span>No preview for this mediatype</span>' );
            break;
    }

    if ( url ) {
        this.$preview.append( $el.attr( 'src', url ) );
    }
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this ),
            data = $this.data( pluginName );

        //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new Filepicker( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in fix()
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    // If this selector becomes too complex we can create a 'filepicker' class with XSL
    'selector': '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"]'
};
