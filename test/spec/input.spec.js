import loadForm from '../helpers/load-form';

describe( 'input helper', () => {

    describe( 'getIndex() function', () => {

        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const inputEls = form.view.html.querySelectorAll( '[name="/nested_repeats/kids/kids_details/immunization_info/vaccine"]' );

        [ 0, 1, 2, 3, 4 ].forEach( index => {
            it( 'works with nested repeats to get the index of a question in respect to the whole form', () => {
                expect( form.input.getIndex( inputEls[ index ] ) ).toEqual( index );
            } );
        } );
    } );

    describe( 'clears form controls', () => {
        const form = loadForm( 'repeat-default.xml' );
        form.init();
        const num = form.view.html.querySelector( '[name="/repdef/rep/num"]' );
        const grp = form.view.html.querySelector( '[name="/repdef/rep"]' );

        it( 'works for groups of control', () => {
            expect( num.value ).toEqual( '5' );

            form.input.clear( grp );

            expect( num.value ).toEqual( '' );
        } );
    } );
} );
