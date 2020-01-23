/**
 * A custom error type for form logic
 *
 * @class
 * @augments Error
 * @param {string} message - Optional message.
 */
function FormLogicError( message ) {
    this.message = message || 'unknown';
    this.name = 'FormLogicError';
    this.stack = ( new Error() ).stack;
}

FormLogicError.prototype = Object.create( Error.prototype );
FormLogicError.prototype.constructor = FormLogicError;

export default FormLogicError;
