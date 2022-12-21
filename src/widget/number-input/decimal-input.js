import NumberInput from './number-input';

export default class DecimalInput extends NumberInput {
    static get numberType() {
        return 'decimal';
    }

    get decimalCharacters() {
        const locales = Intl.getCanonicalLocales(this.languages);
        const formatter = Intl.NumberFormat(locales);
        const decimal = formatter
            .formatToParts(0.1)
            .find(({ type }) => type === 'decimal').value;

        return new Set([...super.decimalCharacters, '.', decimal]);
    }

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
