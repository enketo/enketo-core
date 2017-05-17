'use strict';
var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );

var pluginName = 'compactpicker';

/**
 * Compact Picker. Hides text labels if a media label is present.
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */

function CompactPicker( element, options ) {
    // set the namespace (important!)
    this.namespace = pluginName;
    // call the Super constructor
    Widget.call( this, element, options );
    this._init();
}

// copy the prototype functions from the Widget super class
CompactPicker.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
CompactPicker.prototype.constructor = CompactPicker;

//add your widget functions
CompactPicker.prototype._init = function() {
    $( this.element ).find( '.option-label' ).each( function() {
        var $optionLabel = $( this );
        if ( $optionLabel.siblings( 'img, video, audio' ).length > 0 ) {
            $optionLabel.css( 'display', 'none' );
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
            $this.data( pluginName, new CompactPicker( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in destroy() for cloned elements and widgets
            data[ options ]( this );
        }
    } );
};


module.exports = {
    'name': 'compactpicker',
    'selector': '.or-appearance-compact, .or-appearance-quickcompact, [class*="or-appearance-compact-"]'
};
