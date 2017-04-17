'use strict';

function FormLogicError( message ) {
    this.message = message || 'unknown';
    this.name = 'FormLogicError';
    this.stack = ( new Error() ).stack;
}

FormLogicError.prototype = Object.create( Error.prototype );
FormLogicError.prototype.constructor = FormLogicError;

module.exports = FormLogicError;
