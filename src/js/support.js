'use strict';

/**
 * Detects features.
 */

var os = require( './sniffer' ).os;
var inputTypes = {};
var mobile = false;

// test input types
[ 'date', 'datetime', 'time', 'month' ].forEach( function( inputType ) {
    var input = document.createElement( 'input' );
    input.setAttribute( 'type', inputType );
    inputTypes[ inputType ] = input.type !== 'text';
} );

// The word 'touch' has become misleading. It should be considered 'small mobile' including tablets.
if ( os.ios || os.android ) {
    mobile = true;
    document.documentElement.classList.add( 'touch' );
}

module.exports = {
    /**
     * @deprecated
     */
    get inputtypes() {
        console.deprecate( 'support.inputtypes', 'support.inputTypes' );
        return inputTypes;
    },
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
