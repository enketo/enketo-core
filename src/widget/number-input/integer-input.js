import NumberInput from './number-input';

export default class IntegerInput extends NumberInput {
    static get numberType() {
        return 'int';
    }

    get value() {
        return super.value;
    }

    set value(value) {
        super.value = value;
    }
}
