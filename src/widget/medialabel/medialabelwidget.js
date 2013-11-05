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

define( [ 'jquery', 'js/Widget' ], function( $, Widget ) {
    "use strict";

    var pluginName = 'medialabelwidget';

    /**
     * Shows media labels in a grid without underlying radiobuttons.
     *
     * @constructor
     * @param {Element}                       element   Element to apply widget to.
     * @param {(boolean|{touch: boolean})}    options   options
     * @param {*=}                            event     event
     */

    function Medialabelwidget( element, options, event ) {
        //call the Super constructor
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Medialabelwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Medialabelwidget.prototype.constructor = Medialabelwidget;

    /**
     * Initialize
     *
     */
    Medialabelwidget.prototype._init = function() {
        $( this.element ).children( 'img,video,audio' ).parent().addClass( 'with-media clearfix' );
    };

    /**
     * override the super's destroy method to do nothing instead
     *
     * @param  {Element} element The element the widget is applied on
     */
    Medialabelwidget.prototype.destroy = function( element ) {};

    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Medialabelwidget( this, options, event ) ) );
            }
            //only call method if widget was instantiated before
            else if ( data && typeof options == 'string' ) {
                //pass the element as a parameter as this is used in fix()
                data[ options ]( this );
            }
        } );
    };

} );
