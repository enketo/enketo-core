/**
 * Detects features. Replacement for Modernizr.
 */

define( [], function() {
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
        document.documentElement.classList += ' ' + 'touch';
    } else {
        features.touch = false;
    }

    return features;
} );
