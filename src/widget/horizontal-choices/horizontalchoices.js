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
        var COLUMNS = 3;
        var $wrapper = $( this );
        var fillers = COLUMNS - $wrapper.find( 'label' ).length % COLUMNS;

        while ( fillers < COLUMNS && fillers > 0 ) {
            $wrapper.append( '<label class="filler"></label>' );
            fillers--;
        }
        // if added to correct question type, add initialized class
        $( this ).closest( '.question' ).addClass( 'initialized' );
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
