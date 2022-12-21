import input from '../../src/js/input';
import events from '../../src/js/event';
import DecimalInput from '../../src/widget/number-input/decimal-input';
import IntegerInput from '../../src/widget/number-input/integer-input';
import loadForm from '../helpers/load-form';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

/**
 * @typedef {import('../../src/js/form').Form} Form
 */

describe('Number inputs', () => {
    let formElement = loadForm('number-input-widgets.xml').view.html;

    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {HTMLFormElement} */
    let clone;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clone = formElement.cloneNode(true);
    });

    afterEach(() => {
        sandbox.restore();
        formElement = clone;
    });

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
        runAllCommonWidgetTests(IntegerInput, formElement.outerHTML, '2');

        it('is valid with an integer value', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
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
            const control = formElement.querySelector(IntegerInput.selector);
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
            const control = formElement.querySelector(IntegerInput.selector);
            const value = '4.1';
            const widget = new IntegerInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });

        it('is valid with a decimal value with multiple decimal digits', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '4.11';
            const widget = new DecimalInput(control);

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = widget;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('clears a programmatically assigned value with a misplaced negation character', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
            const initialValue = '4';
            const assignedValue = '4-';
            const widget = new IntegerInput(control);

            widget.value = initialValue;
            widget.value = assignedValue;

            await Promise.resolve();

            expect(widget.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
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
        runAllCommonWidgetTests(DecimalInput, formElement.outerHTML, '2');
        runAllCommonWidgetTests(DecimalInput, formElement.outerHTML, '2.1');

        it('is valid with an integer value', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
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
            const control = formElement.querySelector(DecimalInput.selector);
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
            const control = formElement.querySelector(DecimalInput.selector);
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
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '-4.1';
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
                const control = formElement.querySelector(
                    DecimalInput.selector
                );
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
                const control = formElement.querySelector(
                    DecimalInput.selector
                );
                const initialValue = '4';
                const assignedValue = '4.0.1';
                const widget = new DecimalInput(control);

                widget.value = initialValue;
                widget.value = assignedValue;

                await Promise.resolve();

                expect(widget.value).to.equal('');
            });

            it('is invalid with a user-entered value with multiple decimals', async () => {
                const control = formElement.querySelector(
                    DecimalInput.selector
                );
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
            const control = formElement.querySelector(DecimalInput.selector);
            const initialValue = '4';
            const assignedValue = '4-.0';
            const widget = new DecimalInput(control);

            widget.value = initialValue;
            widget.value = assignedValue;

            await Promise.resolve();

            expect(widget.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
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
                beforeEach(() => {
                    sandbox.stub(navigator, 'language').get(() => 'fr');
                    sandbox.stub(navigator, 'languages').get(() => ['fr']);
                });

                it('allows entry of localized decimal characters', async () => {
                    const control = formElement.querySelector(
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

            describe('language selection', () => {
                const unsupportedLanguage = 'nopenotreal';

                /**
                 * All of the language codes currently under test in
                 * format.spec.js, plus a few short code variants.
                 */
                const supportedLanguages = [
                    'ar-EG',
                    'en',
                    'en-US',
                    'en-us',
                    'fr',
                    'fr-FR',
                    'fi',
                    'he',
                    'ko-KR',
                    'nl',
                    'zh',
                    'zh-HK',
                ];

                /** @type {Form} */
                let form;

                /** @type {HTMLSelectElement} */
                let languageSelect;

                beforeEach(() => {
                    form = loadForm('number-input-widgets.xml');
                    formElement = form.view.html;

                    const languageOptions = [
                        unsupportedLanguage,
                        ...supportedLanguages,
                    ].map((language) => {
                        const option = document.createElement('option');

                        option.value = language;

                        return option;
                    });

                    const body = document.createElement('body');

                    formElement.insertAdjacentElement('beforebegin', body);
                    body.append(formElement);

                    const formHeader = document.createElement('header');

                    formHeader.classList.add('form-header');

                    const languageSelectContainer =
                        document.createElement('span');

                    languageSelectContainer.classList.add(
                        'form-language-selector'
                    );
                    formHeader.append(languageSelectContainer);
                    body.append(formHeader);

                    languageSelect = document.createElement('select');
                    languageSelect.id = 'form-languages';
                    languageSelectContainer.append(languageSelect);
                    languageSelect.append(...languageOptions);
                    formElement.append(languageSelect);
                });

                supportedLanguages.forEach((language) => {
                    it(`uses the form language ${language} on load`, async () => {
                        languageSelect.dataset.defaultLang = language;
                        form.init();

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal(language);
                    });

                    it(`uses the form language ${language} on change`, async () => {
                        form.init();
                        languageSelect.querySelector(
                            `[value="${language}"]`
                        ).selected = true;
                        languageSelect.dispatchEvent(events.Change());

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal(language);
                    });

                    it(`falls back to the browser language ${language} on load when the selected form language is unsupported by the browser`, () => {
                        languageSelect.dataset.defaultLang =
                            unsupportedLanguage;
                        sandbox
                            .stub(navigator, 'languages')
                            .get(() => [language, ...supportedLanguages]);
                        form.init();

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal(language);
                    });

                    it(`falls back to the browser language ${language} on change when the selected form language is unsupported by the browser`, () => {
                        const languagesStub = sandbox.stub(
                            navigator,
                            'languages'
                        );

                        languageSelect.dataset.defaultLang =
                            unsupportedLanguage;

                        languagesStub.get(() => [
                            'en-GB',
                            ...supportedLanguages,
                        ]);

                        form.init();

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal('en-GB');

                        languagesStub.get(() => [language, 'en-GB']);

                        window.dispatchEvent(new Event('languagechange'));

                        expect(question.lang).to.equal(language);
                    });

                    it(`uses the form language ${language} on change after previously falling back to the browser language`, () => {
                        const languagesStub = sandbox.stub(
                            navigator,
                            'languages'
                        );

                        languageSelect.dataset.defaultLang =
                            unsupportedLanguage;

                        languagesStub.get(() => ['en-GB']);

                        form.init();

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal('en-GB');

                        languageSelect.querySelector(
                            `[value="${language}"]`
                        ).selected = true;
                        languageSelect.dispatchEvent(events.Change());

                        expect(question.lang).to.equal(language);
                    });

                    it(`falls back to the browser language ${language} on change after an unsupported form language is chosen`, () => {
                        const languagesStub = sandbox.stub(
                            navigator,
                            'languages'
                        );

                        languageSelect.dataset.defaultLang = language;

                        languagesStub.get(() => ['en-GB']);

                        form.init();

                        const control = formElement.querySelector(
                            DecimalInput.selector
                        );
                        const question = control.closest('.question');

                        expect(question.lang).to.equal(language);

                        languageSelect.querySelector(
                            `[value="${unsupportedLanguage}"]`
                        ).selected = true;
                        languageSelect.dispatchEvent(events.Change());

                        expect(question.lang).to.equal('en-GB');
                    });
                });

                it.skip('reformats to a localized decimal character when the form language changes', () => {
                    // This is evidently untestable. The assignment
                    // `input.value = input.valueAsNumber`
                    // does cause the browser to reformat the
                    // number to the specified `lang`, but its
                    // runtime `value` always uses a period for the
                    // decimal character.
                });
            });
        }
    });
});
