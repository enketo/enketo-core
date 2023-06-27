import events from '../../js/event';
import { t } from '../../js/fake-translator';
import Widget from '../../js/widget';

/** @type {Set<NumberInput>} */
let numberInputInstances = new Set();

/** @type {WeakMap<HTMLInputElement, HTMLElement>} */
let questionsByInput = new WeakMap();

/**
 * @param {HTMLInputElement} input
 */
const getQuestion = (input) => {
    let question = questionsByInput.get(input);

    if (question == null) {
        question = input.closest('.question');

        if (question != null) {
            questionsByInput.set(input, question);
        }
    }

    return question;
};

/**
 * @abstract
 * @extends {Widget<HTMLInputElement>}
 */
class NumberInput extends Widget {
    static languageChanged() {
        this._languages = null;

        const { language, pattern } = this;
        const patternStr = pattern.source;

        Array.from(numberInputInstances.values()).forEach((instance) => {
            // Important: this value may become invalid if it isn't accessed
            // before setting `lang`. This repros in Firefox if:
            //
            // 1. Your default language is English
            // 2. Set a decimal value
            // 3. Switch to French
            // 4. Switch back to English
            const { element, question } = instance;
            const { valueAsNumber } = element;

            question.setAttribute('lang', language);
            element.setAttribute('pattern', patternStr);
            instance.setFormattedValue(valueAsNumber);
            instance.setValidity();
        });
    }

    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        super.globalInit(form, rootElement);

        rootElement.addEventListener(
            events.ChangeLanguage().type,
            this.languageChanged
        );
        window.addEventListener('languagechange', this.languageChanged);
    }

    static globalReset() {
        const { rootElement } = super.globalReset();

        if (rootElement) {
            rootElement.removeEventListener(
                events.ChangeLanguage().type,
                this.languageChanged
            );
            window.removeEventListener('languagechange', this.languageChanged);
        }

        this._languages = null;
        numberInputInstances = new Set();
        questionsByInput = new WeakMap();
    }

    /**
     * @abstract
     */
    static get selector() {
        throw new Error('Not implemented');
    }

    /**
     * @param {HTMLInputElemnt} input
     */
    static condition(input) {
        if (input.classList.contains('ignore')) {
            return false;
        }

        const isRange =
            input.hasAttribute('min') &&
            input.hasAttribute('max') &&
            input.hasAttribute('step');

        if (isRange) {
            return false;
        }

        const question = getQuestion(input);

        // analog-scale is included as a courtesy to OpenClinica
        return ![
            'or-appearance-analog-scale',
            'or-appearance-my-widget',
            'or-appearance-distress',
            'or-appearance-rating',
        ].some((className) => question.classList.contains(className));
    }

    /**
     * @private
     * @type {string[] | null}
     */
    _languages = null;

    static get languages() {
        let result = this._languages;

        if (result != null) {
            return result;
        }

        const { currentLanguage } = this.form;

        let validFormLanguage;

        try {
            Intl.getCanonicalLocales(currentLanguage);

            validFormLanguage = currentLanguage;
        } catch {
            // If this fails, the form's selected language is likely not a valid
            // code and will cause all other `Intl` usage to fail.
        }

        result = [validFormLanguage, ...navigator.languages].filter(
            (language) => language != null
        );

        this._languages = result;

        return result;
    }

    static get language() {
        return this.languages[0] ?? navigator.language;
    }

    static get pattern() {
        throw new Error('Not implemented');
    }

    /**
     * @abstract
     * @type {Set<string>}
     */
    static get validCharacters() {
        throw new Error('Not implemented');
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

        numberInputInstances.add(this);

        const question = getQuestion(input);
        const message = document.createElement('div');

        question.setAttribute('lang', this.constructor.language);
        message.classList.add('invalid-value-msg', 'active');

        question.append(message);

        this.question = question;
        this.message = message;

        this.setFormattedValue(input.valueAsNumber);
        this.setValidity();

        // TODO event delegation?
        input.addEventListener('keydown', (event) => {
            const { ctrlKey, isComposing, key, metaKey } = event;

            if (
                ctrlKey ||
                metaKey ||
                (key && key.length > 1 && key !== 'Spacebar') ||
                (!isComposing && this.constructor.validCharacters.has(key))
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
        const { pattern } = this.constructor;
        const { element } = this;

        element.removeAttribute('pattern');
        element.value = '';

        if (!Number.isNaN(value)) {
            element.value = value;
        }

        element.setAttribute('pattern', pattern.source);
    }

    setValidity() {
        const { element, message, question } = this;

        const isValid = element.checkValidity();

        question.classList.toggle('invalid-value', !isValid);
        message.innerText = isValid ? '' : t('constraint.invalid');
        this.isValid = isValid;
    }
}

export default NumberInput;
