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

    var pluginName = 'tablewidget';

    /**
     * Takes care of fixing awkward header XML produced with PYXForm appearance="table-list"
     * This js file can hopefully be removed in the future.
     *
     * See https://github.com/SEL-Columbia/pyxform/issues/72
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} event     event
     */

    function Tablewidget( element, options, event ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this.init();
    }

    //copy the prototype functions from the Widget super class
    Tablewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Tablewidget.prototype.constructor = Tablewidget;

    Tablewidget.prototype.init = function() {
        this.fixXlsFormShortcutMarkup();
    };

    Tablewidget.prototype.fixXlsFormShortcutMarkup = function() {
        var $labels, $hints, $note, $h4,
            that = this;
        $( this.element ).parent().parent()
            .find( '.or-appearance-field-list .or-appearance-label' )
            .prev( '.note' ).each( function() {
                $note = $( this );
                $labels = $note.find( '.question-label' );
                $hints = $note.find( '.or-hint' );
                // add a proper h4 element and append the labels and hints
                $( '<h4></h4>' ).insertAfter( $note ).append( $labels ).append( $hints );

                // remove the original note
                $note.remove();
            } );
    };

    /**
     * Override default destroy method to do nothing
     *
     * @param  {Element} element The element (not) to destroy the widget on ;)
     */
    Tablewidget.prototype.destroy = function( element ) {
        //nothing to do
        console.debug( pluginName, 'destroy called' );
    };

    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Tablewidget( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

} );
