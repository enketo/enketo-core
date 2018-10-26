import $ from 'jquery';
import widget from '../../src/widget/draw/draw-widget';

const FORM1 = '<form class="or"><label class="question or-appearance-draw"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';
const FORM2 = '<form class="or"><label class="question or-appearance-signature"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';
const FORM3 = '<form class="or"><label class="question or-appearance-annotate"><input type="file" data-type-xml="binary" accept="image/*" /></label><input /></form>';

describe( 'draw widget', () => {

    function initForm( form ) {
        const $form = $( form );
        $( 'body' ).find( 'form.or' ).append( $form );
        $form.find( widget.selector )[ widget.name ]();
        return $form;
    }

    describe( 'instantiation', () => {

        [ FORM1, FORM2, FORM3 ].forEach( form => {
            it( 'instantiates when it should', () => {
                const $form = initForm( form );
                expect( $form.find( widget.selector ).data( widget.name ) ).not.toBeUndefined();
            } );
            it( 'does not instantiate for non image accept attributes', () => {
                const newForm = form.replace( 'accept="image/*"', 'accept="something/else"' );
                const $form = initForm( newForm );
                expect( $form.find( widget.selector ).data( widget.name ) ).toBeUndefined();
            } );
        } );

    } );

} );
