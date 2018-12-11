import loadForm from '../helpers/load-form';

describe( 'input helper', () => {

    describe( 'getIndex() function', () => {

        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const $inputEls = form.view.$.find( '[name="/nested_repeats/kids/kids_details/immunization_info/vaccine"]' );

        [ 0, 1, 2, 3, 4 ].forEach( index => {
            it( 'works with nested repeats to get the index of a question in respect to the whole form', () => {
                expect( form.input.getIndex( $inputEls.eq( index ) ) ).toEqual( index );
            } );
        } );
    } );
} );
