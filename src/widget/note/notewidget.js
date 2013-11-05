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

define( [ 'js/Widget', 'jquery', 'js/plugins' ], function( Widget, $ ) {
    "use strict";

    var pluginName = 'notewidget';

    /**
     * Enhances notes
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Notewidget( element, options ) {
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Notewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Notewidget.prototype.constructor = Notewidget;

    Notewidget.prototype._init = function() {
        $( this.element ).parent( 'label' ).each( function() {
            console.log( 'converting readonly to trigger', $( this ) );
            var relevant = $( this ).find( 'input' ).attr( 'data-relevant' ),
                branch = ( relevant ) ? ' or-branch pre-init' : '',
                name = 'name="' + $( this ).find( 'input' ).attr( 'name' ) + '"',
                attributes = ( typeof relevant !== 'undefined' ) ? 'data-relevant="' + relevant + '" ' + name : name,
                value = $( this ).find( 'input, select, textarea' ).val(),
                html = $( this ).markdownToHtml().html();
            $( '<fieldset class="trigger alert alert-block' + branch + '" ' + attributes + '></fieldset>' )
                .insertBefore( $( this ) ).append( html ).append( '<div class="note-value">' + value + '</div>' ).find( 'input' ).remove();
            $( this ).remove();
        } );
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Notewidget( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

} );
