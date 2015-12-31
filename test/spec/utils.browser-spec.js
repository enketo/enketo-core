/*
 * In a future version of PhantomJS with DOMParser support for Blobs, these tests can move to the regular spec.
 */

var utils = require( '../../src/js/utils' );

describe( 'return postfixed filenames', function() {

    [
        [ 'myname', '-mypostfix', 'myname-mypostfix' ],
        [ 'myname.jpg', '-mypostfix', 'myname-mypostfix.jpg' ],
        [ 'myname.dot.jpg', '-mypostfix', 'myname.dot-mypostfix.jpg' ],
        [ 'myname.000', '-mypostfix', 'myname-mypostfix.000' ],
        [ undefined, 'mypostfix', '' ],
        [ null, 'mypostfix', '' ],
        [ false, 'mypostfix', '' ],
        [ 'myname', undefined, 'myname' ],
        [ 'myname', null, 'myname' ],
        [ 'myname', false, 'myname' ]
    ].forEach( function( test ) {
        var file = new Blob( [ 'a' ], {
            type: 'text'
        } );
        file.name = test[ 0 ];
        var postfix = test[ 1 ];
        var expected = test[ 2 ];

        it( 'returns the filename ' + expected + ' from ' + file.name + ' and ' + postfix, function() {
            expect( utils.getFilename( file, postfix ) ).toEqual( expected );
        } );
    } );
} );
