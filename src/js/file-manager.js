/**
 * @module fileManager
 *
 * @description Simple file manager with cross-browser support. That uses the FileReader
 * to create previews. Can be replaced with a more advanced version that
 * obtains files from storage.
 *
 * The replacement should support the same public methods and return the same
 * types.
 */

import $ from 'jquery';

import { getFilename, dataUriToBlobSync } from './utils';
const fileManager = {};
import { t } from 'enketo/translator';
const URL_RE = /[a-zA-Z0-9+-.]+?:\/\//;

/**
 * @static
 * @function init
 *
 * @description Initialize the file manager.
 *
 * @return {Promise|boolean|Error} promise boolean or rejection with Error
 */
fileManager.init = () => { return Promise.resolve( true ); };

/**
 * @static
 * @function isWaitingForPermissions
 *
 * @description Whether the filemanager is waiting for user permissions
 *
 * @return {boolean} [description]
 */
fileManager.isWaitingForPermissions = () => { return false; };

/**
 * @static
 * @function getFileUrl
 *
 * @description Obtains a URL that can be used to show a preview of the file when used
 * as a src attribute.
 *
 * It is meant for media previews and media downloads.
 *
 * @param  {?string|object} subject - File or filename in local storage
 * @return {Promise|string|Error} promise url string or rejection with Error
 */
fileManager.getFileUrl = subject => {
    return new Promise( ( resolve, reject ) => {
        let error;

        if ( !subject ) {
            resolve( null );
        } else if ( typeof subject === 'string' ) {
            // TODO obtain from storage as http URL or objectURL
            // or from model for default binary files

            // Very crude URL checker which is fine for now,
            // because at this point we don't expect anything other than jr://
            if ( URL_RE.test( subject ) ) {
                resolve( subject );
            } else {
                reject( 'no!' );
            }
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
 * @static
 * @function getObjectUrl
 *
 * @description Similar to getFileURL, except that this one is guaranteed to return an objectURL
 *
 * It is meant for loading images into a canvas.
 *
 * @param  {?string|object} subject - File or filename in local storage
 * @return {Promise|string|Error} promise url string or rejection with Error
 */
fileManager.getObjectUrl = subject => fileManager.getFileUrl( subject )
    .then( url => {
        if ( /https?:\/\//.test( url ) ) {
            return fileManager.urlToBlob( url ).then( URL.createObjectURL );
        }

        return url;
    } );

/**
 * @static
 * @function urlToBlob
 *
 * @param {string} url - url to get
 * @return {Promise} promise of XMLHttpRequesting given url
 */
fileManager.urlToBlob = url => {
    const xhr = new XMLHttpRequest();

    return new Promise( resolve => {
        xhr.open( 'GET', url );
        xhr.responseType = 'blob';
        xhr.onload = () => {
            resolve( xhr.response );
        };
        xhr.send();
    } );
};

/**
 * @static
 * @function getCurrentFiles
 *
 * @description Obtain files currently stored in file input elements of open record
 *
 * @return {Array.File} array of files
 */
fileManager.getCurrentFiles = () => {
    const files = [];

    // Get any files inside file input elements or text input elements for drawings.
    $( 'form.or' ).find( 'input[type="file"]:not(.ignore), input[type="text"][data-drawing="true"]' ).each( function() {
        let newFilename;
        let file = null;
        let canvas = null;
        if ( this.type === 'file' ) {
            file = this.files[ 0 ]; // Why doesn't this fail for empty file inputs?
        } else if ( this.value ) {
            canvas = $( this ).closest( '.question' )[ 0 ].querySelector( '.draw-widget canvas' );
            if ( canvas && !URL_RE.test( this.value ) ) {
                // TODO: In the future, we could simply do canvas.toBlob() instead
                file = dataUriToBlobSync( canvas.toDataURL() );
                file.name = this.value;
            }
        }
        if ( file && file.name ) {
            // Correct file names by adding a unique-ish postfix
            // First create a clone, because the name property is immutable
            // TODO: in the future, when browser support increase we can invoke
            // the File constructor to do this.
            newFilename = getFilename( file, this.dataset.filenamePostfix );

            // If file is resized, get Blob representation of data URI
            if ( this.dataset.resized && this.dataset.resizedDataURI ) {
                file = dataUriToBlobSync( this.dataset.resizedDataURI );
            }
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
 * @static
 * @function isTooLarge
 *
 * @description Placeholder function to check if file size is acceptable.
 *
 * @return {boolean} whether file is too large
 */
fileManager.isTooLarge = () => { return false; };

/**
 * @static
 * @function getMaxSizeReadable
 *
 * @description Replace with function that determines max size published in OpenRosa server response header.
 *
 * @return {string} human radable maximiym size
 */
fileManager.getMaxSizeReadable = () => { return `${5}MB`; };

export default fileManager;
