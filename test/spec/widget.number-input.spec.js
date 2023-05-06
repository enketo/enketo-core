import input from '../../src/js/input';
import events from '../../src/js/event';
import DecimalInput from '../../src/widget/number-input/decimal-input';
import IntegerInput from '../../src/widget/number-input/integer-input';
import loadForm from '../helpers/load-form';
import { runAllCommonWidgetTests } from '../helpers/test-widget';
import forms from '../mock/forms';

/**
 * @typedef {import('../../src/js/form').Form} Form
 */

describe('Number inputs', () => {
    const formHTML = forms['number-input-widgets.xml'].html_form;
    const decimalInit = DecimalInput.prototype._init;
    const integerInit = DecimalInput.prototype._init;

    /** @type {Form} */
    let form;

    /** @type {HTMLElement | null} */
    let formHeader;

    /** @type {HTMLSelectElement | null} */
    let languageSelect;

    /** @type {HTMLFormElement} */
    let formElement;

    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {boolean} */
    let preInit;

    /** @type {DecimalInput | null} */
    let decimalInput;

    /** @type {IntegerInput | null} */
    let integerInput;

    before(() => {
        preInit = true;
    });

    beforeEach(() => {
        formHeader = null;
        languageSelect = null;
        decimalInput = null;
        integerInput = null;

        sandbox = sinon.createSandbox();

        sandbox.stub(DecimalInput.prototype, '_init').callsFake(function () {
            decimalInput = this;

            return decimalInit.call(this);
        });

        sandbox.stub(IntegerInput.prototype, '_init').callsFake(function () {
            integerInput = this;

            return integerInit.call(this);
        });

        form = loadForm('number-input-widgets.xml');
        formElement = form.view.html;
        document.body.append(formElement);

        if (preInit) {
            form.init();
        }
    });

    afterEach(() => {
        formHeader?.remove();
        formElement.remove();
        sandbox.restore();
        form.resetView();
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
                'analog-scale', // included as courtesy to OpenClinica
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
        runAllCommonWidgetTests(IntegerInput, formHTML, '2');

        it('is valid with an integer value', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
            const value = '4';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = integerInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative integer value', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
            const value = '-4';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = integerInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is invalid with a decimal value', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
            const value = '4.1';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = integerInput;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });

        it('is valid with a decimal value with multiple decimal digits', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '4.11';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('clears a programmatically assigned value with a misplaced negation character', async () => {
            const initialValue = '4';
            const assignedValue = '4-';

            integerInput.value = initialValue;
            integerInput.value = assignedValue;

            await Promise.resolve();

            expect(integerInput.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const control = formElement.querySelector(IntegerInput.selector);
            const initialValue = '4';
            const enteredValue = '4-';

            // This allows invalid values to be assigned, similar to the behavior
            // of Firefox and Safari
            control.type = 'text';
            input.setVal(control, initialValue, events.Input());
            input.setVal(control, enteredValue, events.Input());

            await Promise.resolve();

            const { question } = integerInput;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });
    });

    describe('decimal', () => {
        runAllCommonWidgetTests(DecimalInput, formHTML, '2');
        runAllCommonWidgetTests(DecimalInput, formHTML, '2.1');

        it('is valid with an integer value', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '4';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a decimal value', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '4.1';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative integer value', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '-4';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

            expect(question.classList.contains('invalid-value')).to.equal(
                false
            );
        });

        it('is valid with a negative decimal value', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const value = '-4.1';

            input.setVal(control, value, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

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

                input.setVal(control, value, events.Input());
                control.dispatchEvent(events.Change());

                await Promise.resolve();

                const { question } = decimalInput;

                expect(question.classList.contains('invalid-value')).to.equal(
                    false
                );
                expect(decimalInput.value).to.equal('4');
            });

            it('clears a programmatically assigned value with multiple decimals', async () => {
                const initialValue = '4';
                const assignedValue = '4.0.1';

                decimalInput.value = initialValue;
                decimalInput.value = assignedValue;

                await Promise.resolve();

                expect(decimalInput.value).to.equal('');
            });

            it('is invalid with a user-entered value with multiple decimals', async () => {
                const control = formElement.querySelector(
                    DecimalInput.selector
                );
                const initialValue = '4';
                const enteredValue = '4.0.1';

                // This allows invalid values to be assigned, similar to the behavior
                // of Firefox and Safari
                control.type = 'text';
                input.setVal(control, initialValue, events.Input());
                input.setVal(control, enteredValue, events.Input());

                await Promise.resolve();

                const { question } = decimalInput;

                expect(question.classList.contains('invalid-value')).to.equal(
                    true
                );
            });
        }

        it('clears a programmatically assigned value with a misplaced negation character', async () => {
            const initialValue = '4';
            const assignedValue = '4-.0';

            decimalInput.value = initialValue;
            decimalInput.value = assignedValue;

            await Promise.resolve();

            expect(decimalInput.value).to.equal('');
        });

        it('is invalid with a user-entered misplaced negation character', async () => {
            const control = formElement.querySelector(DecimalInput.selector);
            const initialValue = '4';
            const enteredValue = '4-';

            // This allows invalid values to be assigned, similar to the behavior
            // of Firefox and Safari
            control.type = 'text';
            input.setVal(control, initialValue, events.Input());
            input.setVal(control, enteredValue, events.Input());

            await Promise.resolve();

            const { question } = decimalInput;

            expect(question.classList.contains('invalid-value')).to.equal(true);
        });

        /**
         * @param {string[]} languages
         */
        const setLanguageOptions = (languages) => {
            const languageOptions = languages.map((language) => {
                const option = document.createElement('option');

                option.value = language;

                return option;
            });

            formHeader = document.createElement('header');

            formHeader.classList.add('form-header');

            const languageSelectContainer = document.createElement('span');

            languageSelectContainer.classList.add('form-language-selector');
            formHeader.append(languageSelectContainer);
            formElement.insertAdjacentElement('beforebegin', formHeader);

            languageSelect = document.createElement('select');
            languageSelect.id = 'form-languages';
            languageSelectContainer.append(languageSelect);
            languageSelect.append(...languageOptions);
            formElement.append(languageSelect);
        };

        const isLocalizedNumeralInputSupported = () => {
            const label = document.createElement('label');
            const input = document.createElement('input');

            label.append(input);

            label.lang = 'ar-EG';
            input.type = 'number';
            input.value = '١';

            return input.value !== '' && input.checkValidity();
        };

        if (isLocalizedNumeralInputSupported()) {
            describe('localized integer input', () => {
                before(() => {
                    preInit = false;
                });

                beforeEach(() => {
                    setLanguageOptions(['ar-EG']);
                    form.init();
                    formElement.dispatchEvent(events.ChangeLanguage());
                });

                it('does not prevent entering localized numerals in an integer input by keyboard', () => {
                    const control = formElement.querySelector(
                        IntegerInput.selector
                    );
                    const event = new KeyboardEvent('keydown', {
                        key: '١',
                    });
                    const preventDefaultStub = sandbox.stub(
                        event,
                        'preventDefault'
                    );

                    control.dispatchEvent(event);

                    expect(preventDefaultStub).not.to.have.been.called;
                });

                it('does not prevent entering localized numerals in a decimal input by keyboard', () => {
                    const control = formElement.querySelector(
                        IntegerInput.selector
                    );
                    const event = new KeyboardEvent('keydown', {
                        key: '٢',
                    });
                    const preventDefaultStub = sandbox.stub(
                        event,
                        'preventDefault'
                    );

                    control.dispatchEvent(event);

                    expect(preventDefaultStub).not.to.have.been.called;
                });
            });
        }

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
                before(() => {
                    preInit = false;
                });

                beforeEach(() => {
                    sandbox.stub(navigator, 'language').get(() => 'fr');
                    sandbox.stub(navigator, 'languages').get(() => ['fr']);
                    form.init();
                });

                it('allows entry of localized decimal characters', async () => {
                    const control = formElement.querySelector(
                        DecimalInput.selector
                    );
                    const value = '3,4';

                    // This allows invalid values to be assigned, similar to the behavior
                    // of Firefox and Safari
                    control.value = value;
                    control.dispatchEvent(events.Input());

                    await Promise.resolve();

                    const { question } = decimalInput;

                    expect(
                        question.classList.contains('invalid-value')
                    ).to.equal(false);
                    expect(control.value).to.equal('3.4');
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

                before(() => {
                    preInit = false;
                });

                beforeEach(() => {
                    formElement = form.view.html;

                    setLanguageOptions([
                        unsupportedLanguage,
                        ...supportedLanguages,
                    ]);
                });

                afterEach(() => {
                    formHeader.remove();
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
