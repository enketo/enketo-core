/**
 * Various utilities.
 *
 * @module utils
 */

let cookies;

/**
 * Parses an Expression to extract all function calls and theirs argument arrays.
 *
 * @static
 * @param {string} expr - The expression to search
 * @param {string} func - The function name to search for
 * @return {Array<Array<string, any>>} The result array, where each result is an array containing the function call and array of arguments.
 */
function parseFunctionFromExpression( expr, func ) {
    let index;
    let result;
    let openBrackets;
    let start;
    let argStart;
    let args;
    const findFunc = new RegExp( `${func}\\s*\\(`, 'g' );
    const results = [];

    if ( !expr || !func ) {
        return results;
    }

    while ( ( result = findFunc.exec( expr ) ) !== null ) {
        openBrackets = 1;
        args = [];
        start = result.index;
        argStart = findFunc.lastIndex;
        index = argStart - 1;
        while ( openBrackets !== 0 && index < expr.length ) {
            index++;
            if ( expr[ index ] === '(' ) {
                openBrackets++;
            } else if ( expr[ index ] === ')' ) {
                openBrackets--;
            } else if ( expr[ index ] === ',' && openBrackets === 1 ) {
                args.push( expr.substring( argStart, index ).trim() );
                argStart = index + 1;
            }
        }
        // add last argument
        if ( argStart < index ) {
            args.push( expr.substring( argStart, index ).trim() );
        }

        // add [ 'function( a ,b)', ['a','b'] ] to result array
        results.push( [ expr.substring( start, index + 1 ), args ] );
    }

    return results;
}

/**
 * @static
 * @param {string} str - original string
 * @return {string} stripped string
 */
function stripQuotes( str ) {
    if ( /^".+"$/.test( str ) || /^'.+'$/.test( str ) ) {
        return str.substring( 1, str.length - 1 );
    }

    return str;
}

// Because iOS gives any camera-provided file the same filename, we need to a
// unique-ified filename.
//
// See https://github.com/kobotoolbox/enketo-express/issues/374
/**
 * @static
 * @param {object} file - File instance
 * @param {string} postfix - postfix for filename
 * @return {string} new filename
 */
function getFilename( file, postfix ) {
    let filenameParts;
    if ( typeof file === 'object' && file !== null && file.name ) {
        postfix = postfix || '';
        filenameParts = file.name.split( '.' );
        if ( filenameParts.length > 1 ) {
            filenameParts[ filenameParts.length - 2 ] += postfix;
        } else if ( filenameParts.length === 1 ) {
            filenameParts[ 0 ] += postfix;
        }

        return filenameParts.join( '.' );
    }

    return '';
}

/**
 * Converts NodeLists or DOMtokenLists to an array.
 *
 * @static
 * @param {NodeList|DOMTokenList} list - a Nodelist or DOMTokenList
 * @return {Array} list converted to array
 */
function toArray( list ) {
    const array = [];
    // iterate backwards ensuring that length is an UInt32
    for ( let i = list.length >>> 0; i--; ) {
        array[ i ] = list[ i ];
    }

    return array;
}

/**
 * @static
 * @param {*} n - value
 * @return {boolean} whether it is a number value
 */
function isNumber( n ) {
    return !isNaN( parseFloat( n ) ) && isFinite( n );
}

/**
 * @static
 * @param {string} name - a cookie to look for
 * @return {string|undefined} the value of the cookie
 */
function readCookie( name ) {
    let c;
    let C;
    let i;

    if ( cookies ) {
        return cookies[ name ];
    }

    c = document.cookie.split( '; ' );
    cookies = {};

    for ( i = c.length - 1; i >= 0; i-- ) {
        C = c[ i ].split( '=' );
        // decode URI
        C[ 1 ] = decodeURIComponent( C[ 1 ] );
        // if cookie is signed (using expressjs/cookie-parser/), extract value
        if ( C[ 1 ].substr( 0, 2 ) === 's:' ) {
            C[ 1 ] = C[ 1 ].slice( 2 );
            C[ 1 ] = C[ 1 ].slice( 0, C[ 1 ].lastIndexOf( '.' ) );
        }
        cookies[ C[ 0 ] ] = decodeURIComponent( C[ 1 ] );
    }

    return cookies[ name ];
}

/**
 * @static
 * @param {string} dataURI - dataURI
 * @return {Blob} dataURI converted to a Blob
 */
function dataUriToBlobSync( dataURI ) {
    let byteString;
    let mimeString;
    let buffer;
    let array;

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    byteString = atob( dataURI.split( ',' )[ 1 ] );
    // separate out the mime component
    mimeString = dataURI.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];

    // write the bytes of the string to an ArrayBuffer
    buffer = new ArrayBuffer( byteString.length );
    array = new Uint8Array( buffer );

    for ( let i = 0; i < byteString.length; i++ ) {
        array[ i ] = byteString.charCodeAt( i );
    }

    // write the ArrayBuffer to a blob
    return new Blob( [ array ], {
        type: mimeString
    } );
}

/**
 * @static
 * @param {Event} event - a paste event
 * @return {string|null} clipboard data text value contained in event or null
 */
function getPasteData( event ) {
    const clipboardData = event.clipboardData || window.clipboardData; // modern || IE11

    return ( clipboardData ) ? clipboardData.getData( 'text' ) : null;
}

/**
 * Update a HTML anchor to serve as a download or reset it if an empty objectUrl is provided.
 *
 * @static
 * @param {HTMLElement} anchor - The anchor element
 * @param {string} objectUrl - The objectUrl to download
 * @param {string} fileName - The filename of the file
 */
function updateDownloadLink( anchor, objectUrl, fileName ) {
    if ( window.updateDownloadLinkIe11 ) {
        return window.updateDownloadLinkIe11( ...arguments );
    }
    anchor.setAttribute( 'href', objectUrl || '' );
    anchor.setAttribute( 'download', fileName || '' );
}

/**
 * @static
 * @param {File} file - Image file to be resized
 * @param {number} maxPixels - Maximum pixels of resized image
 * @return {Promise<Blob>} Promise of resized image blob
 */
function resizeImage( file, maxPixels ) {
    return new Promise( ( resolve, reject ) => {
        let image = new Image();
        image.src = URL.createObjectURL( file );
        image.onload = () => {
            let width = image.width;
            let height = image.height;

            if ( width <= maxPixels && height <= maxPixels ) {
                resolve( file );
            }

            let newWidth;
            let newHeight;

            if ( width > height ) {
                newHeight = height * ( maxPixels / width );
                newWidth = maxPixels;
            } else {
                newWidth = width * ( maxPixels / height );
                newHeight = maxPixels;
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
}

export {
    parseFunctionFromExpression,
    stripQuotes,
    getFilename,
    toArray,
    isNumber,
    readCookie,
    dataUriToBlobSync,
    getPasteData,
    updateDownloadLink,
    resizeImage
};
