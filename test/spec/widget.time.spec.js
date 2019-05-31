import Timepicker from '../../src/widget/time/timepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';
import { format } from '../../src/js/format';

const FORM = `
    <form class="or">
        <label class="question">
            <input name="/data/time" type="time" data-type-xml="time" value="" />
        </label>
    </form>`;

// Note: time zone information is added outside of the widget (in the model)
// We need to explicitly set locale to avoid time format issues
const originalLocale = format.locale;

describe( 'timepicker widget', () => {

    beforeEach( () => {
        format.locale = 'nl';
    } );

    afterEach( () => {
        format.locale = originalLocale;
    } );

    runAllCommonWidgetTests( Timepicker, FORM, '13:23' );

    describe( 'manual input without Enter', () => {

        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'input' );
        // Note: time zone information is added outside of the widget (in the model)
        const newVal = '14:01';
        const timepicker = new Timepicker( control );
        const fakeInput = timepicker.element.closest( '.question' ).querySelector( '.widget input' );
        const input = timepicker.element.closest( '.question' ).querySelector( 'input[type="time"]' );

        it( `is propagated correctly`, () => {

            input.onchange = () => {};
            spyOn( input, 'onchange' );

            // add manual value to fake input
            fakeInput.value = newVal;
            fakeInput.dispatchEvent( new Event( 'change' ) );

            expect( input.value ).toEqual( newVal );
            expect( input.onchange.calls.count() ).toEqual( 1 );

            // reset value in fake input manually
            fakeInput.value = '';
            fakeInput.dispatchEvent( new Event( 'change' ) );

            expect( input.value ).toEqual( '' );
        } );

    } );

} );
