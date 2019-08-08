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

/**
 * @function init
 *
 * @description Initialize the file manager.
 *
 * @return {Promise|boolean|Error} promise boolean or rejection with Error
 */
fileManager.init = () => { return Promise.resolve( true ); };

/**
 * @function isWaitingForPermissions
 *
 * @description Whether the filemanager is waiting for user permissions
 *
 * @return {boolean} [description]
 */
fileManager.isWaitingForPermissions = () => { return false; };

/**
 * @function getFileUrl
 *
 * @description Obtains a URL that can be used to show a preview of the file when used
 * as a src attribute.
 *
 * It is meant for media previews and media downloads.
 *
 * @param  {?string|Object} subject - File or filename in local storage
 * @return {Promise|string|Error} promise url string or rejection with Error
 */
fileManager.getFileUrl = subject => {
    return new Promise( ( resolve, reject ) => {
        let error;

        if ( !subject ) {
            resolve( null );
        } else if ( typeof subject === 'string' ) {
            // TODO obtain from storage as http URL or objectURL
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
 * @function getObjectUrl
 *
 * @description Similar to getFileURL, except that this one is guaranteed to return an objectURL
 *
 * It is meant for loading images into a canvas.
 *
 * @param  {?string|Object} subject - File or filename in local storage
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
 * @function getCurrentFiles
 *
 * @description Obtain files currently stored in file input elements of open record
 *
 * @return {Array.File} array of files
 */
fileManager.getCurrentFiles = () => {
    const files = [];

    // Get any files inside file input elements or text input elements for drawings.
    $( 'form.or' )
        .find( 'input[type="file"]:not(.ignore)' ).each( function() {
            let file = this.files[ 0 ]; // Why doesn't this fail for empty file inputs?
            // If file is resized, get Blob representation of data URI
            if ( file && file.name && this.dataset.resized && this.dataset.resizedDataURI ) {
                file = dataUriToBlobSync( this.dataset.resizedDataURI );
            }

            if ( file && file.name ) {
                const postfixed = addFilenamePostfix(file, this.dataset.filenamePostfix);
                files.push( postfixed );
            }
        } )
        .end()
        .find( 'input[type="text"][data-drawing="true"]' ).each( function() {
            if ( this.value ) {
                const canvas = $( this ).closest( '.question' )[ 0 ].querySelector( '.draw-widget canvas' );
                if ( canvas ) {
                    // TODO: In the future, we could simply do canvas.toBlob() instead
                    const file = dataUriToBlobSync( canvas.toDataURL() );
                    file.name = this.value;
                    if ( file && file.name ) {
                        const postfixed = addFilenamePostfix(file, this.dataset.filenamePostfix);
                        files.push( postfixed );
                    }
                }
            }
        })
        .end()
        .find( 'input[type="text"][data-audio-recording="true"]' ).each( function() {
            if ( this.value ) {
                const audio = $( this ).closest( '.question' )[ 0 ].querySelector( '.audio-recorder-widget audio' );
                if (audio && audio.src) {
                    const file = dataUriToBlobSync( audio.src );
                    file.name = this.value;
                    if (file && file.name) {
                        files.push(file);
                    }
                }
            }
        });

    return files;
};

/**
 * @function addFilenamePostfix
 *
 * @description Clone the given file object, and append the given postfix to the filename.
 *
 * @param {File} file - File object which will be cloned, and whose name property will have a postfix added.
 * @param {string | undefined} postfix - Optional postfix parameter
 * @return {File} cloned File object with modified filename.
 */
function addFilenamePostfix(file, postfix) {
    // Correct file names by adding a unique-ish postfix
    // First create a clone, because the name property is immutable
    // TODO: in the future, when browser support increase we can invoke
    // the File constructor to do this.
    const newFilename = getFilename( file, postfix );
    const clone = new Blob( [ file ], {
        type: file.type
    } );
    clone.name = newFilename;
    return clone;
}

/**
 * @function isTooLarge
 *
 * @description Placeholder function to check if file size is acceptable.
 *
 * @return {boolean} whether file is too large
 */
fileManager.isTooLarge = () => { return false; };

/**
 * @function getMaxSizeReadable
 *
 * @description Replace with function that determines max size published in OpenRosa server response header.
 *
 * @return {string} human radable maximiym size
 */
fileManager.getMaxSizeReadable = () => { return `${5}MB`; };

export default fileManager;
