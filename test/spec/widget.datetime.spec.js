import Datetimepicker from '../../src/widget/datetime/datetimepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question ">
            <input name="/data/dt" type="datetime-local" data-type-xml="dateTime" value="" />
        </label>
    </form>`;

// Arizona timezone and meridian preference
runAllCommonWidgetTests( Datetimepicker, FORM, '2012-01-01T13:00:00.000-07:00' );

describe( 'datetimepicker widget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    beforeEach( () => {
        sandbox = sinon.createSandbox();
    } );

    afterEach( () => {
        sandbox.restore();
    } );


    function initForm( form ) {
        const fragment = document.createRange().createContextualFragment( form );
        const control = fragment.querySelector( 'input' );
        return new Datetimepicker( control );
    }

    describe( 'manual input without Enter', () => {

        it( 'is propagated correctly for datetime fields', () => {
            const datepicker = initForm( FORM );
            const input = datepicker.element;
            const fakeDateInput = datepicker.element.closest( '.question' ).querySelector( '.widget .date input' );
            const fakeTimeInput = datepicker.element.closest( '.question' ).querySelector( '.widget .timepicker input' );

            input.onchange = sinon.stub();

            // add manual value to fake input
            fakeDateInput.value = '2012-01-01';
            fakeTimeInput.value = '01:01';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            // timezone info will be added by engine
            expect( input.value ).to.equal( '2012-01-01T01:01:00.000' );
            expect( input.onchange.callCount ).to.equal( 1 );

            // reset value in fake input manually
            fakeDateInput.value = '';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            expect( input.value ).to.equal( '' );
            expect( input.onchange.callCount ).to.equal( 2 );
        } );

    } );

} );
