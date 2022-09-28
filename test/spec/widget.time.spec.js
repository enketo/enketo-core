import { initTimeLocalization } from '../../src/js/format';
import Timepicker from '../../src/widget/time/timepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM = `
    <form class="or">
        <label class="question">
            <input name="/data/time" type="time" data-type-xml="time" value="" />
        </label>
    </form>`;

describe('timepicker widget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {Function} */
    let teardownTimeLocalization;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        const languages = ['nl'];

        sandbox.stub(navigator, 'languages').get(() => languages);
        teardownTimeLocalization = initTimeLocalization();
    });

    afterEach(() => {
        teardownTimeLocalization();
        sandbox.restore();
    });

    runAllCommonWidgetTests(Timepicker, FORM, '13:23');

    describe('manual input without Enter', () => {
        it(`is propagated correctly`, () => {
            const fragment = document
                .createRange()
                .createContextualFragment(FORM);
            const control = fragment.querySelector('input');
            // Note: time zone information is added outside of the widget (in the model)
            const newVal = '14:01';
            const timepicker = new Timepicker(control);
            const fakeInput = timepicker.element
                .closest('.question')
                .querySelector('.widget input');
            const input = timepicker.element
                .closest('.question')
                .querySelector('input[type="time"]');

            input.onchange = sinon.stub().callsFake(() => {});

            // add manual value to fake input
            fakeInput.value = newVal;
            fakeInput.dispatchEvent(new Event('change'));

            expect(input.value).to.equal(newVal);
            expect(input.onchange.callCount).to.equal(1);

            // reset value in fake input manually
            fakeInput.value = '';
            fakeInput.dispatchEvent(new Event('change'));

            expect(input.value).to.equal('');
        });
    });
});
