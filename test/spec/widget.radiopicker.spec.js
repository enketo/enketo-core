import Radiopicker from '../../src/widget/radio/radiopicker';
import { testStaticProperties, testBasicInstantiation } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <fieldset class="question">
            <div class="option-wrapper">
                <label>
                    <input type="radio" name="/data/node" data-name="123" data-xml-type="select1" value="1">
                </label>
                <label>
                    <input type="radio" name="/data/node" data-name="123" data-xml-type="select1" value="2">
                </label>
            </div>
        </fieldset>
    <form>`;

testStaticProperties( Radiopicker );
testBasicInstantiation( Radiopicker, FORM );
