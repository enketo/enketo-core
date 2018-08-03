var format = require( '../../src/js/format' );

describe( 'Format', function() {

    describe( 'for time determination', function() {
        var i;
        var t = [
            [ 'en-US', true, 'AM', 'PM' ],
            [ 'zh', true, '上午', '下午' ],
            [ 'ar-EG', true, 'ص', 'م' ],
            [ 'ko-KR', true, '오전', '오후' ],
            [ 'nl', false, null, null ],
            [ 'he', false, null, null ],
        ];

        function testMeridian( locale, expected ) {
            it( 'correctly identifies ' + locale + ' time meridian notation as ' + expected, function() {
                format.language = locale;
                expect( format.time.hour12 ).toEqual( expected );
            } );
        }

        for ( i = 0; i < t.length; i++ ) {
            testMeridian( t[ i ][ 0 ], t[ i ][ 1 ] );
        }

        function testPm( locale, am, pm ) {
            it( 'correctly extracts the AM and PM notation for ' + locale + ' as: ' + am + ',' + pm, function() {
                format.language = locale;
                expect( format.time.amNotation ).toEqual( am );
                expect( format.time.pmNotation ).toEqual( pm );
            } );
        }

        for ( i = 0; i < t.length; i++ ) {
            testPm( t[ i ][ 0 ], t[ i ][ 2 ], t[ i ][ 3 ] );
        }

    } );

} );
