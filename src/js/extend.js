'use strict';
// Extend native objects, aka monkey patching ..... really I see no harm!

// This require is just there so Alex and other XPath-evaluator-replacers get an automatic notification to extend the date object.
// It is not required for those that use enketo-xpathjs
require( 'enketo-xpathjs/src/date-extensions' );

/**
 * Pads a string with prefixed zeros until the requested string length is achieved.
 * @param  {number} digits [description]
 * @return {String|string}        [description]
 */
String.prototype.pad = function( digits ) {
    var x = this;
    while ( x.length < digits ) {
        x = '0' + x;
    }
    return x;
};



if ( typeof console.deprecate === 'undefined' ) {
    console.deprecate = function( bad, good ) {
        console.warn( bad + ' is deprecated. Use ' + good + ' instead.' );
    };
}
