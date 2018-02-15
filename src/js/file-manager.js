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
var t = require( 'enketo/translator' ).t;

/**
 * Initialize the file manager .
 * @return {[type]} promise boolean or rejection with Error
 */
fileManager.init = function() {
    return Promise.resolve( true );
};

/**
 * Whether the filemanager is waiting for user permissions
 * @return {Boolean} [description]
 */
fileManager.isWaitingForPermissions = function() {
    return false;
};

/**
 * Obtains a an ObjectURL that can be used to show a preview of the file when used
 * as a src attribute.
 *
 * @param  {?string|Object} subject File or filename in local storage
 * @param  {?string}        fileNameOverride value to override filename with in
 *                          generated URL.  This is not used in the default
 *                          implementation.
 * @return {[type]}         promise url string or rejection with Error
 */
fileManager.getFileUrl = function( subject /*, fileNameOverride*/ ) {
    return new Promise( function( resolve, reject ) {
        var error;

        if ( !subject ) {
            resolve( null );
        } else if ( typeof subject === 'string' ) {
            // TODO obtain from storage
            reject( 'no!' );
        } else if ( typeof subject === 'object' ) {
            if ( fileManager.isTooLarge( subject ) ) {
                error = new Error( t( 'filepicker.toolargeerror', { maxSize: fileManager.getMaxSizeReadable() } ) );
                reject( error );
            } else {
                resolve( URL.createObjectURL( subject ) );
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
                // TODO: In the future, we could simply do canvas.toBlob() insteadU
                file = utils.dataUriToBlobSync( canvas.toDataURL() );
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

/**
 * Placeholder function to check if file size is acceptable. 
 * 
 * @param  {Blob}  file [description]
 * @return {Boolean}      [description]
 */
fileManager.isTooLarge = function( /*file*/) {
    return false;
};

/**
 * Replace with function that determines max size published in OpenRosa server response header.
 */
fileManager.getMaxSizeReadable = function() {
    return 5 + 'MB';
};

module.exports = fileManager;
