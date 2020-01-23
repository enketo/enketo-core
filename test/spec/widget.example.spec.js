import ExampleWidget from '../../src/widget/example/my-widget';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<label class="question or-appearance-my-widget">
        <input type="number" name="/data/node" data-type-xml="decimal" />
    </label>`;
const VALUE = '2';

runAllCommonWidgetTests( ExampleWidget, FORM, VALUE );
