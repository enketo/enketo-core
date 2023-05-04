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

export default class DecimalInput extends NumberInput {
    static languageChanged() {
        return super.languageChanged.call(this);
    }

    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        this.languageChanged = this.languageChanged.bind(this);
        super.globalInit(form, rootElement);
    }

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

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
