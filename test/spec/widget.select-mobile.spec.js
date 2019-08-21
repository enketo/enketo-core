import MobileSelectWidget from '../../src/widget/select-mobile/selectpicker';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';

const FORM =
    `<label class="question or-appearance-minimal ">
        <span lang="" class="question-label active">Select multiple: pulldown</span>
        <select multiple="multiple" name="/widgets/select_widgets/select_spinner" data-type-xml="select" >
            <option value="">...</option>
            <option value="a">option a</option>
            <option value="b">option b</option>
            <option value="c">option c</option>
            <option value="d">option d</option>
        </select>
        <span class="or-option-translations" style="display:none;"></span>
    </label>`;

testStaticProperties( MobileSelectWidget );
testBasicInstantiation( MobileSelectWidget, FORM );

describe( 'Mobile multi-select picker', () => {
    it( 'shows selected values next to select element', () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'select' );
        const widget = new MobileSelectWidget( control );

        control.querySelector( 'option[value="b"]' ).selected = true;
        control.querySelector( 'option[value="d"]' ).selected = true;
        control.dispatchEvent( new Event( 'change' ) );
        expect( widget.question.querySelector( '.mobileselect' ).textContent ).toEqual( 'b, d' );
    } );
} );
