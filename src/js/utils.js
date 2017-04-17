'use strict';

var cookies;

/**
 * Parses an Expression to extract all function calls and theirs argument arrays.
 *
 * @param  {String} expr The expression to search
 * @param  {String} func The function name to search for
 * @return {<String, <String*>>} The result array, where each result is an array containing the function call and array of arguments.
 */
function parseFunctionFromExpression( expr, func ) {
    var index;
    var result;
    var openBrackets;
    var start;
    var argStart;
    var args;
    var findFunc = new RegExp( func + '\\s*\\(', 'g' );
    var results = [];

    if ( !expr || !func ) {
        return results;
    }

    while ( ( result = findFunc.exec( expr ) ) !== null ) {
        openBrackets = 1;
        args = [];
        start = result.index;
        index = findFunc.lastIndex;
        argStart = index;
        while ( openBrackets !== 0 ) {
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
        args.push( expr.substring( argStart, index ).trim() );

        // add [ 'function( a ,b)', ['a','b'] ] to result array
        results.push( [ expr.substring( start, index + 1 ), args ] );
    }

    return results;
}

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
function getFilename( file, postfix ) {
    var filenameParts;
    if ( typeof file === 'object' && file.name ) {
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
 * Converts NodeLists or DOMtokenLists to an array
 * @param  {[type]} list [description]
 * @return {[type]}      [description]
 */
function toArray( list ) {
    var array = [];
    // iterate backwards ensuring that length is an UInt32
    for ( var i = list.length >>> 0; i--; ) {
        array[ i ] = list[ i ];
    }
    return array;
}

function isNumber( n ) {
    return !isNaN( parseFloat( n ) ) && isFinite( n );
}

function readCookie( name ) {
    var c;
    var C;
    var i;

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

module.exports = {
    parseFunctionFromExpression: parseFunctionFromExpression,
    stripQuotes: stripQuotes,
    getFilename: getFilename,
    toArray: toArray,
    isNumber: isNumber,
    readCookie: readCookie
};
