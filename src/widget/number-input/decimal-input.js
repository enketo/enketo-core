import NumberInput from './number-input';

/** @type {Map<string, Set<string>>} */
let decimalCharactersByLanguage = new Map();

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

/** @type {Map<string, Set<string>>} */
let validCharactersByLanguage = new Map();

/**
 * @param {string[]} languages
 */
const getValidCharacters = (languages) => {
    const [language] = languages;
    let validCharacters = validCharactersByLanguage.get(language);

    if (validCharacters != null) {
        return validCharacters;
    }

    const locales = Intl.getCanonicalLocales(languages);
    const formatter = Intl.NumberFormat(locales);
    const number = -9.012345678;

    validCharacters = new Set(`${number}${formatter.format(number)}`.split(''));
    validCharactersByLanguage.set(language, validCharacters);

    return validCharacters;
};

/** @type {Map<string, RegExp>} */
let validityPatternsByLanguage = new Map();

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

export default class DecimalInput extends NumberInput {
    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        this.languageChanged = this.languageChanged.bind(this);
        super.globalInit(form, rootElement);
    }

    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalReset(form, rootElement) {
        decimalCharactersByLanguage = new Map();
        validCharactersByLanguage = new Map();
        validityPatternsByLanguage = new Map();
        super.globalReset(form, rootElement);
    }

    static selector = '.question input[type="number"][data-type-xml="decimal"]';

    static get decimalCharacters() {
        return getDecimalCharacters(this.languages);
    }

    static get validCharacters() {
        return getValidCharacters(this.languages);
    }

    static get pattern() {
        return getValidityPattern(this.languages);
    }

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
