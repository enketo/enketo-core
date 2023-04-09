import NumberInput from './number-input';

export default class IntegerInput extends NumberInput {
    static selector = '.question input[type="number"][data-type-xml="int"]';

    static characterPattern = /[-0-9]/;

    static pattern = /^-?[0-9]+$/;

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }

    constructor(input, options) {
        super(input, options);

        input.setAttribute('pattern', this.constructor.pattern.source);
    }
}
