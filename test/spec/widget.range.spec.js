import RangeWidget from '../../src/widget/range/range-widget';
import { runAllCommonWidgetTests } from '../helpers/test-widget';
import input from '../../src/js/input';
import events from '../../src/js/event';

const FORM1 =
    `<label class="question non-select or-appearance-no-ticks">
        <span lang="" class="question-label active">Range</span>
        <input type="number" name="/widgets/range_widgets/range3" data-type-xml="int" min="0" max="5" step="1">
    </label>`;
const FORM2 = FORM1.replace( 'step="1"', 'step="0.1"' );

runAllCommonWidgetTests( RangeWidget, FORM1, '2' );
runAllCommonWidgetTests( RangeWidget, FORM2, '2.1' );


// This test looks very similar to the common testExcessiveChangeEventAvoidance test, but it is subtly different,
// because it actually also test an issue where the widget internally fires a change event when the widget is empty,
// and the user clicks it. This fires 2 events, whereby the first is fired before the model changes the value from empty.
// https://github.com/OpenClinica/enketo-express-oc/issues/209
describe( 'RangeWidget', () => {

    it( 'is firing a change event on the range input (the widget) without actually changing the value does not lead to an unnecessary change event firing', done => {
        const fragment = document.createRange().createContextualFragment( FORM1 );
        const control = fragment.querySelector( RangeWidget.selector );
        const value = '2';

        // Also needs to work for radiobuttons, checkboxes, selects.
        input.setVal( control, value, null );

        Promise.resolve()
            .then( () => new RangeWidget( control ) )
            .then( widget => {
                // Check setup
                expect( widget.originalInputValue ).toEqual( value );
                expect( widget.range.value ).toEqual( value );
                // Actual test
                let changeEventCounter = 0;
                control.addEventListener( 'change', () => changeEventCounter++ );
                widget.range.dispatchEvent( events.Change() );
                expect( changeEventCounter ).toEqual( 0 );
            } )
            .then( done, fail );
    } );

} );
