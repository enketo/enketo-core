import ColumnsWidget from '../../src/widget/columns/columns';
import { testBasicInstantiation, testStaticProperties } from '../helpers/test-widget';

const FORM =
    `<fieldset class="question simple-select or-appearance-columns">
        <fieldset>
            <legend>
                <span lang="" class="question-label active">Select</span>
            </legend>
            <div class="option-wrapper">
                <label>
                    <input type="checkbox" name="/data/a" value="yes" data-type-xml="select">
                    <span lang="" class="option-label active">Yes</span>
                </label>
                <label>
                    <input type="checkbox" name="/data/a" value="no" data-type-xml="select">
                    <span lang="" class="option-label active">No</span>
                </label>
                <label>
                    <input type="checkbox" name="/data/a" value="dk" data-type-xml="select">
                    <span lang="" class="option-label active">Don't Know</span>
                </label>
                <label>
                    <input type="checkbox" name="/data/a" value="na" data-type-xml="select">
                    <span lang="" class="option-label active">Not Applicable</span>
                </label>
            </div>
        </fieldset>
    </fieldset>`;

testStaticProperties( ColumnsWidget );
testBasicInstantiation( ColumnsWidget, FORM );

describe( 'ColumnsWidget', () => {

    it( 'adds fillers', done => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const el = fragment.querySelector( ColumnsWidget.selector );

        Promise.resolve()
            .then( () => new ColumnsWidget( el ) )
            .then( () => {
                expect( el.querySelectorAll( '.option-wrapper > .filler' ).length ).toEqual( 2 );
            } )
            .then( done, fail );
    } );

} );
