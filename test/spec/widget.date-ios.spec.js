import IosDatepicker from '../../src/widget/date-native-ios/datepicker-native-ios';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';

const FORM =
    `<label class="question">
        <input name="/data/date" type="date" data-type-xml="date" value="" readonly />
    </label>`;

testStaticProperties( IosDatepicker );
testBasicInstantiation( IosDatepicker, FORM );
