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

define( [ 'enketo-js/Widget', 'jquery', 'bootstrap-slider' ], function( Widget, $ ) {
    "use strict";

    var $lastFocused = null,
        pluginName = 'distresspicker';

    /**
     * Enhances radio buttons
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} event     event
     */

    function Distresspicker( element, options, event ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Distresspicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Distresspicker.prototype.constructor = Distresspicker;

    /**
     * Initialize
     */
    Distresspicker.prototype._init = function() {
        $( this.element ).slider( {
            reversed: true,
            min: 0,
            max: 10,
            orientation: 'vertical',
            tooltip: 'hide',
            value: 0
        } );
        this.$widget = $( this.element ).closest( '.slider' ).addClass( 'widget' );
        this._addBulb();
        this._addScale();
        this._setChangeHandler();
    };

    Distresspicker.prototype._addBulb = function() {
        this.$widget.append(
            '<div class="bulb"><div class="inner"></div></div>'
        );
    };

    Distresspicker.prototype._addScale = function() {
        var $scale = $( '<div class="scale"></div>' );
        for ( var i = 10; i > 0; i-- ) {
            $scale.append( '<div class="number"><div class="value">' + i + '</div></div>' );
        }
        this.$widget.prepend( $scale );
    };

    /**
     * Set delegated event handlers
     */
    Distresspicker.prototype._setChangeHandler = function() {
        $( this.element ).on( 'slideStop.' + this.namespace, function( slideEvt ) {
            $( this ).trigger( 'change' );
        } );
    };


    $.fn[ pluginName ] = function( options, event ) {
        //this widget works globally, and only needs to be instantiated once per form
        var $this = $( this ),
            data = $this.data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, ( data = new Distresspicker( $this[ 0 ], options, event ) ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }

        return this;
    };

} );
