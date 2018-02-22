'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'datepickerMobile';
var support = require( '../../js/support' );

/**
 * For now, the whole purpose of this widget is to show a native month picker on 
 * MOBILE devices with browsers that support it.
 * 
 * @constructor
 * @param {Element} element   element to apply widget to
 * @param {*}       options   options
 * @param {*=}      event     event
 */

function DatePickerMobile( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

DatePickerMobile.prototype = Object.create( Widget.prototype );
DatePickerMobile.prototype.constructor = DatePickerMobile;

/**
 * Initialize datepicker widget
 */
DatePickerMobile.prototype._init = function() {
    var $input = $( this.element );
    var loadedValue = this.element.value;

    // Activate the native mobile month picker
    if ( support.inputTypes.month ) {
        var $fakeInput = $( '<input class="ignore widget datepicker-mobile" type="month"/>' );

        $input
            .addClass( 'hide' );

        $fakeInput
            .val( loadedValue ? loadedValue.substring( 0, loadedValue.lastIndexOf( '-' ) ) : '' )
            .insertAfter( $input )
            .on( 'change', function() {
                var correctedValue = this.value ? this.value + '-01' : '';
                $input.val( correctedValue ).trigger( 'change' );
            } );
    }
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var dp = $this.data( 'datepickerExtended' );
        var data = $this.data( pluginName );

        // If no datepickerExtended widget is present on the same element
        // and it is a mobile device.
        if ( !dp && typeof options === 'object' && !data && support.touch ) {
            $this.data( pluginName, new DatePickerMobile( this, options, event ) );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-month-year input[type="date"]'
};
