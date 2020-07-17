// Extend native objects, aka monkey patching ..... really I see no harm!

// This import is just there so Alex and other XPath-evaluator-replacers get an automatic notification to extend the date object.
// It is not required for those that use enketo-xpathjs
import 'enketo-xpathjs/src/date-extensions';

/**
 * The built in string object.
 *
 * @external String
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String|String}
 */

/**
 * Pads a string with prefixed zeros until the requested string length is achieved.
 *
 * @function external:String#pad
 * @param  {number} digits - The desired string length.
 * @return {string} - Padded string.
 */
String.prototype.pad = function( digits ) {
    let x = this;
    while ( x.length < digits ) {
        x = `0${x}`;
    }

    return x;
};


if ( typeof console.deprecate === 'undefined' ) {
    console.deprecate = ( bad, good ) => {
        console.warn( `${bad} is deprecated. Use ${good} instead.` );
    };
}
