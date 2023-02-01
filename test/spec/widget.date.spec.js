import Datepicker from '../../src/widget/date/datepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    '<form class="or"><label class="question"><input name="/data/date" type="date" data-type-xml="date" value="" /></label></form>';
const FORM2 =
    '<form class="or"><label class="question or-appearance-month-year"><input  name="/data/date" type="date" data-type-xml="date" value="" /></label></form>';
const FORM3 =
    '<form class="or"><label class="question or-appearance-year"><input name="/data/date" type="date" data-type-xml="date" value="" /></label></form>';

[FORM1, FORM2, FORM3].forEach((form) => {
    runAllCommonWidgetTests(Datepicker, form, '2012-01-01');
});

describe('datepicker widget', () => {
    function initForm(form) {
        const fragment = document.createRange().createContextualFragment(form);
        const control = fragment.querySelector('input');
        return new Datepicker(control);
    }

    describe('manual input without Enter', () => {
        /** @type {import('sinon').SinonSandbox} */
        let sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        [
            ['full date', FORM1, '2012-01-01'],
            ['month-year', FORM2, '2012-01'],
            ['year', FORM3, '2012'],
        ].forEach(([desc, form, newVal]) => {
            /** @type {HTMLElement} */
            let input;

            /** @type {HTMLElement} */
            let fakeInput;

            beforeEach(() => {
                const datepicker = initForm(form);

                input = datepicker.element;
                fakeInput = datepicker.element
                    .closest('.question')
                    .querySelector('.widget input');
            });

            it(`is propagated correctly for ${desc} fields`, () => {
                input.onchange = sinon.stub().callsFake(() => {});

                // add manual value to fake input
                fakeInput.value = newVal;
                fakeInput.dispatchEvent(new Event('change'));

                expect(input.value).to.equal('2012-01-01');
                expect(input.onchange.callCount).to.equal(1);

                // reset value in fake input manually
                fakeInput.value = '';
                fakeInput.dispatchEvent(new Event('change'));

                expect(input.value).to.equal('');
            });

            it(`sets date value when pasting ${desc} fields`, () => {
                const event = new ClipboardEvent('paste', {
                    clipboardData: new DataTransfer(),
                });
                event.clipboardData.setData('text/plain', newVal);

                fakeInput.dispatchEvent(event);

                expect(input.value).to.equal('2012-01-01');
            });
        });

        [
            ['full date', FORM1],
            ['month-year', FORM2],
        ].forEach(([desc, form]) => {
            it(`sets empty string when pasting year and appearance is ${desc}`, () => {
                const input = initForm(form).element;
                const fakeInput = input
                    .closest('.question')
                    .querySelector('.widget input');
                const event = new ClipboardEvent('paste', {
                    clipboardData: new DataTransfer(),
                });
                event.clipboardData.setData('text/plain', '2012');

                fakeInput.dispatchEvent(event);

                expect(input.value).to.equal('');
            });
            it(`sets empty string when user enters year and appearance is ${desc}`, () => {
                const input = initForm(form).element;
                const fakeInput = input
                    .closest('.question')
                    .querySelector('.widget input');

                fakeInput.value = '2012';
                fakeInput.dispatchEvent(new Event('change'));

                expect(input.value).to.equal('');
            });
        });
    });
});
