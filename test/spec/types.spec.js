import types from '../../src/js/types';

/*
 * Most of types.js is tested indirectly by formmodel.spec.js.
 */

describe( 'Types', () => {

    describe( 'time', () => {

        describe( 'meridian convertor', () => {

            [
                [ '12:03 PM', '12:03' ],
                [ '01:03 PM', '13:03' ],
                [ '11:03 AM', '11:03' ],
                [ '12:01 AM', '00:01' ],
                [ '12:03', '12:03' ],
                [ '13:03', '13:03' ],
                [ '01:03', '01:03' ]
            ].forEach( t => {
                it( `converts ${t[0]} to: ${t[1]}`, () => {
                    expect( types.time.convertMeridian( t[ 0 ] ) ).to.equal( t[ 1 ] );
                } );
            } );

        } );

    } );
} );
