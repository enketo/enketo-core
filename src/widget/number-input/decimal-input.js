import events from '../../js/event';
import NumberInput from './number-input';

/** @type {Map<string, Set<string>>} */
const decimalCharactersByLanguage = new Map();

/**
 * @param {string[]} languages
 */
const getDecimalCharacters = (languages) => {
    const [language] = languages;

    let characters = decimalCharactersByLanguage.get(language);

    if (characters != null) {
        return characters;
    }

    const locales = Intl.getCanonicalLocales(languages);
    const formatter = Intl.NumberFormat(locales);
    const decimal = formatter
        .formatToParts(0.1)
        .find(({ type }) => type === 'decimal').value;

    characters = new Set(['.', decimal]);
    decimalCharactersByLanguage.set(language, characters);

    return characters;
};

/** @type {Map<string, RegExp>} */
const characterPatternsByLanguage = new Map();

/**
 * @param {string[]} languages
 */
const getCharacterPattern = (languages) => {
    const [language] = languages;
    let characterPattern = characterPatternsByLanguage.get(language);

    if (characterPattern != null) {
        return characterPattern;
    }

    const decimalCharacters = getDecimalCharacters(language);

    characterPattern = new RegExp(
        `[-0-9${Array.from(decimalCharacters).join('')}]`
    );
    characterPatternsByLanguage.set(language, characterPattern);

    return characterPattern;
};

/** @type {Map<string, RegExp>} */
const validityPatternsByLanguage = new Map();

/**
 * @param {string[]} languages
 */
const getValidityPattern = (languages) => {
    const [language] = languages;

    let validityPattern = validityPatternsByLanguage.get(language);

    if (validityPattern != null) {
        return validityPattern;
    }

    const decimalCharacters = getDecimalCharacters(language);
    const decimalPattern = `([${Array.from(decimalCharacters).join('')}]\\d+)?`;
    const pattern = `^-?\\d+${decimalPattern}$`;

    validityPattern = new RegExp(pattern);
    validityPatternsByLanguage.set(language, validityPattern);

    return validityPattern;
};

/** @type {Set<DecimalInput>} */
const decimalInputs = new Set();

export default class DecimalInput extends NumberInput {
    static selector = '.question input[type="number"][data-type-xml="decimal"]';

    static get decimalCharacters() {
        return getDecimalCharacters(this.languages);
    }

    static get characterPattern() {
        return getCharacterPattern(this.languages);
    }

    static get pattern() {
        return getValidityPattern(this.languages);
    }

    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        super.globalInit(form, rootElement);

        const languageChanged = () => {
            const patternStr = this.pattern.source;

            Array.from(decimalInputs.values()).forEach((decimalInput) => {
                // Important: this value may become invalid if it isn't accessed
                // before setting `lang`. This repros in Firefox if:
                //
                // 1. Your default language is English
                // 2. Set a decimal value
                // 3. Switch to French
                // 4. Switch back to English
                const { element, question } = decimalInput;
                const { valueAsNumber } = element;

                question.setAttribute('lang', this.language);
                element.setAttribute('pattern', patternStr);
                decimalInput.setFormattedValue(valueAsNumber);
                decimalInput.setValidity();
            });
        };

        rootElement.addEventListener(
            events.ChangeLanguage().type,
            languageChanged
        );
        window.addEventListener('languagechange', languageChanged);
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

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }

    constructor(input, options) {
        super(input, options);

        decimalInputs.add(this);

        this.question.setAttribute('lang', this.constructor.language);
    }
}
