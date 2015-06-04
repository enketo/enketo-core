if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ 'enketo-js/utils' ], function( utils ) {

    describe( 'Parsing expressions', function() {
        var t = [
            [ 'func(b,c)', '', [] ],
            [ 'func(b,c)', undefined, [] ],
            [ 'func(b,c)', null, [] ],
            [ 'func(b,c)', false, [] ],
            [ '', 'func', [] ],
            [ undefined, 'func', [] ],
            [ null, 'func', [] ],
            [ false, 'func', [] ],
            [ 'func(b,c)', 'func', [
                [ 'func(b,c)', 'b,c' ]
            ] ],
            [ 'func(b,c(1+funca(4,7)))', 'func', [
                [ 'func(b,c(1+funca(4,7)))', 'b,c(1+funca(4,7))' ]
            ] ],
            [ 'func(a,b) + 5 + func(b,c)', 'func', [
                [ 'func(a,b)', 'a,b' ],
                [ 'func(b,c)', 'b,c' ]
            ] ],
            [ '"blabla" + indexed-repeat(/path/to/a, /path/to, position(..) - 1) + "what"', 'indexed-repeat', [
                [ 'indexed-repeat(/path/to/a, /path/to, position(..) - 1)', '/path/to/a, /path/to, position(..) - 1' ]
            ] ],
        ];

        function test( expr, func, expected ) {
            it( 'extracts the calls to ' + func + ' and their parameters as a string from ' + expr, function() {
                var result = utils.parseFunctionFromExpression( expr, func );
                expect( result ).toEqual( expected );
            } );
        }

        for ( var i = 0; i < t.length; i++ ) {
            test( t[ i ][ 0 ], t[ i ][ 1 ], t[ i ][ 2 ] );
        }

    } );

} );
