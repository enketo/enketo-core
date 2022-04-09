/**
 * Detects features.
 *
 * @module support
 */

import { os } from './sniffer';

const inputTypes = {};
let mobile = false;

// test input types
['date', 'datetime-local', 'time', 'month'].forEach((inputType) => {
    const input = document.createElement('input');
    input.setAttribute('type', inputType);
    inputTypes[inputType] = input.type !== 'text';
});

// The word 'touch' has become misleading. It should be considered 'small mobile' including tablets.
if (os.ios || os.android) {
    mobile = true;
    document.documentElement.classList.add('touch');
}

export default {
    /**
     * @type {Array<string>}
     * */
    get inputTypes() {
        return inputTypes;
    },
    /**
     * @type {boolean}
     * */
    get touch() {
        return mobile;
    },
    set touch(val) {
        mobile = val;
    },
};
