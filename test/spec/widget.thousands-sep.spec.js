import ThousandsSeparatorWidget from '../../src/widget/thousands-sep/thousands-sep';
import { runAllCommonWidgetTests } from '../helpers/test-widget';
import input from '../../src/js/input';

const FORM =
    `<label class="question or-appearance-thousands-sep">
        <input type="number" name="/data/node" data-type-xml="decimal" />
    </label>`;
const VALUE = '200';

runAllCommonWidgetTests( ThousandsSeparatorWidget, FORM, VALUE );

describe( 'thousands-separator widget', () => {

    const fragment = document.createRange().createContextualFragment( FORM );
    const control = fragment.querySelector( 'input' );
    const widget = new ThousandsSeparatorWidget( control );

    const tests = [
        [ 1000, '1,000' ],
        [ 1000000, '1,000,000' ],
        [ -10000, '-10,000' ],
        [ -20.345, '-20.345' ],
        [ -2000.3456, '-2,000.3456' ]

    ];

    tests.forEach( test => {
        it( 'localizes numbers displayed to users', () => {
            input.setVal( control, test[ 0 ], null );
            // Here we call widget.update() explicitly because we provided a null event parameter in input.setVal
            widget.update();

            expect( widget.value ).toEqual( test[ 1 ] );
            expect( widget.originalInputValue ).toEqual( test[ 0 ].toString() );
        } );


    } );

} );
