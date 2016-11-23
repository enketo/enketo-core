if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

var pluginName = 'notewidget';

define( function( require, exports, module ) {
    module.exports = {
        'name': pluginName
    };
} );
