// Extend native objects... Bad.

// This import is just there so Alex and other XPath-evaluator-replacers get an automatic notification to extend the date object.
// It is not required for those that use enketo-xpathjs
import 'enketo-xpathjs/src/date-extensions';

if ( typeof console.deprecate === 'undefined' ) {
    console.deprecate = ( bad, good ) => {
        console.warn( `${bad} is deprecated. Use ${good} instead.` );
    };
}
