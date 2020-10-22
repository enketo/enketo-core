import DesktopSelectWidget from '../../src/widget/select-desktop/selectpicker';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties( DesktopSelectWidget );

const FORM = `
    <form class="or">
        <label class="question or-appearance-minimal">
            <select data-type-xml="string" name="/data/node" readonly>
        </label>
    </form>`;

describe( 'select-desktop widget', () => {
    it( 'for single-select is identified as readonly', () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'select' );
        const widget = new DesktopSelectWidget( control );

        expect( widget.props.readonly ).toEqual( true );
    } );

    it( 'for single-select is not identified as readonly', () => {
        const fragment = document.createRange().createContextualFragment( FORM.replace( 'readonly', '' ) );
        const control = fragment.querySelector( 'select' );
        const widget = new DesktopSelectWidget( control );

        expect( widget.props.readonly ).toEqual( false );
    } );

    it( 'for multi-select is identified as readonly', () => {
        const fragment = document.createRange().createContextualFragment( FORM.replace ( 'readonly', 'readonly multiple' ) );
        const control = fragment.querySelector( 'select' );
        const widget = new DesktopSelectWidget( control );

        expect( widget.props.readonly ).toEqual( true );
    } );

    it( 'for multi-select is not identified as readonly', () => {
        const fragment = document.createRange().createContextualFragment( FORM.replace( 'readonly', 'multiple' ) );
        const control = fragment.querySelector( 'select' );
        const widget = new DesktopSelectWidget( control );

        expect( widget.props.readonly ).toEqual( false );
    } );
} );

