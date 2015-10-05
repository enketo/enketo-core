if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
define( function( require, exports, module ) {
    'use strict';

    function FormLogicError( message ) {
        this.message = message || 'unknown';
        this.name = 'FormLogicError';
        this.stack = ( new Error() ).stack;
    }

    FormLogicError.prototype = Object.create( Error.prototype );
    FormLogicError.prototype.constructor = FormLogicError;

    module.exports = FormLogicError;
} );
