define( [ 'jquery', 'enketo-js/Widget', 'file-manager' ], function( $, Widget, fileManager ) {
    "use strict";

    var pluginName = 'filepicker';

    /**
     * FilePicker that works both offline and online. It abstracts the file storage/cache away
     * with the injected fileManager.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, maxlength:number})} options options
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
        var $input = $( this.element ),
            existingFileName = $input.attr( 'data-loaded-file-name' ),
            that = this;

        this.mediaType = $input.attr( 'accept' );

        $input
            .attr( 'disabled', 'disabled' )
            .addClass( 'transparent' )
            .parent().addClass( 'with-media clearfix' );

        this.$widget = $(
                '<div class="widget file-picker">' +
                '<div class="fake-file-input"></div>' +
                '<div class="file-feedback"></div>' +
                '<div class="file-preview"></div>' +
                '</div>' )
            .insertAfter( $input );
        this.$feedback = this.$widget.find( '.file-feedback' );
        this.$preview = this.$widget.find( '.file-preview' );
        this.$fakeInput = this.$widget.find( '.fake-file-input' );

        // show loaded file name regardless of whether widget is supported
        if ( existingFileName ) {
            this._showFileName( existingFileName, this.mediaType );
            $input.removeAttr( 'data-loaded-file-name' );
        }

        if ( !fileManager || !fileManager.isSupported() ) {
            var advice = ( fileManager.notSupportedAdvisoryMsg ) ? fileManager.notSupportedAdvisoryMsg : '';
            this._showFeedback( 'Media questions are not supported in this browser. ' + advice, 'warning' );
            return;
        }

        if ( fileManager.isWaitingForPermissions() ) {
            this._showFeedback( 'Waiting for user permissions.', 'warning' );
        }

        fileManager.init()
            .then( function() {
                that._showFeedback();
                that._changeListener();
                $input.removeAttr( 'disabled' );
                if ( existingFileName ) {
                    fileManager.getFileUrl( existingFileName )
                        .then( function( url ) {
                            that._showPreview( url, that.mediaType );
                        } )
                        .catch( function() {
                            that._showFeedback( 'File "' + existingFileName + '" could not be found (leave unchanged if already submitted and you want to preserve it).', 'error' );
                        } );
                }
            } )
            .catch( function( error ) {
                that._showFeedback( error.message, 'error' );
            } );
    };

    Filepicker.prototype._getMaxSubmissionSize = function() {
        var maxSize = $( document ).data( 'maxSubmissionSize' );
        return maxSize || 5 * 1024 * 1024;
    };

    Filepicker.prototype._changeListener = function() {
        var that = this;

        $( this.element ).on( 'change.passthrough.' + this.namespace, function( event ) {
            var file,
                $input = $( this );

            // trigger eventhandler to update instance value
            if ( event.namespace === 'passthrough' ) {
                $input.trigger( 'change.file' );
                return false;
            }

            // get the file
            file = this.files[ 0 ];

            // process the file
            fileManager.getFileUrl( file )
                .then( function( url ) {
                    that._showPreview( url, that.mediaType );
                    that._showFeedback( '' );
                    that._showFileName( file );
                    $input.trigger( 'change.passthrough' );
                } )
                .catch( function( error ) {
                    $input.val( '' );
                    that._showPreview( null );
                    that._showFeedback( error.message, 'error' );
                } );
        } );
    };

    Filepicker.prototype._showFileName = function( file ) {
        var fileName = ( typeof file === 'object' && file.name ) ? file.name : file;
        this.$fakeInput.text( fileName );
    };

    Filepicker.prototype._showFeedback = function( message, status ) {
        message = message || '';
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
                $this.data( pluginName, ( data = new Filepicker( this, options, event ) ) );
            }
            //only call method if widget was instantiated before
            else if ( data && typeof options == 'string' ) {
                //pass the element as a parameter as this is used in fix()
                data[ options ]( this );
            }
        } );
    };

} );
