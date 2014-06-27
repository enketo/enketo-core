/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'enketo-js/Widget', 'jquery', 'enketo-js/plugins' ], function( Widget, $ ) {
    "use strict";

    var $lastFocused = null,
        pluginName = 'radiopicker';

    /**
     * Enhances radio buttons
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} event     event
     */

    function Radiopicker( element, options, event ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Radiopicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
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
        var $label,
            $form = $( this.element );

        //applies a data-checked attribute to the parent label of a checked checkbox and radio button
        $form.on( 'click', 'input[type="radio"]:checked', function( event ) {
            $( this ).parent( 'label' ).siblings().removeAttr( 'data-checked' ).end().attr( 'data-checked', 'true' );
        } );

        $form.on( 'click', 'input[type="checkbox"]', function( event ) {
            $label = $( this ).parent( 'label' );
            if ( $( this ).is( ':checked' ) ) $label.attr( 'data-checked', 'true' );
            else $label.removeAttr( 'data-checked' );
        } );

        // new radiobutton/checkbox icons don't trigger focus event, which is necessary for 
        // progress update and subtle "required" message
        // we need to unfocus the previously focused elemnt
        $form.on( 'click', 'input[type="radio"], input[type="checkbox"]', function( event ) {
            if ( $lastFocused ) {
                $lastFocused.trigger( 'fakeblur' );
            }
            $lastFocused = $( this ).trigger( 'fakefocus' );
        } );
        // clear last focused element when a non-radio/checkbox element gets focus
        $form.on( 'focusin fakefocus', 'input:not([type="radio"], [type="checkbox"]), textarea, select', function( event ) {
            if ( $lastFocused ) {
                $lastFocused.trigger( 'fakeblur' );
            }
            $lastFocused = null;
        } );

        //defaults
        $form.find( 'input[type="radio"]:checked, input[type="checkbox"]:checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

        //add unselect functionality
        $form.on( 'click', '[data-checked]>input[type="radio"]:not(.no-unselect)', function( event ) {
            $( this ).prop( 'checked', false ).trigger( 'change' ).parent().removeAttr( 'data-checked' );
        } );
    };

    /**
     * Override default destroy method to do nothing
     *
     * @param  {Element} element The element (not) to destroy the widget on ;)
     */
    Radiopicker.prototype.destroy = function( element ) {
        //all handlers are global and deep copies of repeats should keep functionality intact
        console.debug( pluginName, 'destroy called' );
    };


    $.fn[ pluginName ] = function( options, event ) {
        //this widget works globally, and only needs to be instantiated once per form
        var $this = $( this ),
            data = $this.data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, ( data = new Radiopicker( $this[ 0 ], options, event ) ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }

        return this;
    };

} );
