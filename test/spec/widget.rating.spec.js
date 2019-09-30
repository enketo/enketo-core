import RatingWidget from '../../src/widget/rating/rating';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    `<label class="question non-select or-appearance-rating">
        <span lang="" class="question-label active">Rating</span>
        <input type="number" name="/widgets/range_widgets/range4" data-type-xml="int" min="0" max="5" step="1">
    </label>`;
const FORM2 = FORM1.replace( 'step="1"', 'step="0.1"' );

runAllCommonWidgetTests( RatingWidget, FORM1, '2' );
runAllCommonWidgetTests( RatingWidget, FORM2, '2.1' );