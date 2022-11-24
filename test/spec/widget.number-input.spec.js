import input from '../../src/js/input';
import events from '../../src/js/event';
import DecimalInput from '../../src/widget/number-input/decimal-input';
import IntegerInput from '../../src/widget/number-input/integer-input';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const integerForm = `<label class="question non-select" lang="en">
        <span lang="" class="question-label active">Number</span>
        <input type="number" name="/widgets/integer" data-type-xml="int">
    </label>`;
const decimalForm = integerForm.replace(
    'data-type-xml="int"',
    'data-type-xml="decimal"'
);

describe('Number inputs', () => {
    [
        { type: 'int', excludedType: 'decimal', Widget: IntegerInput },
        { type: 'decimal', excludedType: 'int', Widget: DecimalInput },
    ].forEach(({ type, excludedType, Widget }) => {
        describe('ignored elements', () => {
            it(`does not handle ${excludedType} types`, async () => {
                const fragment = document
                    .createRange()
                    .createContextualFragment(
                        `<input type="number" data-type-xml="${excludedType}">`
                    );

                expect(fragment.querySelector(Widget.selector)).to.equal(null);
            });

            it('does not handle range inputs', () => {
                const rangeInput = document
                    .createRange()
                    .createContextualFragment(
                        `<input type="number" data-type-xml="${type}" min="1" max="10" step="1">`
                    )
                    .querySelector('input');

                expect(IntegerInput.condition(rangeInput)).to.equal(false);
            });

            const otherWidgets = [
                'analog-scale',
                'my-widget',
                'distress',
                'rating',
            ];

            otherWidgets.forEach((type) => {
                it(`does not handle ${type} widget inputs`, () => {
                    const input = document
                        .createRange()
                        .createContextualFragment(
                            `<label class="question non-select or-appearance-${type}">
                        <span lang="" class="question-label active">${type}</span>
                        <input type="number" name="/widgets/integer" data-type-xml="int">
                    </label>`
                        )
                        .querySelector('input');

                    expect(IntegerInput.condition(input)).to.equal(false);
                });
            });
        });
    });

    describe('integer', () => {
        runAllCommonWidgetTests(IntegerInput, integerForm, '2');

        it('is valid with an integer value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(integerForm);
            const control = fragment.querySelector(IntegerInput.selector);
            const value = '4';
            const widget = new IntegerInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative integer value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(integerForm);
            const control = fragment.querySelector(IntegerInput.selector);
            const value = '-4';
            const widget = new IntegerInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is invalid with a decimal value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(integerForm);
            const control = fragment.querySelector(IntegerInput.selector);
            const value = '4.1';
            const widget = new IntegerInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });

        it('clears a programmatically assigned value with a misplaced negation character', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(integerForm);
            const control = fragment.querySelector(IntegerInput.selector);
            const initialValue = '4';
            const assignedValue = '4-';
            const widget = new IntegerInput(control);

            widget.value = initialValue;
            widget.value = assignedValue;

            await Promise.resolve();

            expect(widget.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(integerForm);
            const control = fragment.querySelector(IntegerInput.selector);
            const initialValue = '4';
            const enteredValue = '4-';
            const widget = new IntegerInput(control);

            // This allows invalid values to be assigned, similar to the behavior
            // of Firefox and Safari
            control.type = 'text';
            input.setVal(control, initialValue, events.Input());
            input.setVal(control, enteredValue, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });
    });

    describe('decimal', () => {
        runAllCommonWidgetTests(DecimalInput, decimalForm, '2');
        runAllCommonWidgetTests(DecimalInput, decimalForm, '2.1');

        it('is valid with an integer value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const value = '4';
            const widget = new DecimalInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a decimal value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const value = '4.1';
            const widget = new DecimalInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative integer value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const value = '-4';
            const widget = new DecimalInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative decimal value', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const value = '-4';
            const widget = new DecimalInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        const supportsTrailingDecimal = () => {
            const input = document.createElement('input');

            input.type = 'number';
            input.value = '1.';

            return input.value === '1';
        };

        if (supportsTrailingDecimal()) {
            it('is valid with a trailing decimal character', async () => {
                const fragment = document
                    .createRange()
                    .createContextualFragment(decimalForm);
                const control = fragment.querySelector(DecimalInput.selector);
                const value = '4.';
                const widget = new DecimalInput(control);

                input.setVal(control, value, events.Input());
                control.dispatchEvent(events.Change());

                await Promise.resolve();

                const { question } = widget;

                expect(question.classList.contains('invalid-value')).to.equal(
                    false
                );
                expect(widget.value).to.equal('4');
            });

            it('clears a programmatically assigned value with multiple decimals', async () => {
                const fragment = document
                    .createRange()
                    .createContextualFragment(decimalForm);
                const control = fragment.querySelector(DecimalInput.selector);
                const initialValue = '4';
                const assignedValue = '4.0.1';
                const widget = new DecimalInput(control);

                widget.value = initialValue;
                widget.value = assignedValue;

                await Promise.resolve();

                expect(widget.value).to.equal('');
            });

            it('is invalid with a user-entered value with multiple decimals', async () => {
                const fragment = document
                    .createRange()
                    .createContextualFragment(decimalForm);
                const control = fragment.querySelector(DecimalInput.selector);
                const initialValue = '4';
                const enteredValue = '4.0.1';
                const widget = new DecimalInput(control);

                // This allows invalid values to be assigned, similar to the behavior
                // of Firefox and Safari
                control.type = 'text';
                input.setVal(control, initialValue, events.Input());
                input.setVal(control, enteredValue, events.Input());

                await Promise.resolve();

                const { question } = widget;

                expect(question.classList.contains('invalid-value')).to.equal(
                    true
                );
            });
        }

        it('clears a programmatically assigned value with a misplaced negation character', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const initialValue = '4';
            const assignedValue = '4-.0';
            const widget = new DecimalInput(control);

            widget.value = initialValue;
            widget.value = assignedValue;

            await Promise.resolve();

            expect(widget.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const fragment = document
                .createRange()
                .createContextualFragment(decimalForm);
            const control = fragment.querySelector(DecimalInput.selector);
            const initialValue = '4';
            const enteredValue = '4-';
            const widget = new DecimalInput(control);

            // This allows invalid values to be assigned, similar to the behavior
            // of Firefox and Safari
            control.type = 'text';
            input.setVal(control, initialValue, events.Input());
            input.setVal(control, enteredValue, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });

        const isLocalizedDecimalInputSupported = () => {
            const label = document.createElement('label');
            const input = document.createElement('input');

            label.append(input);

            label.lang = 'fr';
            input.type = 'number';
            input.step = '0.1';
            input.value = '1,2';

            return input.value !== '' && input.checkValidity();
        };

        if (isLocalizedDecimalInputSupported()) {
            describe('localized decimal input', () => {
                let sandbox;

                beforeEach(() => {
                    sandbox = sinon.createSandbox();
                    sandbox.stub(navigator, 'language').get(() => 'fr');
                    sandbox.stub(navigator, 'languages').get(() => ['fr']);
                });

                afterEach(() => {
                    sandbox.restore();
                });

                it('allows entry of localized decimal characters', async () => {
                    const fragment = document
                        .createRange()
                        .createContextualFragment(decimalForm);
                    const control = fragment.querySelector(
                        DecimalInput.selector
                    );
                    const value = '3,4';
                    const widget = new DecimalInput(control);

                    // This allows invalid values to be assigned, similar to the behavior
                    // of Firefox and Safari
                    control.value = value;
                    control.dispatchEvent(events.Input());

                    await Promise.resolve();

                    const { question } = widget;

                    expect(
                        question.classList.contains('invalid-value')
                    ).to.equal(false);
                    expect(widget.value).to.equal('3.4');
                });
            });
        }
    });
});
