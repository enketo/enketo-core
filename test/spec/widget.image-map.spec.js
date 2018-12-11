import ImageMapWidget from '../../src/widget/image-map/image-map';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const SVG = 'data:text/svg;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NTkiIGhlaWdodD0iNTkzIiB2aWV3Qm94PSIwIDAgOTI3IDU4NiI+DQo8dGl0bGU+QmxhbmsgVVMgc3RhdGVzIG1hcDwvdGl0bGU+DQo8Zz4NCiAgPHBhdGggZmlsbD0icGluayIgaWQ9IkNPIiBkPSJNMzgwLjIsMjM1LjUgbC0zNiwtMy41IC03OS4xLC04LjYgLTIuMiwyMi4xIC03LDUwLjQgLTEuOSwxMy43IDM0LDMuOSAzNy41LDQuNCAzNC43LDMgMTQuMywwLjZ6Ij48L3BhdGg+ICANCjwvZz4NCjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0E5QTlBOSIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjE1LDQ5M3Y1NWwzNiw0NSBNMCw0MjVoMTQ3bDY4LDY4aDg1bDU0LDU0djQ2Ij48L3BhdGg+DQo8L3N2Zz4=';
const FORM1 =
    `<form class="or">
        <fieldset class="question simple-select or-appearance-image-map">
            <fieldset>
                <legend>
                    <span lang="default" class="question-label active" >Select states from the image</span>
                    <img lang="default" class="active" src="${SVG}" alt="image">
                </legend>
                <div class="option-wrapper">
                    <label>
                        <input type="radio" name="/w/im" data-name="123" value="CO" data-type-xml="select1">
                        <span lang="" class="option-label active">Colorado/span>
                    </label>
                </div>
            </fieldset>
        </fieldset>
    </form>`;
//const FORM2 = FORM1.replace( '"radio"', '"checkbox"' );

// Note that these tests may not be testing what they appear to be testing. 
// Because of the unusual implementation of the widget, the tests don't actually check what is displayed on the map (e.g. a loaded value)
runAllCommonWidgetTests( ImageMapWidget, FORM1, 'CO' );

// the test with checkboxes don't run because input.setVal and input.getVal are not compatible for select_multiple type questions.
// One uses space-separated value and the other uses and array.
//runAllCommonWidgetTests( ImageMapWidget, FORM2, [ 'CO' ] );
