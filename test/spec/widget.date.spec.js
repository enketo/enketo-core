import $ from 'jquery';
import widget from '../../src/widget/date/datepicker-extended';

const FORM1 = '<form class="or"><label class="question"><input type="date" data-type-xml="date" value="" /></label><input /></form>';
const FORM2 = '<form class="or"><label class="question or-appearance-month-year"><input type="date" data-type-xml="date" value="" /></label></form>';
const FORM3 = '<form class="or"><label class="question or-appearance-year"><input type="date" data-type-xml="date" value="" /></label></form>';

describe( 'datepicker widget', () => {

    function initForm( form ) {
        const $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'manual input without Enter', () => {

        [
            [ 'full date', FORM1, '2012-01-01' ],
            [ 'month-year', FORM2, '2012-01' ],
            [ 'year', FORM3, '2012' ]
        ].forEach( t => {
            const desc = t[ 0 ];
            const newVal = t[ 2 ];
            const $form = initForm( t[ 1 ] );
            const input = $form[ 0 ].querySelector( widget.selector );
            const fakeInput = $form[ 0 ].querySelector( '.widget input' );

            it( `is propagated correctly for ${desc} fields`, () => {
                input.onchange = () => {};
                spyOn( input, 'onchange' );

                // add manual value to fake input
                fakeInput.value = newVal;
                fakeInput.dispatchEvent( new Event( 'change' ) );

                expect( $( input ).data( widget.name ) ).not.toBeUndefined();
                expect( input.value ).toEqual( '2012-01-01' );
                expect( input.onchange.calls.count() ).toEqual( 1 );

                // reset value in fake input manually
                fakeInput.value = '';
                fakeInput.dispatchEvent( new Event( 'change' ) );

                expect( input.value ).toEqual( '' );
            } );
        } );

    } );

    describe( 'default values', () => {

        const defaultVal = '2012-01-01';
        [
            [ 'full date', FORM1, defaultVal ],
            [ 'month-year', FORM2, '2012-01' ],
            [ 'year', FORM3, '2012' ]
        ].forEach( t => {
            const desc = t[ 0 ];
            const shownVal = t[ 2 ];
            const $form = initForm( t[ 1 ].replace( 'value=""', `value="${defaultVal}"` ) );
            const input = $form[ 0 ].querySelector( widget.selector );
            const fakeInput = $form[ 0 ].querySelector( '.widget input' );

            it( `are shown correctly for ${desc} fields`, () => {
                expect( $( input ).data( widget.name ) ).not.toBeUndefined();
                //expect( input.value ).toEqual( defaultVal );
                expect( fakeInput.value ).toEqual( shownVal );
            } );
        } );

    } );

    describe( 'calculated values', () => {

        const calculatedVal = '2017-02-03';
        [
            [ 'full date', FORM1, calculatedVal ],
            [ 'month-year', FORM2, '2017-02' ],
            [ 'year', FORM3, '2017' ]
        ].forEach( t => {
            const desc = t[ 0 ];
            const shownVal = t[ 2 ];
            const $form = initForm( t[ 1 ] );
            const input = $form[ 0 ].querySelector( widget.selector );
            const fakeInput = $form[ 0 ].querySelector( '.widget input' );

            // simulate a change by a calculation
            $( input ).val( calculatedVal )[ widget.name ]( 'update' );

            it( `are shown correctly for ${desc} fields`, () => {
                expect( $( input ).data( widget.name ) ).not.toBeUndefined();
                //expect( input.value ).toEqual( calculatedVal ); Note: for year, month and day are set to 01!
                expect( fakeInput.value ).toEqual( shownVal );
            } );
        } );

    } );

} );
