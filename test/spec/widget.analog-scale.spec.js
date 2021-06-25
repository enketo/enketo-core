import AnalogScaleWidget from '../../src/widget/analog-scale/analog-scalepicker';
import { runAllCommonWidgetTests, testBasicInstantiation } from '../helpers/test-widget';

const FORM1 =
    `<label class="question non-select or-appearance-analog-scale">
        <span lang="" class="question-label active">Range</span>
        <input type="number" name="/widgets/range_widgets/range3" data-type-xml="int" min="0" max="5" step="1">
    </label>`;
const FORM2 = FORM1.replace( 'step="1"', 'step="0.1"' );

runAllCommonWidgetTests( AnalogScaleWidget, FORM1, '2' );
runAllCommonWidgetTests( AnalogScaleWidget, FORM2, '2.1' );

const FORM_SHOW_SCALE =
    `<label class="question non-select or-appearance-analog-scale or-appearance-vertical or-appearance-show-scale">
        <span lang="" class="question-label active">Analog Scale</span>
        <input type="number" name="/widgets/analog_scale/widget1" data-type-xml="int">
    </label>`;

testBasicInstantiation( AnalogScaleWidget, FORM_SHOW_SCALE );

describe( 'Analog-scale widget with show scale', () => {

    const fragment = document.createRange().createContextualFragment( FORM_SHOW_SCALE );
    new AnalogScaleWidget( fragment.querySelector( 'input' ) );
    const widget = fragment.querySelector( '.range-widget' );
    const widgetInput = widget.querySelector( 'input' );
    const widgetScalesContainer = widget.querySelector( '.range-widget__scale' );

    it( 'adds widget that contain input with type range', () => {
        expect( widgetInput.type ).to.equal( 'range' );
    } );

    it( 'adds widget that contain input range with attribute min equals 0', () => {
        expect( widgetInput.getAttribute( 'min' ) ).to.equal( '0' );
    } );

    it( 'adds widget that contain input range with attribute max equals 100', () => {
        expect( widgetInput.getAttribute( 'max' ) ).to.equal( '100' );
    } );

    it( 'adds widget that contain input range with attribute step equals 10', () => {
        expect( widgetInput.getAttribute( 'step' ) ).to.equal( '10' );
    } );

    it( 'adds widget that contain visible min scale equals 0', () => {
        expect( widgetScalesContainer.querySelector( '.range-widget__scale__start' ).textContent ).to.equal( '0' );
    } );

    it( 'adds widget that contain visible max scale equals 100', () => {
        expect( widgetScalesContainer.querySelector( '.range-widget__scale__end' ).textContent ).to.equal( '100' );
    } );

    it( 'adds widget that contain 9 visible scales that not max and min', () => {
        expect( widgetScalesContainer.querySelectorAll( '.range-widget__scale__between' ).length ).to.equal( 9 );
    } );

    it( 'adds widget that contain 9 visible scales that not max and min with the right values', () => {
        const scalesNotMinMax = widgetScalesContainer.querySelectorAll( '.range-widget__scale__between' );
        const scalesNotMinMaxValues = Array.from( scalesNotMinMax ).map( ( scale ) => parseInt( scale.textContent, 10 ) );
        const expectedNotMinMaxValues = [ 10, 20, 30, 40, 50, 60, 70, 80, 90 ];

        expect( JSON.stringify( expectedNotMinMaxValues ) ).to.equal( JSON.stringify( scalesNotMinMaxValues ) );
    } );
} );
