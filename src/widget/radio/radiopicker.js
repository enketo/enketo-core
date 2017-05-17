'use strict';
var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
require( '../../js/plugins' );

var $lastFocused = null;
var pluginName = 'radiopicker';

/**
 * Enhances radio buttons
 *
 * @constructor
 * @param {Element} element Element to apply widget to.
 * @param {(boolean|{touch: boolean})} options options
 * @param {*=} event     event
 */

function Radiopicker( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

Radiopicker.prototype = Object.create( Widget.prototype );

Radiopicker.prototype.constructor = Radiopicker;

/**
 * Initialize
 */
Radiopicker.prototype._init = function() {
    this._setDelegatedHandlers();
};

/**
 * Set delegated event handlers
 */
Radiopicker.prototype._setDelegatedHandlers = function() {
    var $label, $input;
    var $form = $( this.element );
    // Applies a data-checked attribute to the parent label of a checked checkbox and radio button
    $form.on( 'click', 'input[type="radio"]:checked', function() {
        $( this ).parent( 'label' ).siblings().removeAttr( 'data-checked' ).end().attr( 'data-checked', 'true' );
    } );

    // Readonly buttons/checkboxes will not respond to clicks
    $form.on( 'click', 'input[type="checkbox"][readonly],input[type="radio"][readonly]', function( event ) {
        event.stopImmediatePropagation();
        return false;
    } );

    $form.on( 'click', 'input[type="checkbox"]', function() {
        $input = $( this );
        $label = $input.parent( 'label' );
        if ( $input.is( ':checked' ) ) {
            $label.attr( 'data-checked', 'true' );
        } else {
            $label.removeAttr( 'data-checked' );
        }
    } );

    // New radiobutton/checkbox icons don't trigger focus event, which is necessary for 
    // progress update 
    // we need to unfocus the previously focused element
    $form.on( 'click', 'input[type="radio"], input[type="checkbox"]', function() {
        if ( $lastFocused ) {
            $lastFocused.trigger( 'fakeblur' );
        }
        $lastFocused = $( this ).trigger( 'fakefocus' );
    } );

    // Clear last focused element when a non-radio/checkbox element gets focus
    $form.on( 'focusin fakefocus', 'input:not([type="radio"], [type="checkbox"]), textarea, select', function() {
        if ( $lastFocused ) {
            $lastFocused.trigger( 'fakeblur' );
        }
        $lastFocused = null;
    } );

    // Defaults
    $form.find( 'input[type="radio"]:checked, input[type="checkbox"]:checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

    // Add unselect functionality
    $form.on( 'click', '[data-checked]>input[type="radio"]:not(.no-unselect)', function() {
        $( this ).prop( 'checked', false ).trigger( 'change' ).parent().removeAttr( 'data-checked' );
    } );
};



$.fn[ pluginName ] = function( options, event ) {
    //this widget works globally, and only needs to be instantiated once per form
    var $this = $( this ),
        data = $this.data( pluginName );

    options = options || {};

    if ( !data && typeof options === 'object' ) {
        $this.data( pluginName, new Radiopicker( $this[ 0 ], options, event ) );
    } else if ( data && typeof options === 'string' ) {
        data[ options ]( this );
    }

    return this;
};

module.exports = {
    'name': pluginName,
    'selector': 'form'
};
