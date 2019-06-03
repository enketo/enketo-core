/**
 * Error to be translated
 * 
 * @class
 * @extends Error
 * @param {string} message
 * @param {string} translationKey
 * @param {*} translationOptions
 */
function TranslatedError( message, translationKey, translationOptions ) {
    this.message = message;
    this.translationKey = translationKey;
    this.translationOptions = translationOptions;
}
TranslatedError.prototype = Object.create( Error.prototype );
TranslatedError.prototype.name = 'TranslatedError';

export default TranslatedError;
