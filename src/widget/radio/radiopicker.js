'use strict';
var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
require( '../../js/plugins' );
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
    var $form = $( this.element );

    $form
        // Applies a data-checked attribute to the parent label of a checked checkbox and radio button.
        .on( 'click', 'input[type="radio"]:not([readonly]):checked', function() {
            $( this ).parent( 'label' ).siblings().removeAttr( 'data-checked' ).end().attr( 'data-checked', 'true' );
        } )
        // Same for checkbox.
        .on( 'click', 'input[type="checkbox"]:not([readonly])', function() {
            if ( this.checked ) {
                this.parentNode.dataset.checked = 'true';
            } else {
                delete this.parentNode.dataset.checked;
            }
        } )
        // Detect programmatic clearing to remove data-checked attribute.
        .on( 'change', '[data-checked] > input:not(:checked)', function() {
            delete this.parentNode.dataset.checked;
        } )
        // Readonly buttons/checkboxes will not respond to clicks.
        .on( 'click', 'input[type="checkbox"][readonly],input[type="radio"][readonly]', function( event ) {
            event.stopImmediatePropagation();
            return false;
        } )
        /*
         * In Safari a click on a readonly checkbox/radio button sets `checked` to true, **before** the click event fires.
         * This causes the model to update. The above clickhandler will set the checked back to false, but there is
         * no way to propagate that reversion back to the model.
         * 
         * Disabling change handling on readonly checkboxes/radiobuttons is not an option, because of the scenario
         * described in Form.js in the comment above the change handler.
         * 
         * The solution is to detect here whether the change event was triggered by a human, by checking if the 
         * originalEvent property is defined.
         * 
         * See more at https://github.com/enketo/enketo-core/issues/516
         */
        .on( 'change', 'input[type="checkbox"][readonly],input[type="radio"][readonly]', function( event ) {
            var byProgram = typeof event.originalEvent === 'undefined';
            if ( !byProgram ) {
                event.stopImmediatePropagation();
                /*               
                 * For radiobuttons, this is ugly and relies on the data-checked attribute.
                 * Without this, is it still possible to check a readonly radio button (although it won't propagate to the model).
                 * I think this is the only remnant of the usage of data-checked in Enketo. However, it is
                 * also still relied upon by Esri/Survey123.
                 */
                if ( this.checked && this.parentNode.dataset.checked !== 'true' ) {
                    this.checked = false;
                }
            }
            return byProgram;
        } )
        // Add unselect radio button functionality.
        .on( 'click', '[data-checked]>input[type="radio"]:not(.no-unselect)', function() {
            $( this ).prop( 'checked', false ).trigger( 'change' ).parent().removeAttr( 'data-checked' );
        } );

    // Defaults
    $form.find( 'input[type="radio"]:checked, input[type="checkbox"]:checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

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
