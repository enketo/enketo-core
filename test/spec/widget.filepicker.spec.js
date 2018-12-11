import Filepicker from '../../src/widget/file/filepicker';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question">
            <input name="/data/d" type="file" data-type-xml="binary" />
        </label>
        <input />
    </form>`;

runAllCommonWidgetTests( Filepicker, FORM, '' );
