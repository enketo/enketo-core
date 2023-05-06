import NumberInput from './number-input';

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
    const number = -9012345678;

    validCharacters = new Set(`${number}${formatter.format(number)}`.split(''));
    validCharactersByLanguage.set(language, validCharacters);

    return validCharacters;
};

export default class IntegerInput extends NumberInput {
    /**
     * @param {import('../../js/form').Form} form
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
        validCharactersByLanguage = new Map();
        super.globalReset(form, rootElement);
    }

    static selector = '.question input[type="number"][data-type-xml="int"]';

    static get validCharacters() {
        return getValidCharacters(this.languages);
    }

    static pattern = /^-?[0-9]+$/;

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
