import NumberInput from './number-input';

export default class IntegerInput extends NumberInput {
    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        this.languageChanged = this.languageChanged.bind(this);
        super.globalInit(form, rootElement);
    }

    static selector = '.question input[type="number"][data-type-xml="int"]';

    static characterPattern = /[-0-9]/;

    static pattern = /^-?[0-9]+$/;

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
