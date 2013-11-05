/**
 * @preserve Copyright 2013 Martijn van de Rijdt & Modi Labs
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

define( [ 'jquery', 'js/Widget' ], function( $, Widget ) {
    "use strict";

    var pluginName = 'mobileSelectpicker';

    /**
     * An enhancement for the native multi-selectpicker found on most mobile devices,
     * that shows the selected values next to the select box
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} e     event
     */

    function MobileSelectpicker( element, options, e ) {
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    MobileSelectpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    MobileSelectpicker.prototype.constructor = MobileSelectpicker;

    /**
     * initialize
     */
    MobileSelectpicker.prototype._init = function() {
        var that = this;

        //show values on change
        $( this.element ).on( 'change.' + pluginName, function() {
            that._showSelectedValues();
            return true;
        } );

        //show defaults
        this._showSelectedValues();
    };

    /**
     * display the selected values
     */
    MobileSelectpicker.prototype._showSelectedValues = function() {
        var i, valueText = [],
            $select = $( this.element ),
            values = ( $.isArray( $select.val() ) ) ? $select.val() : [ $select.val() ];

        for ( i = 0; i < values.length; i++ ) {
            valueText.push( $( this ).find( 'option[value="' + values[ i ] + '"]' ).text() );
        }

        $select.after( '<span class="widget mobileselect">' + values.join( ', ' ) + '</span>' );
    };

    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object AND if options.touch is truthy
            if ( !data && typeof options === 'object' && options.touch ) {
                $this.data( pluginName, ( data = new MobileSelectpicker( this, options, event ) ) );
            }
            if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };
} );
