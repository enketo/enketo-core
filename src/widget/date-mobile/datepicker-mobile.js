import Widget from '../../js/Widget';
import $ from 'jquery';
const pluginName = 'datepickerMobile';
import support from '../../js/support';

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
    const $input = $( this.element );
    const loadedValue = this.element.value;

    // Activate the native mobile month picker
    if ( support.inputTypes.month ) {
        const $fakeInput = $( '<input class="ignore widget datepicker-mobile" type="month"/>' );

        $input
            .addClass( 'hide' );

        $fakeInput
            .val( loadedValue ? loadedValue.substring( 0, loadedValue.lastIndexOf( '-' ) ) : '' )
            .insertAfter( $input )
            .on( 'change', function() {
                const correctedValue = this.value ? `${this.value}-01` : '';
                $input.val( correctedValue ).trigger( 'change' );
            } );
    }
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        const $this = $( this );
        const dp = $this.data( 'datepickerExtended' );
        const data = $this.data( pluginName );

        // If no datepickerExtended widget is present on the same element
        // and it is a mobile device.
        if ( !dp && typeof options === 'object' && !data && support.touch ) {
            $this.data( pluginName, new DatePickerMobile( this, options, event ) );
        }
    } );
};

export default {
    'name': pluginName,
    'selector': '.or-appearance-month-year input[type="date"]'
};
