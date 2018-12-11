import TextareaWidget from '../../src/widget/textarea/textarea';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';


const FORM = `
    <form class="or">
        <label class="question">
            <textarea type="text" name="/data/node">
        </label>
    </form>`;

testStaticProperties( TextareaWidget );
testBasicInstantiation( TextareaWidget, FORM );
