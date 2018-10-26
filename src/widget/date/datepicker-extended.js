import Widget from '../../js/Widget';
import support from '../../js/support';
import $ from 'jquery';
import types from '../../js/types';
import { isNumber, getPasteData } from '../../js/utils';
import 'bootstrap-datepicker';
import '../../js/dropdown.jquery';

//It is very helpful to make this the same as widget class, except for converting the first character to lowercase.
const pluginName = 'datepickerExtended';

/**
 * Extends eternicode's bootstrap-datepicker without changing the original.
 * https://github.com/eternicode/bootstrap-datepicker
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {*}    options   options
 * @param {*=}                            event     event
 */

function DatepickerExtended( element, options ) {
    this.namespace = pluginName;
    //call the Super constructor
    Widget.call( this, element, options );
    this._init();
}

//copy the prototype functions from the Widget super class
DatepickerExtended.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
DatepickerExtended.prototype.constructor = DatepickerExtended;

/**
 * Initialize datepicker widget
 */
DatepickerExtended.prototype._init = function() {
    const $p = $( this.element ).parent( 'label' );

    this.settings = ( $p.hasClass( 'or-appearance-year' ) ) ? {
        format: 'yyyy',
        startView: 'decade',
        minViewMode: 'years'
    } : ( $p.hasClass( 'or-appearance-month-year' ) ) ? {
        format: 'yyyy-mm',
        startView: 'year',
        minViewMode: 'months'
    } : {
        format: 'yyyy-mm-dd',
        startView: 'month',
        minViewMode: 'days'
    };

    this.$fakeDateI = this._createFakeDateInput( this.settings.format );

    this._setChangeHandler( this.$fakeDateI );
    this._setFocusHandler( this.$fakeDateI );
    this._setResetHandler( this.$fakeDateI );

    this.$fakeDateI.datepicker( {
        format: this.settings.format,
        autoclose: true,
        todayHighlight: true,
        startView: this.settings.startView,
        minViewMode: this.settings.minViewMode,
        forceParse: false
    } );

    this._setDate( this.element.value );
};

DatepickerExtended.prototype._setDate = function( date ) {
    const valueToSet = date && this.settings.format === 'yyyy' ? date.substring( 0, 4 ) : ( this.settings.format === 'yyyy-mm' ? date.substring( 0, 7 ) : date );
    this.$fakeDateI.datepicker( 'setDate', valueToSet );
};

/**
 * Creates fake date input elements
 * @param  {string} format the date format
 * @return {jQuery}        the jQuery-wrapped fake date input element
 */
DatepickerExtended.prototype._createFakeDateInput = function( format ) {
    const $dateI = $( this.element );
    const $fakeDate = $(
        `<div class="widget date"><input class="ignore input-small" type="text" placeholder="${format}" />${this.resetButtonHtml}</div>` );
    const $fakeDateI = $fakeDate.find( 'input' );

    $dateI.hide().after( $fakeDate );

    return $fakeDateI;
};

/**
 * Copy manual changes that were not detected by bootstrap-datepicker (one without pressing Enter) to original date input field
 *
 * @param { jQuery } $fakeDateI Fake date input element
 */
DatepickerExtended.prototype._setChangeHandler = function( $fakeDateI ) {
    const $dateI = $( this.element );
    const settings = this.settings;

    $fakeDateI.on( 'change paste', e => {
        let convertedValue = '';
        let value = e.type === 'paste' ? getPasteData( e ) : $fakeDateI.val();
        let showValue = '';

        if ( value.length > 0 ) {
            // Note: types.date.convert considers numbers to be a number of days since the epoch 
            // as this is what the XPath evaluator may return.
            // For user-entered input, we want to consider a Number value to be incorrect, expect for year input.
            if ( isNumber( value ) && settings.format !== 'yyyy' ) {
                convertedValue = '';
            } else {
                value = settings.format === 'yyyy-mm' ? `${value}-01` : ( settings.format === 'yyyy' ? `${value}-01-01` : value );
                convertedValue = types.date.convert( value );
            }
        }

        // Here we have to do something unusual to prevent native inputs from automatically 
        // changing 2012-12-32 into 2013-01-01
        // convertedValue is '' for invalid 2012-12-32
        if ( convertedValue === '' || $dateI.val() !== convertedValue ) {
            if ( e.type === 'paste' ) {
                e.stopImmediatePropagation();
            }

            $dateI.val( convertedValue ).trigger( 'change' ).blur();
        }

        if ( settings.format === 'yyyy-mm' ) {
            showValue = convertedValue.substring( 0, convertedValue.lastIndexOf( '-' ) );
        } else if ( settings.format === 'yyyy' ) {
            showValue = convertedValue.substring( 0, convertedValue.indexOf( '-' ) );
        } else {
            showValue = convertedValue;
        }
        $fakeDateI.val( showValue ).datepicker( 'update' );

        return false;
    } );
};

/**
 * Reset button handler
 *
 * @param { jQuery } $fakeDateI Fake date input element
 */
DatepickerExtended.prototype._setResetHandler = function( $fakeDateI ) {
    const that = this;
    $fakeDateI.next( '.btn-reset' ).on( 'click', () => {
        if ( $( that.element ).val() ) {
            $fakeDateI.val( '' ).datepicker( 'update' );
        }
    } );
};

/**
 * Handler for focus events.
 * These events on the original input are used to check whether to display the 'required' message
 *
 * @param { jQuery } $fakeDateI Fake date input element
 */
DatepickerExtended.prototype._setFocusHandler = function( $fakeDateI ) {
    const that = this;
    // Handle focus on widget
    $fakeDateI.on( 'focus', () => {
        $( that.element ).trigger( 'fakefocus' );
    } );
    // Handle focus on original input (goTo functionality)
    $( this.element ).on( 'applyfocus', () => {
        $fakeDateI.focus();
    } );
};

DatepickerExtended.prototype.update = function() {
    this._setDate( this.element.value );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        const $this = $( this );
        const data = $this.data( pluginName );
        const badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

        /*
         * Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
         * already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
         * existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
         * This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then
         * attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
         *
         * browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
         * webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
         */

        if ( !data && typeof options === 'object' && ( !support.touch || !support.inputTypes.date || badSamsung.test( navigator.userAgent ) ) ) {
            $this.data( pluginName, new DatepickerExtended( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in fix()
            data[ options ]( this );
        }
    } );
};

export default {
    'name': pluginName,
    'selector': 'input[type="date"]:not([readonly])'
};
