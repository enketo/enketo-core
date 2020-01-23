import Mediapicker from '../../src/widget/select-media/select-media';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties( Mediapicker );

const FORM =
    `<fieldset class="question or-appearance-columns-2 or-appearance-no-buttons ">
        <fieldset>
            <legend>
                <span lang="" class="question-label active">Label</span>
            </legend>
            <div class="option-wrapper">
                <label class="">
                    <input type="radio" name="/widgets/select_widgets/grid_2_columns" data-name="/widgets/select_widgets/grid_2_columns" value="a" data-type-xml="select1">
                    <span lang="default" class="option-label active">some option label</span>
                    <img lang="default" class="active" src="/media/get/https/api.ona.io/enketo/xformsMedia/68781/139078.jpg" alt="image">
                </label>
                <label class=""><input type="radio" name="/widgets/select_widgets/grid_2_columns" data-name="/widgets/select_widgets/grid_2_columns" value="b" data-type-xml="select1">
                    <span lang="default" class="option-label active">some option label</span>
                    <img lang="default" class="active" src="/media/get/https/api.ona.io/enketo/xformsMedia/68781/139079.jpg" alt="image">
                </label>
            </div>
        </fieldset>
    </fieldset>`;

describe( 'custom tests for media picker re.', () => {
    it( 'adds mask-date class and changes input type to text', () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const question = fragment.querySelector( '.question' );
        new Mediapicker( question );

        const textLabels = question.querySelectorAll( 'span.option-label' );
        expect( textLabels[ 0 ].style.display ).toEqual( 'none' );
        expect( textLabels[ 1 ].style.display ).toEqual( 'none' );
    } );
} );
