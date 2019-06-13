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
    $( 'form.or' ).find( 'input[type="file"]:not(.ignore), input[type="text"][data-drawing="true"]' ).each( function() {
        let newFilename;
        let file = null;
        let canvas = null;
        if ( this.type === 'file' ) {
            file = this.files[ 0 ]; // Why doesn't this fail for empty file inputs?
        } else if ( this.value ) {
            canvas = $( this ).closest( '.question' )[ 0 ].querySelector( '.draw-widget canvas' );
            if ( canvas ) {
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
            if ( fileManager.isImageFile( file ) ) {
                fileManager.resizeImage( file, fileManager.getMaxImageWidth(), fileManager.getMaxImageWidth() ).then( blob => {
                    file = blob;
                    file.name = newFilename;
                    files.push( file );
                } );
            } else {
                file = new Blob( [ file ], {
                    type: file.type
                } );
                file.name = newFilename;
                files.push( file );
            }
        }
    } );

    return files;
};

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

/**
 * @function getMaxImageWidth
 *
 * @description Replace with function that determines maximum image width.
 *
 * @return {Number} maximum image width
 */
fileManager.getMaxImageWidth = () => { return 1024; };

/**
 * @function isImageFile
 *
 * @description Check whether current file is image by reading its type.
 *
 * @return {boolean} whether file is image
 */
fileManager.isImageFile = file => { return file && file.type.split( '/' )[ 0 ] === 'image'; };

/**
 * @function resizeImage
 *
 * @param {File} file - image file to be resized
 * @param {Number} maxWidth - maximum width of resized image
 * @param {Number} maxHeight - maximum height of resized image
 *
 * @return {Promise<Blob>} promise of resized image blob
 */
fileManager.resizeImage = ( file, maxWidth, maxHeight ) => {
    return new Promise( ( resolve, reject ) => {
        let image = new Image();
        image.src = URL.createObjectURL( file );
        image.onload = () => {
            let width = image.width;
            let height = image.height;

            if ( width <= maxWidth && height <= maxHeight ) {
                resolve( file );
            }

            let newWidth;
            let newHeight;

            if ( width > height ) {
                newHeight = height * ( maxWidth / width );
                newWidth = maxWidth;
            } else {
                newWidth = width * ( maxHeight / height );
                newHeight = maxHeight;
            }

            let canvas = document.createElement( 'canvas' );
            canvas.width = newWidth;
            canvas.height = newHeight;

            let context = canvas.getContext( '2d' );

            context.drawImage( image, 0, 0, newWidth, newHeight );

            canvas.toBlob( resolve, file.type );
        };
        image.onerror = reject;
    } );
};

export default fileManager;
