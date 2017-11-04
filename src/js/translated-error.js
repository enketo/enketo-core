'use strict';

// Error to be translated
function TranslatedError( message, translationKey, translationOptions ) {
    this.message = message;
    this.translationKey = translationKey;
    this.translationOptions = translationOptions;
}
TranslatedError.prototype = Object.create( Error.prototype );
TranslatedError.prototype.name = 'TranslatedError';

module.exports = TranslatedError;
