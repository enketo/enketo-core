/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'jquery', 'js/Widget', 'file-manager' ], function( $, Widget, fileManager ) {
    "use strict";

    var pluginName = 'offlineFilepicker',
        maxSubmissionSize = $( document ).data( 'maxSubmissionSize' ) || 5 * 1024 * 1024;

    /**
     * File picker meant for offline-enabled form views
     *
     * Good references:
     * http://www.html5rocks.com/en/tutorials/file/filesystem/#toc-filesystemurls
     * http://updates.html5rocks.com/2012/08/Integrating-input-type-file-with-the-Filesystem-API
     * http://html5-demos.appspot.com/static/filesystem/generatingResourceURIs.html
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, maxlength:number})} options options
     * @param {*=} e     event
     */

    function OfflineFilepicker( element, options, e ) {
        if ( e ) {
            e.stopPropagation();
            e.preventDefault();
        }
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    OfflineFilepicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    OfflineFilepicker.prototype.constructor = OfflineFilepicker;

    /**
     * initialize
     *
     */
    OfflineFilepicker.prototype._init = function() {
        var existingFileName,
            $input = $( this.element ),
            feedbackMsg = "Awaiting user permission to store local data (files)",
            feedbackClass = "info",
            allClear = false;

        //TODO: add online file widget in case fileManager is undefined or use file manager with temporary storage?
        if ( typeof fileManager == "undefined" || !fileManager ) {
            feedbackClass = "warning";
            feedbackMsg = "File uploads not supported."; //" in previews and iframed views.";
        } else if ( !fileManager.isSupported() ) {
            feedbackClass = "warning";
            feedbackMsg = "File uploads not supported by your browser";
        } else {
            allClear = true;
        }

        $input
            .prop( 'disabled', true )
            .addClass( 'ignore force-disabled' )
            .after( '<div class="file-feedback text-' + feedbackClass + '">' + feedbackMsg + '</div>' );

        if ( !allClear ) {
            $( this.element ).hide();
            return;
        }

        this._changeListener();
        this._createDirectory();

        //this attribute is added by the Form instance when loading data to edit
        existingFileName = $input.attr( 'data-loaded-file-name' );
        if ( existingFileName ) {
            $input.after( '<div class="file-loaded text-warning">This form was loaded with "' +
                existingFileName + '". To preserve this file, do not change this input.</div>' );
        }
        $input.parent().addClass( 'with-media clearfix' );

    };

    OfflineFilepicker.prototype._changeListener = function() {
        /*
      This delegated eventhander should actually be added asynchronously (or not at all if no FS support/permission). However, it
      needs to start *before* the regular input change event handler for 2 reasons:
      1. If saving the file in the browser's file system fails, the instance should not be updated
      2. The regular eventhandler has event.stopImmediatePropagation which would mean this handler is never called.
      The easiest way to achieve this is to always add it but only let it do something if permission is granted to use FS.
     */
        var $input = $( this.element );
        $input.on( 'change.passthrough.' + this.namespace, function( event ) {
            if ( fileManager.getCurrentQuota() ) {
                var prevFileName, file, mediaType, $preview;
                //console.debug( 'namespace: ' + event.namespace );
                if ( event.namespace === 'passthrough' ) {
                    //console.debug('returning true');
                    $input.trigger( 'change.file' );
                    return false;
                }
                prevFileName = $input.attr( 'data-previous-file-name' );
                file = $input[ 0 ].files[ 0 ];
                mediaType = $input.attr( 'accept' );
                $preview = ( mediaType && mediaType === 'image/*' ) ? $( '<img />' ) : ( mediaType === 'audio/*' ) ? $( '<audio controls="controls"/>' ) : ( mediaType === 'video/*' ) ? $( '<video controls="controls"/>' ) : $( '<span>No preview (unknown mediatype)</span>' );
                $preview.addClass( 'file-preview' );
                if ( prevFileName && ( !file || prevFileName !== file.name ) ) {
                    fileManager.deleteFile( prevFileName );
                }
                $input.siblings( '.file-feedback, .file-preview, .file-loaded' ).remove();
                console.debug( 'file: ', file );
                if ( file && file.size > 0 && file.size <= maxSubmissionSize ) {
                    //save it in filesystem
                    fileManager.saveFile(
                        file, {
                            success: function( fsURL ) {
                                $preview.attr( 'src', fsURL );
                                $input.attr( 'data-previous-file-name', file.name );
                                $input.trigger( 'change.passthrough' ).after( $preview );
                            },
                            error: function( e ) {
                                console.error( 'error: ', e );
                                $input.val( '' );
                                $input.after( '<div class="file-feedback text-error">' +
                                    'Failed to save file</span>' );
                            }
                        }
                    );
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
            }
        } );
    };

    OfflineFilepicker.prototype._getInstanceID = function() {
        var id = $( 'form.or' ).data( 'instanceID' );
        if ( !id ) {
            console.error( 'Filepicker widget could not find instanceID. Files will not be saved correctly!' );
        }
        return id;
    };

    OfflineFilepicker.prototype._createDirectory = function() {
        var $input = $( this.element ),
            callbacks = {
                success: function() {
                    console.log( 'Whoheee, we have permission to use the file system' );
                    $input.removeClass( 'ignore force-disabled' )
                        .prop( 'disabled', false )
                        .siblings( '.file-feedback' ).remove()
                        .end()
                        .after( '<div class="file-feedback text-info">' +
                            'File inputs are experimental. Use only for testing.' );
                },
                error: function() {
                    $input.siblings( '.file-feedback' ).remove();
                    $input.after( '<div class="file-feedback text-warning">' +
                        'No permission given to store local data (or an error occurred).</div>' );
                }
            };

        fileManager.setDir( this._getInstanceID(), callbacks );
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
                $this.data( pluginName, ( data = new OfflineFilepicker( this, options, event ) ) );
            }
            //only call method if widget was instantiated before
            else if ( data && typeof options == 'string' ) {
                //pass the element as a parameter as this is used in fix()
                data[ options ]( this );
            }
        } );
    };

} );
