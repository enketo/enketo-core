import RankWidget from '../../src/widget/rank/rank-widget';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties( RankWidget );

describe( 'RankWidget instantiation', () => {
    const HTML1 = `
        <fieldset class="question or-appearance-one or-appearance-two">
            <input type="text" name="/data/node" data-type-xml="rank">
            <div class="option-wrapper">
                <label>
                    <input name="data/r" value="one" class="ignore" type="text">
                    <span class="option-label active" >ONE</span>
                </label>
                <label>
                    <input name="/data/r" value="two" class="ignore" type="text">
                    <span class="option-label active" >TWO</span>
                </label>
            </div>
        </fieldset>`;

    it( 'passes options and populates widget props', () => {
        const fragment = document.createRange().createContextualFragment( HTML1 );
        const control = fragment.querySelector( 'input' );
        const options = { a: 'b' };
        const widget = new RankWidget( control, options );

        expect( widget.element ).toEqual( control );
        expect( widget.props.appearances ).toEqual( [ 'one', 'two' ] );
        expect( widget.options ).toEqual( options );
    } );

    it( 'loads default value', () => {
        const fragment = document.createRange().createContextualFragment( HTML1 );
        const control = fragment.querySelector( 'input' );
        control.value = 'two one';
        const widget = new RankWidget( control );

        expect( widget.originalInputValue ).toEqual( 'two one' );
        expect( widget.value ).toEqual( 'two one' );
    } );
} );
