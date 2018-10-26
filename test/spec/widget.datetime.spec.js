import $ from 'jquery';
import widget from '../../src/widget/datetime/datetimepicker-extended';

const FORM1 = '<form class="or"><label class="question "><input type="datetime" data-type-xml="datetime" value="" /></label></form>';

describe( 'datetimepicker widget', () => {

    function initForm( form ) {
        const $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'manual input without Enter', () => {

        it( 'is propagated correctly for datetime fields', () => {
            const $form = initForm( FORM1 );
            const input = $form[ 0 ].querySelector( widget.selector );
            const fakeDateInput = $form[ 0 ].querySelector( '.widget .date input' );
            const fakeTimeInput = $form[ 0 ].querySelector( '.widget .timepicker input' );

            input.onchange = () => {};
            spyOn( input, 'onchange' );

            // add manual value to fake input
            fakeDateInput.value = '2012-01-01';
            fakeTimeInput.value = '01:01';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            expect( $( input ).data( widget.name ) ).not.toBeUndefined();
            expect( input.value ).toEqual( '2012-01-01T01:01:00.000-07:00' );
            expect( input.onchange.calls.count() ).toEqual( 1 );

            // reset value in fake input manually
            fakeDateInput.value = '';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            expect( input.value ).toEqual( '' );
            expect( input.onchange.calls.count() ).toEqual( 2 );
        } );

    } );

    describe( 'default values', () => {

        const defaultVal = '2012-01-01T13:00:00.000-06:00';
        const $form = initForm( FORM1.replace( 'value=""', `value="${defaultVal}"` ) );
        const input = $form[ 0 ].querySelector( widget.selector );
        const fakeDateInput = $form[ 0 ].querySelector( '.widget .date input' );
        const fakeTimeInput = $form[ 0 ].querySelector( '.widget .timepicker input' );

        it( 'are shown correctly for datetime fields', () => {
            expect( $( input ).data( widget.name ) ).not.toBeUndefined();
            expect( input.value ).toEqual( defaultVal );
            expect( fakeDateInput.value ).toEqual( defaultVal.split( 'T' )[ 0 ] );
            expect( fakeTimeInput.value ).toEqual( '12:00 AM' ); // Arizona timezone and meridan preference
        } );

    } );

    describe( 'calculated values', () => {

        const calculatedVal = '2012-01-01T13:00:00.000-06:00';
        const $form = initForm( FORM1 );
        const input = $form[ 0 ].querySelector( widget.selector );
        const fakeDateInput = $form[ 0 ].querySelector( '.widget .date input' );
        const fakeTimeInput = $form[ 0 ].querySelector( '.widget .timepicker input' );

        // simulate a change by a calculation
        $( input ).val( calculatedVal )[ widget.name ]( 'update' );

        it( 'are shown correctly for datetime fields', () => {
            expect( $( input ).data( widget.name ) ).not.toBeUndefined();
            expect( fakeDateInput.value ).toEqual( calculatedVal.split( 'T' )[ 0 ] );
            expect( fakeTimeInput.value ).toEqual( '12:00 AM' ); // Arizona timezone and meridan preference
        } );

    } );

} );
