import TextMaxWidget from '../../src/widget/text-max/text-max';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';


const FORM1 = `
    <form class="or">
        <label class="question">
            <textarea data-type-xml="string" name="/data/node">
        </label>
    </form>`;
const FORM2 = `
    <form class="or">
        <label class="question">
            <input type="text" data-type-xml="string" name="/data/node">
        </label>
    </form>`;

testStaticProperties( TextMaxWidget );
testBasicInstantiation( TextMaxWidget, FORM1 );
testBasicInstantiation( TextMaxWidget, FORM2 );
