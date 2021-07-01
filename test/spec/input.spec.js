import loadForm from '../helpers/load-form';

describe( 'input helper', () => {

    describe( 'getIndex() function', () => {

        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const inputEls = form.view.html.querySelectorAll( '[name="/nested_repeats/kids/kids_details/immunization_info/vaccine"]' );

        [ 0, 1, 2, 3, 4 ].forEach( index => {
            it( 'works with nested repeats to get the index of a question in respect to the whole form', () => {
                expect( form.input.getIndex( inputEls[ index ] ) ).to.equal( index );
            } );
        } );
    } );

    describe( 'setVal() function', () => {
        it( 'is able to clear a value from a group of radiobuttons', () => {
            const form = loadForm( 'radio2.xml' );
            form.init();
            const radioEl = form.view.html.querySelector( 'input[type="radio"]' );

            // setup
            form.input.setVal( radioEl, '1' );
            expect( form.input.getVal( radioEl ) ).to.equal( '1' );

            // bug: https://github.com/OpenClinica/enketo-express-oc/issues/481#issuecomment-829429174
            form.input.setVal( radioEl, '' );
            expect( form.input.getVal( radioEl ) ).to.equal( '' );
        } );
    } );

    describe( 'clear() function', () => {
        const form = loadForm( 'repeat-default.xml' );
        form.init();
        const num = form.view.html.querySelector( '[name="/repdef/rep/num"]' );
        const grp = form.view.html.querySelector( '[name="/repdef/rep"]' );

        it( 'works for groups of control', () => {
            expect( num.value ).to.equal( '5' );

            form.input.clear( grp );

            expect( num.value ).to.equal( '' );
        } );
    } );
} );
