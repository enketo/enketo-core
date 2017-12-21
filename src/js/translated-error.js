'use strict';

var t = require( 'translator' ).t;

// Error to be translated
function TranslatedError( message, translationKey ) {
    this.message = '';
    this.translationKey = translationKey;
    this.translationOptions = Array.prototype.slice.call( arguments, 2 );
}
TranslatedError.prototype = Object.create( Error.prototype );
TranslatedError.prototype.name = 'TranslatedError';

TranslatedError.prototype.toTranslatedString = function() {
    t.apply( this, this.translationKey, this.translationOptions );
};

module.exports = TranslatedError;
