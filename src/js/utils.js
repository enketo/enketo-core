if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
define( function( require, exports, module ) {
    'use strict';

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

    module.exports = {
        parseFunctionFromExpression: parseFunctionFromExpression,
        stripQuotes: stripQuotes,
    };
} );
