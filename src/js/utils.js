/**
 * Various utilities.
 *
 * @module utils
 */

let cookies;

/**
 * Parses an Expression to extract all function calls and their argument arrays.
 *
 * @static
 * @param {string} expr - The expression to search
 * @param {string} func - The function name to search for
 * @return {Array<Array<string, any>>} The result array, where each result is an array containing the function call and array of arguments.
 */
function parseFunctionFromExpression( expr, func ) {
    let result;
    const findFunc = new RegExp( `${func}\\s*\\(`, 'g' );
    const results = [];

    if ( !expr || !func ) {
        return results;
    }

    while ( ( result = findFunc.exec( expr ) ) !== null ) {
        const args = [];
        let openBrackets = 1;
        let start = result.index;
        let argStart = findFunc.lastIndex;
        let index = argStart - 1;
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
    if ( typeof file === 'object' && file !== null && file.name ) {
        postfix = postfix || '';
        const filenameParts = file.name.split( '.' );
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
    if ( cookies ) {
        return cookies[ name ];
    }

    // In enketo-validate and perhaps other contexts, enketo-core is used in an empty page in a headless browser
    // In such a context document.cookie throws an 'Access is denied for this document' error.
    try {
        const parts = document.cookie.split( '; ' );
        cookies = {};

        for ( let i = parts.length - 1; i >= 0; i-- ) {
            const ck = parts[ i ].split( '=' );
            // decode URI
            ck[ 1 ] = decodeURIComponent( ck[ 1 ] );
            // if cookie is signed (using expressjs/cookie-parser/), extract value
            if ( ck[ 1 ].substr( 0, 2 ) === 's:' ) {
                ck[ 1 ] = ck[ 1 ].slice( 2 );
                ck[ 1 ] = ck[ 1 ].slice( 0, ck[ 1 ].lastIndexOf( '.' ) );
            }
            cookies[ ck[ 0 ] ] = decodeURIComponent( ck[ 1 ] );
        }

        return cookies[ name ];

    } catch( e ){
        console.error( 'Cookie error', e );

        return null;
    }
}

/**
 * @static
 * @param {string} dataURI - dataURI
 * @return {Blob} dataURI converted to a Blob
 */
function dataUriToBlobSync( dataURI ) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob( dataURI.split( ',' )[ 1 ] );
    // separate out the mime component
    const mimeString = dataURI.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];

    // write the bytes of the string to an ArrayBuffer
    const buffer = new ArrayBuffer( byteString.length );
    const array = new Uint8Array( buffer );

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
 * @static
 * @param {File} file - Image file to be resized
 * @param {number} maxPixels - Maximum pixels of resized image
 * @return {Promise<Blob>} Promise of resized image blob
 */
function resizeImage( file, maxPixels ) {
    return new Promise( ( resolve, reject ) => {
        const image = new Image();
        image.src = URL.createObjectURL( file );
        image.onload = () => {
            const width = image.width;
            const height = image.height;

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

            const canvas = document.createElement( 'canvas' );
            canvas.width = newWidth;
            canvas.height = newHeight;

            const context = canvas.getContext( '2d' );

            context.drawImage( image, 0, 0, newWidth, newHeight );

            canvas.toBlob( resolve, file.type );
        };
        image.onerror = reject;
    } );
}

/**
 * Copied from: https://gist.github.com/creationix/7435851
 * Joins path segments.  Preserves initial "/" and resolves ".." and "."
 * Does not support using ".." to go above/outside the root.
 * This means that join("foo", "../../bar") will not resolve to "../bar"
 */
function joinPath( /* path segments */ ) {
    // Split the inputs into a list of path commands.
    let parts = [];
    for ( var i = 0, l = arguments.length; i < l; i++ ) {
        parts = parts.concat( arguments[i].split( '/' ) );
    }
    // Interpret the path commands to get the new resolved path.
    let newParts = [];
    for ( i = 0, l = parts.length; i < l; i++ ) {
        var part = parts[i];
        // Remove leading and trailing slashes
        // Also remove "." segments
        if ( !part || part === '.' ) continue;
        // Interpret ".." to pop the last segment
        if ( part === '..' ) newParts.pop();
        // Push new path segments.
        else newParts.push( part );
    }
    // Preserve the initial slash if there was one.
    if ( parts[0] === '' ) newParts.unshift( '' );

    // Turn back into a single string path.
    return newParts.join( '/' ) || ( newParts.length ? '/' : '.' );
}


function getScript( url ) {
    const scriptTag = document.createElement( 'script' );
    const firstScriptTag = document.getElementsByTagName( 'script' )[0];
    scriptTag.src = url;
    firstScriptTag.parentNode.insertBefore( scriptTag, firstScriptTag );
}

export {
    parseFunctionFromExpression,
    stripQuotes,
    getFilename,
    isNumber,
    readCookie,
    dataUriToBlobSync,
    getPasteData,
    resizeImage,
    joinPath,
    getScript
};
