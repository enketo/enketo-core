/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modilabs
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

    var pluginName = 'triggerwidget';

    /**
     * Creates a trigger widget
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Triggerwidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Triggerwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Triggerwidget.prototype.constructor = Triggerwidget;

    Triggerwidget.prototype._init = function() {
        var $el = $( this.element );
        $el.find( '.question-label' ).markdownToHtml();
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Triggerwidget( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

} );
