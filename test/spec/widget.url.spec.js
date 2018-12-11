import UrlWidget from '../../src/widget/url/url-widget';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question or-appearance-url">
            <input name="/data/url" type="text" data-type-xml="string" />
        </label>
        <input />
    </form>`;

runAllCommonWidgetTests( UrlWidget, FORM, 'https://enketo.org/' );
