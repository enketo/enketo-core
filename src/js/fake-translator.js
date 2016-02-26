if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
define( function( require, exports, module ) {
    'use strict';

    /**
     * Returns null. Meant to be replaced by a real translator in the app that consumes enketo-core
     *
     * @param  {String} key translation key
     * @param  {*} key translation options
     * @return {String} translation output
     */
    function t( key, options ) {
        return null;
    }

    module.exports = {
        t: t
    };
} );
