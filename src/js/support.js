if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
/**
 * Detects features. Replacement for Modernizr.
 */

define( function( require, exports, module ) {
    'use strict';
    var features = {
            inputtypes: {}
        },
        inputTypesToTest = [ 'date', 'datetime', 'time' ];

    // test input types
    inputTypesToTest.forEach( function( inputType ) {
        var input = document.createElement( 'input' );
        input.setAttribute( 'type', inputType );
        features.inputtypes[ inputType ] = input.type !== 'text';
    } );

    // test touchscreen presence
    if ( ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch ) {
        features.touch = true;
        document.documentElement.classList.add( 'touch' );
    } else {
        features.touch = false;
    }

    module.exports = features;
} );
