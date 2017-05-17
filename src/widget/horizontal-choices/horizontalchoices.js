'use strict';
/**
 * Horizontal Choices Widget
 *
 */


var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );

var pluginName = 'horizontalChoices';

/**
 * Horizontal Choices Widgets. Adds a filler if the last row contains two elements.
 * The filler avoids the last radiobutton or checkbox to not be lined up correctly below the second column.
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */

function HorizontalChoices( element, options ) {
    // set the namespace (important!)
    this.namespace = pluginName;
    // call the Super constructor
    Widget.call( this, element, options );
    this._init();
}

HorizontalChoices.prototype = Object.create( Widget.prototype );

HorizontalChoices.prototype.constructor = HorizontalChoices;

HorizontalChoices.prototype._init = function() {
    $( this.element ).find( '.option-wrapper' ).each( function() {
        var $wrapper = $( this ),
            $options = $wrapper.find( 'label' );

        if ( ( $options.length % 3 ) === 2 ) {
            $wrapper.append( '<label class="filler"></label>' );
        }
    } );
};


$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this ),
            data = $this.data( pluginName );

        //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new HorizontalChoices( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in destroy() for cloned elements and widgets
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-horizontal'
};
