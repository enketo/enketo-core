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

    get formatter() {
        const locales = Intl.getCanonicalLocales(navigator.languages);

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

        /*
         * TODO (2022-12-19): Currently the default theme's styles hide any
         * element with a `lang` attribute unless it also has an `active` class.
         * This is because transformer and core both overload the `lang`
         * attribute to store translated strings in the HTML DOM, which are not
         * meant to be displayed unless they're for the chosen language. This
         * may change in the (possibly near) future, in which case we should
         * also stop adding these `active` classes.
         */

        question.setAttribute('lang', navigator.language);
        question.classList.add('active');
        question.append(message);

        document.addEventListener(events.ChangeLanguage().type, () => {
            question.classList.add('active');
        });

        this.question = question;
        this.message = message;

        this.format();
        this.setValidity();

        window.addEventListener('languagechange', () => {
            characterPattern = this.validCharacter;
            question.setAttribute('lang', navigator.language);
            this.format();
            this.setValidity();
        });

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

    format() {
        const { formatter, element, pattern } = this;
        const { valueAsNumber } = element;

        element.setAttribute('pattern', pattern.source);

        if (valueAsNumber !== '') {
            const formatted = formatter.format(valueAsNumber);

            element.value = formatted;

            if (element.value !== formatted) {
                element.value = valueAsNumber;
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
