'use strict';
/**
 * Simple file manager with cross-browser support. That uses the FileReader
 * to create previews. Can be replaced with a more advanced version that
 * obtains files from storage.
 *
 * The replacement should support the same public methods and return the same
 * types.
 */

var Promise = require( 'lie' );
var $ = require( 'jquery' );
var utils = require( './utils' );

var fileManager = {};

var supported = typeof FileReader !== 'undefined';

fileManager.notSupportedAdvisoryMsg = '';

/**
 * Initialize the file manager .
 * @return {[type]} promise boolean or rejection with Error
 */
fileManager.init = function() {
    if ( fileManager.isSupported() ) {
        return Promise.resolve( true );
    } else {
        return Promise.reject( new Error( 'FileReader not supported.' ) );
    }
};

/**
 * Whether filemanager is supported in browser
 * @return {Boolean}
 */
fileManager.isSupported = function() {
    return supported;
};

/**
 * Whether the filemanager is waiting for user permissions
 * @return {Boolean} [description]
 */
fileManager.isWaitingForPermissions = function() {
    return false;
};

/**
 * Obtains a url that can be used to show a preview of the file when used
 * as a src attribute.
 *
 * @param  {?string|Object} subject File or filename
 * @return {[type]}         promise url string or rejection with Error
 */
fileManager.getFileUrl = function( subject ) {
    return new Promise( function( resolve, reject ) {
        var error, reader;

        if ( !subject ) {
            resolve( null );
        } else if ( typeof subject === 'string' ) {
            // TODO obtain from storage
            reject( 'no!' );
        } else if ( typeof subject === 'object' ) {
            if ( fileManager.isTooLarge( subject ) ) {
                error = new Error( 'File too large' );
                reject( error );
            } else {
                reader = new FileReader();
                reader.onload = function( e ) {
                    resolve( e.target.result );
                };
                reader.onerror = function( e ) {
                    reject( e );
                };
                reader.readAsDataURL( subject );
            }
        } else {
            reject( new Error( 'Unknown error occurred' ) );
        }
    } );
};

/**
 * Obtain files currently stored in file input elements of open record
 * @return {[File]} array of files
 */
fileManager.getCurrentFiles = function() {
    var files = [];

    // Get any files inside file input elements or text input elements for drawings.
    $( 'form.or' ).find( 'input[type="file"]:not(.ignore), input[type="text"][data-drawing="true"]' ).each( function() {
        var newFilename;
        var file = null;
        var canvas = null;
        if ( this.type === 'file' ) {
            file = this.files[ 0 ]; // Why doesn't this fail for empty file inputs?
        } else if ( this.value ) {
            canvas = $( this ).closest( '.question' )[ 0 ].querySelector( '.draw-widget canvas' );
            if ( canvas ) {
                // TODO: In the future, we could do canvas.toBlob()
                file = _dataUriToBlob( canvas.toDataURL() );
                file.name = this.value;
            }
        }
        if ( file && file.name ) {
            // Correct file names by adding a unique-ish postfix
            // First create a clone, because the name property is immutable
            // TODO: in the future, when browser support increase we can invoke
            // the File constructor to do this.
            newFilename = utils.getFilename( file, this.dataset.filenamePostfix );
            file = new Blob( [ file ], {
                type: file.type
            } );
            file.name = newFilename;
            files.push( file );
        }
    } );

    return files;
};

function _dataUriToBlob( dataURI ) {
    var byteString;
    var mimeString;
    var buffer;
    var array;
    var blob;

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    byteString = atob( dataURI.split( ',' )[ 1 ] );
    // separate out the mime component
    mimeString = dataURI.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];

    // write the bytes of the string to an ArrayBuffer
    buffer = new ArrayBuffer( byteString.length );
    array = new Uint8Array( buffer );

    for ( var i = 0; i < byteString.length; i++ ) {
        array[ i ] = byteString.charCodeAt( i );
    }

    /*if ( !hasArrayBufferView ) {
        array = buffer;
    }*/

    // write the ArrayBuffer to a blob
    blob = new Blob( [ array ], {
        type: mimeString
    } );

    return blob;

}

/**
 * Placeholder function to check if file size is acceptable. 
 * 
 * @param  {Blob}  file [description]
 * @return {Boolean}      [description]
 */
fileManager.isTooLarge = function( file ) {
    return false;
};

module.exports = fileManager;
