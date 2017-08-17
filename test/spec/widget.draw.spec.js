/*global describe, require, it, expect*/

'use strict';

var $ = require( 'jquery' );
var widget = require( '../../src/widget/draw/draw-widget' );

var FORM1 = '<form class="or"><label class="question or-appearance-draw"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';
var FORM2 = '<form class="or"><label class="question or-appearance-signature"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';
var FORM3 = '<form class="or"><label class="question or-appearance-annotate"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';

describe( 'draw widget', function() {

    function initForm( form ) {
        var $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'instantiation', function() {

        [ FORM1, FORM2, FORM3 ].forEach( function( form ) {
            it( 'instantiates when it should', function() {
                var $form = initForm( form );
                expect( $form.find( widget.selector ).data( widget.name ) ).not.toBeUndefined();
            } );
            it( 'does not instantiate for non image accept attributes', function() {
                var newForm = form.replace( 'accept="image/*"', 'accept="something/else"' );
                var $form = initForm( newForm );
                expect( $form.find( widget.selector ).data( widget.name ) ).toBeUndefined();
            } );
        } );

    } );

} );
