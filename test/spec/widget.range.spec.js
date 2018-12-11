import RangeWidget from '../../src/widget/range/range-widget';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    `<label class="question non-select or-appearance-no-ticks">
        <span lang="" class="question-label active">Range</span>
        <input type="number" name="/widgets/range_widgets/range3" data-type-xml="int" min="0" max="5" step="1">
    </label>`;
const FORM2 = FORM1.replace( 'step="1"', 'step="0.1"' );

runAllCommonWidgetTests( RangeWidget, FORM1, '2' );
runAllCommonWidgetTests( RangeWidget, FORM2, '2.1' );
