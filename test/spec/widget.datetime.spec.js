/*global describe, require, it, expect, spyOn*/

'use strict';

var $ = require( 'jquery' );
var widget = require( '../../src/widget/datetime/datetimepicker-extended' );

var FORM1 = '<form class="or"><label class="question "><input type="datetime" data-type-xml="datetime"/></label></form>';

describe( 'datepicker widget', function() {

    function initForm( form ) {
        var $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'manual input without Enter', function() {

        it( 'is propagated correctly for plain datetime fields', function() {
            var $form = initForm( FORM1 );
            var input = $form[ 0 ].querySelector( widget.selector );
            var fakeDateInput = $form[ 0 ].querySelector( '.widget .date input' );
            var fakeTimeInput = $form[ 0 ].querySelector( '.widget .timepicker input' );

            input.onchange = function() {};
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

} );
