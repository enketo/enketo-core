'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'datepickerMobile';

/**
 * The whole purpose of this widget is to hide the placeholder text on native date inputs.
 * The placeholder is considered unhelpful for month-year and year appearances. 
 * For consistency it's also removed from regular date inputs.
 * 
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {*}    options   options
 * @param {*=}                            event     event
 */

function DatepickerMobile( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

DatepickerMobile.prototype = Object.create( Widget.prototype );
DatepickerMobile.prototype.constructor = DatepickerMobile;

/**
 * Initialize datepicker widget
 */
DatepickerMobile.prototype._init = function() {
    var $input = $( this.element );
    var that = this;

    if ( !$input.val() ) {
        this.mask( this.element );
    }

    $input
        .on( 'focus', function() {
            that.unmask( this );
            return true;
        } )
        .on( 'blur', function() {
            if ( !this.value ) {
                that.mask( this );
            }
            return true;
        } );
};

DatepickerMobile.prototype.mask = function( el ) {
    el.type = 'text';
    el.classList.add( 'mask-date' );
};

DatepickerMobile.prototype.unmask = function( el ) {
    el.type = 'date';
    el.classList.remove( 'mask-date' );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var dp = $this.data( 'datepickerExtended' );
        var data = $this.data( pluginName );

        // If no datepickerExtended widget is present on the same element
        if ( !dp && !data ) {
            $this.data( pluginName, new DatepickerMobile( this, options, event ) );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': 'input[type=\"date\"]'
};
