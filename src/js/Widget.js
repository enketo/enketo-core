'use strict';

var $ = require( 'jquery' );

/**
 * A Widget class that can be extended to provide some of the basic widget functionality out of the box.
 * pattern: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
 *
 * @constructor
 * @param {Element} element The DOM element the widget is applied on
 * @param {(boolean|{touch: boolean})} options Options passed to the widget during instantiation
 * @param {string} event Not sure, this may not be necessary but the desktopSelectpicker does something with it
 */
var Widget = function( element, options, event ) {
    this.element = element;
    this.options = options || {};
    // Determining the namespace automatically from the name of the constructor will not work 
    // in conjunction with function renaming by uglify2
    this.namespace = this.namespace || 'somewidget';
    this.options.touch = ( typeof this.options.touch !== 'undefined' ) ? this.options.touch : false;
    this.event = event || null;
};

Widget.prototype = {
    /**
     * Destroys a widget in order the reinstiate it. It is used by some widgets as a crude 'update' function.
     * It can be removed once all widgets are able to update elegantly.
     *
     * Known widgets that still use this:
     * - geopicker
     *
     * @param  {Element} element The element the widget is applied on. Note that if element was clone this.element applies to the origin.
     */
    destroy: function( element ) {
        $( element )
            //data is not used elsewhere by enketo
            .removeData( this.namespace )
            //remove all the event handlers that used this.namespace as the namespace
            .off( '.' + this.namespace )
            //show the original element
            .show()
            //remove elements immediately after the target that have the widget class
            .next( '.widget' ).remove();
    },
    /**
     * Do whatever necessary to ensure that the widget does not allow user input if its parent branch is disabled.
     * Most of the times this branch can remain empty.
     * Check with $('.or-branch').show() whether input is disabled in a disabled branch.
     */
    disable: function( element ) {
        $( element )
            .next( '.widget' ).addClass( 'readonly' );
    },
    /**
     * Does whatever necessary to enable the widget if its parent branch is enabled.
     * Most of the times this function can remain empty.
     */
    enable: function( element ) {
        if ( !element.readOnly ) {
            $( element )
                .next( '.widget' ).removeClass( 'readonly' );
        }
    },
    /**
     * Updates languages, <option>s (cascading selects, and (calculated) values.
     * Most of the times, this function needs to be overridden in the widget.
     */
    update: function() {}

};

module.exports = Widget;
