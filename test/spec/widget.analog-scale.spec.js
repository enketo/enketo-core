import AnalogScaleWidget from '../../src/widget/analog-scale/analog-scalepicker';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    `<label class="question non-select or-appearance-analog-scale">
        <span lang="" class="question-label active">Range</span>
        <input type="number" name="/widgets/range_widgets/range3" data-type-xml="int" min="0" max="5" step="1">
    </label>`;
const FORM2 = FORM1.replace( 'step="1"', 'step="0.1"' );

runAllCommonWidgetTests( AnalogScaleWidget, FORM1, '2' );
runAllCommonWidgetTests( AnalogScaleWidget, FORM2, '2.1' );
