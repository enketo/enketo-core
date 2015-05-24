define( function() {


    /**
     * Parses an Expression to extract a function call and its parameter content as a string.
     *
     * @param  {String} expr The expression to search
     * @param  {String} func The function name to search for
     * @return {<String, String>} The result array, where each result is an array containing the function call and the parameter content.
     */
    function parseFunctionFromExpression( expr, func ) {
        var index, result, openBrackets, start,
            findFunc = new RegExp( func + '\\s*\\(', 'g' ),
            results = [];

        if ( !expr || !func ) {
            return results;
        }

        while ( ( result = findFunc.exec( expr ) ) !== null ) {
            openBrackets = 1;
            start = result.index;
            index = findFunc.lastIndex;
            while ( openBrackets !== 0 ) {
                index++;
                if ( expr[ index ] === '(' ) {
                    openBrackets++;
                } else if ( expr[ index ] === ')' ) {
                    openBrackets--;
                }
            }
            // add [ 'function(a,b)', 'a,b' ] to result array
            results.push( [ expr.substring( start, index + 1 ), expr.substring( findFunc.lastIndex, index ).trim() ] );
        }

        return results;
    }

    return {
        parseFunctionFromExpression: parseFunctionFromExpression
    };
} );
