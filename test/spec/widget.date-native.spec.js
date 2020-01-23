import DateNative from '../../src/widget/date-native/datepicker-native';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';

const FORM =
    `<label class="question">
        <input name="/data/date" type="date" data-type-xml="date" readonly />
    </label>`;

testStaticProperties( DateNative );
testBasicInstantiation( DateNative, FORM );

describe( 'Date-native widget', () => {
    it( 'adds mask-date class and changes input type to text', () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'input' );
        new DateNative( control );

        expect( control.classList.contains( 'mask-date' ) ).toEqual( true );
        expect( control.type ).toEqual( 'text' );
    } );
} );
