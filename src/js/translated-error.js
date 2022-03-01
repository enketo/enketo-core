/**
 * Error to be translated
 *
 * @class
 * @augments Error
 * @param {string} message - error message
 * @param {string} translationKey - translation key
 * @param {*} translationOptions - translation options
 */
function TranslatedError(message, translationKey, translationOptions) {
    this.message = message;
    this.translationKey = translationKey;
    this.translationOptions = translationOptions;
}
TranslatedError.prototype = Object.create(Error.prototype);
TranslatedError.prototype.name = 'TranslatedError';

export default TranslatedError;
