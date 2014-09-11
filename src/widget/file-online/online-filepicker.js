define( [ 'jquery', 'enketo-js/Widget' ], function( $, Widget ) {
    "use strict";

    var pluginName = 'onlineFilepicker';

    /**
     * Loop through $('form.or input[type="file"]') during submission submit.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, maxlength:number})} options options
     * @param {*=} e     event
     */

    function OnlineFilepicker( element, options, e ) {
        if ( e ) {
            e.stopPropagation();
            e.preventDefault();
        }
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    OnlineFilepicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    OnlineFilepicker.prototype.constructor = OnlineFilepicker;

    /**
     * initialize
     *
     */
    OnlineFilepicker.prototype._init = function() {
        var existingFileName,
            $input = $( this.element ),
            that = this;

        this._changeListener();

        //this attribute is added by the Form instance when loading data to edit
        existingFileName = $input.attr( 'data-loaded-file-name' );
        if ( existingFileName ) {
            // TODO how to fetch file for preview
            $input.after( '<div class="file-loaded text-warning">This form was loaded with "' +
                existingFileName + '". To preserve this file, do not change this input.</div>' );
        }
        $input.parent().addClass( 'with-media clearfix' );

    };

    OnlineFilepicker.prototype._getMaxSubmissionSize = function() {
        var maxSize = $( document ).data( 'maxSubmissionSize' );
        return maxSize || 5 * 1024 * 1024;
    };

    OnlineFilepicker.prototype._changeListener = function() {
        var that = this,
            $input = $( this.element );
        $input.on( 'change.passthrough.' + this.namespace, function( event ) {
            
            var prevFileName, file, mediaType, $preview,
                maxSubmissionSize = that._getMaxSubmissionSize();
            //console.debug( 'namespace: ' + event.namespace );
            if ( event.namespace === 'passthrough' ) {
                //console.debug('returning true');
                $input.trigger( 'change.file' );
                return false;
            }
            prevFileName = $input.attr( 'data-previous-file-name' );
            file = $input[ 0 ].files[ 0 ];
            mediaType = $input.attr( 'accept' );

            $input.siblings( '.file-preview, .file-loaded' ).remove();
            console.debug( 'file: ', file );
            
            if ( file && file.size > 0 && file.size <= maxSubmissionSize ) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $preview = that._createPreview( e.target.result, mediaType );
                    $input.attr( 'data-previous-file-name', file.name )
                        .removeAttr( 'data-loaded-file-name' )
                        .siblings( '.file-loaded' ).remove();
                    $input.trigger( 'change.passthrough' ).after( $preview );
                }
                reader.readAsDataURL(file); 

                return false;
            } else {
                //clear instance value by letting it bubble up to normal change handler
                if ( file.size > maxSubmissionSize ) {
                    $input.after( '<div class="file-feedback text-error">' +
                        'File too large (max ' +
                        ( Math.round( ( maxSubmissionSize * 100 ) / ( 1024 * 1024 ) ) / 100 ) +
                        ' Mb)</div>' );
                }
                return true;
            }
        } );
    };

    OnlineFilepicker.prototype._createPreview = function( fsURL, mediaType ) {
        var $preview;

        $preview = ( mediaType && mediaType === 'image/*' ) ? $( '<img />' ) : ( mediaType === 'audio/*' ) ? $( '<audio controls="controls"/>' ) : ( mediaType === 'video/*' ) ? $( '<video controls="controls"/>' ) : $( '<span>No preview for this mediatype</span>' );

        return $preview.addClass( 'file-preview' ).attr( 'src', fsURL );
    };

    OnlineFilepicker.prototype.destroy = function( element ) {
        $( element )
        //data is not used elsewhere by enketo
        .removeData( this.namespace )
        //remove all the event handlers that used this.namespace as the namespace
        .off( '.' + this.namespace )
        //show the original element
        .show()
        //remove elements immediately after the target that have the widget class
        .next( '.widget' ).remove().end()
        //console.debug( this.namespace, 'destroy' );
        .siblings( '.file-feedback, .file-preview, .file-loaded' ).remove();
    };

    /**
     *
     */
    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new OnlineFilepicker( this, options, event ) ) );
            }
            //only call method if widget was instantiated before
            else if ( data && typeof options == 'string' ) {
                //pass the element as a parameter as this is used in fix()
                data[ options ]( this );
            }
        } );
    };

} );
