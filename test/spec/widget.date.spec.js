/*global describe, require, it, expect, spyOn*/

'use strict';

var $ = require( 'jquery' );
var widget = require( '../../src/widget/date/datepicker-extended' );

var FORM1 = '<form class="or"><label class="question"><input type="date" data-type-xml="date"/></label><input /></form>';
var FORM2 = '<form class="or"><label class="question or-appearance-month-year"><input type="date" data-type-xml="date"/></label></form>';
var FORM3 = '<form class="or"><label class="question or-appearance-year"><input type="date" data-type-xml="date"/></label></form>';

describe( 'datepicker widget', function() {

    function initForm( form ) {
        var $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'manual input without Enter', function() {

        [
            [ 'plain date', FORM1, '2012-01-01' ],
            [ 'month-year', FORM2, '2012-01' ],
            [ 'year', FORM3, '2012' ]
        ].forEach( function( t ) {
            var desc = t[ 0 ];
            var newVal = t[ 2 ];
            var $form = initForm( t[ 1 ] );
            var input = $form[ 0 ].querySelector( widget.selector );
            var fakeInput = $form[ 0 ].querySelector( '.widget input' );

            it( 'is propagated correctly for ' + desc + ' fields', function() {
                input.onchange = function() {};
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
                expect( input.onchange.calls.count() ).toEqual( 2 );
            } );
        } );

    } );

} );
