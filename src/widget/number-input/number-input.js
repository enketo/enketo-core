import { t } from '../../js/fake-translator';
import events from '../../js/event';
import inputModule from '../../js/input';
import Widget from '../../js/widget';

/**
 * @abstract
 * @extends {Widget<HTMLInputElement>}
 */
export default class NumberInput extends Widget {
    /**
     * @abstract
     */
    static get numberType() {
        throw new Error('Not implemented');
    }

    static get selector() {
        return `.question input[type="number"][data-type-xml="${this.numberType}"]`;
    }

    /**
     * @param {HTMLInputElemnt} input
     */
    static condition(input) {
        const isRange =
            input.hasAttribute('min') &&
            input.hasAttribute('max') &&
            input.hasAttribute('step');

        if (isRange || input.classList.contains('ignore')) {
            return false;
        }

        const question = input.closest('.question');

        return [
            'or-appearance-analog-scale',
            'or-appearance-my-widget',
            'or-appearance-distress',
            'or-appearance-rating',
        ].every((className) => !question.classList.contains(className));
    }

    get languages() {
        const formLanguage = this.element
            .closest('form.or')
            ?.parentElement?.querySelector('#form-languages')?.value;

        let validFormLanguage;

        try {
            Intl.getCanonicalLocales(formLanguage);

            validFormLanguage = formLanguage;
        } catch {
            // If this fails, the form's selected language is likely not a valid
            // code and will cause all other `Intl` usage to fail.
        }

        return [validFormLanguage, ...navigator.languages].filter(
            (language) => language != null
        );
    }

    get language() {
        return this.languages[0] ?? navigator.language;
    }

    get formatter() {
        const locales = Intl.getCanonicalLocales(this.languages);

        return Intl.NumberFormat(locales);
    }

    /** @type {Set<string>} */
    get decimalCharacters() {
        return new Set();
    }

    get pattern() {
        const { decimalCharacters } = this;
        const decimalPattern =
            decimalCharacters.size === 0
                ? ''
                : `([${Array.from(decimalCharacters).join('')}]\\d+)?`;
        const pattern = `^-?\\d+${decimalPattern}$`;

        this.element.setAttribute('pattern', pattern);

        return new RegExp(pattern);
    }

    get characterPattern() {
        const { decimalCharacters } = this;

        return new RegExp(`[-0-9${Array.from(decimalCharacters).join('')}]`);
    }

    get value() {
        return this.element.value;
    }

    set value(value) {
        this.element.value = value;
    }

    /**
     * @param {HTMLInputElement} input
     * @param {any} options
     */
    constructor(input, options) {
        super(input, options);

        let { characterPattern } = this;

        const question = inputModule.getWrapNode(input);
        const message = document.createElement('div');

        message.classList.add('invalid-value-msg', 'active');

        question.setAttribute('lang', this.language);
        question.append(message);

        this.question = question;
        this.message = message;

        this.setFormattedValue(input.valueAsNumber);
        this.setValidity();

        const languageChanged = () => {
            // Important: get the value *before* changing the
            // `lang` attribute, else it may become invalid and
            // be treated as NaN/blank before formatting.
            const { valueAsNumber } = input;

            characterPattern = this.characterPattern;
            question.setAttribute('lang', this.language);
            this.setFormattedValue(valueAsNumber);
            this.setValidity();
        };

        document.addEventListener(
            events.ChangeLanguage().type,
            languageChanged
        );
        window.addEventListener('languagechange', languageChanged);

        input.addEventListener('keydown', (event) => {
            const { ctrlKey, isComposing, key, metaKey } = event;

            if (
                ctrlKey ||
                metaKey ||
                (key.length > 1 && key !== 'Spacebar') ||
                (!isComposing && characterPattern.test(event.key))
            ) {
                return true;
            }

            event.preventDefault();
            event.stopPropagation();
        });

        input.addEventListener('input', () => {
            this.setValidity();
        });
    }

    /**
     * @param {number} value
     */
    setFormattedValue(value) {
        const { formatter, element, pattern } = this;

        element.setAttribute('pattern', pattern.source);

        if (Number.isNaN(value)) {
            element.value = '';
        } else if (value !== '') {
            const formatted = formatter.format(value);

            element.value = formatted;

            if (element.value !== formatted) {
                element.value = value;
            }
        }
    }

    setValidity() {
        const { element, message, question } = this;

        const isValid = element.checkValidity();

        question.classList.toggle('invalid-value', !isValid);
        message.innerText = isValid ? '' : t('constraint.invalid');
        this.isValid = isValid;
    }
}
