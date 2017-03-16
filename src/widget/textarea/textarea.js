if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Widget = require( '../../js/Widget' );
    var $ = require( 'jquery' );
    var pluginName = 'textareaWidget';

    /**
     * Auto-resizes textarea elements.
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} event     event
     */

    function TextareaWidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    // Copy the prototype functions from the Widget super class
    TextareaWidget.prototype = Object.create( Widget.prototype );

    // Ensure the constructor is the new one
    TextareaWidget.prototype.constructor = TextareaWidget;

    /**
     * Initialize
     */
    TextareaWidget.prototype._init = function() {
        this._setDelegatedHandlers();
    };

    /**
     * Set delegated event handlers
     */
    TextareaWidget.prototype._setDelegatedHandlers = function() {
        var $form = $( this.element );
        var textarea = $form[ 0 ].querySelector( 'textarea' );
        var defaultHeight = textarea ? textarea.clientHeight : 20;
        $form.on( 'input', 'textarea', function( event ) {
            if ( this.scrollHeight > this.clientHeight && this.scrollHeight > defaultHeight ) {
                // setting min-height instead of height, as height doesn't work in Grid Theme.
                this.style[ 'min-height' ] = this.scrollHeight + 'px';
            }
        } );

    };

    /**
     * Override default destroy method to do nothing
     *
     * @param  {Element} element The element (not) to destroy the widget on ;)
     */
    TextareaWidget.prototype.destroy = function( element ) {
        //all handlers are global and deep copies of repeats should keep functionality intact
    };


    $.fn[ pluginName ] = function( options, event ) {
        //this widget works globally, and only needs to be instantiated once per form
        var $this = $( this );
        var data = $this.data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new TextareaWidget( $this[ 0 ], options, event ) );
        } else if ( data && typeof options === 'string' ) {
            data[ options ]( this );
        }

        return this;
    };

    module.exports = {
        'name': pluginName,
        'selector': 'form'
    };
} );
