/**
 * Detects features.
 */

import { os } from './sniffer';

const inputTypes = {};
let mobile = false;

// test input types
[ 'date', 'datetime', 'time', 'month' ].forEach( inputType => {
    const input = document.createElement( 'input' );
    input.setAttribute( 'type', inputType );
    inputTypes[ inputType ] = input.type !== 'text';
} );

// The word 'touch' has become misleading. It should be considered 'small mobile' including tablets.
if ( os.ios || os.android ) {
    mobile = true;
    document.documentElement.classList.add( 'touch' );
}

export default {
    get inputTypes() {
        return inputTypes;
    },
    get touch() {
        return mobile;
    },
    set touch( val ) {
        mobile = val;
    }
};
