'use strict';

var Widget = require( '../../js/Widget' );
var support = require( '../../js/support' );
var $ = require( 'jquery' );
var pluginName = 'datetimepickerExtended';
require( '../../js/extend' );
require( 'bootstrap-datepicker' );
require( '../time/timepicker' );
require( '../../js/dropdown.jquery' );

/**
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */

function DatetimepickerExtended( element, options ) {
    this.namespace = pluginName;
    //call the Super constructor
    Widget.call( this, element, options );
    this._init();
}

//copy the prototype functions from the Widget super class
DatetimepickerExtended.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
DatetimepickerExtended.prototype.constructor = DatetimepickerExtended;

/**
 * Initialize timepicker widget
 */
DatetimepickerExtended.prototype._init = function() {
    var that = this;
    var $dateTimeI = $( this.element );
    /*
      Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
      the timezone information (especially for instances-to-edit) if the values are not edited (the
      original entry may have been done in a different time zone than the edit). However, 
      values shown in the widget should reflect the local time representation of that value.
     */
    var val = ( $dateTimeI.val().length > 0 ) ? new Date( $dateTimeI.val() ).toISOLocalString() : '';
    var vals = val.split( 'T' );
    var dateVal = vals[ 0 ];
    var timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '';
    this.$fakeDateI = this._createFakeDateInput( dateVal );
    this.$fakeTimeI = this._createFakeTimeInput( timeVal );

    $dateTimeI.hide().after( '<div class="datetimepicker widget" />' );
    $dateTimeI.siblings( '.datetimepicker' ).append( this.$fakeDateI.closest( '.date' ) ).append( this.$fakeTimeI.closest( '.timepicker' ) );

    this.$fakeDateI.datepicker( {
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true
    } );

    this.$fakeTimeI
        .timepicker( {
            defaultTime: ( timeVal.length > 0 ) ? 'value' : false,
            showMeridian: false
        } )
        //.val( timeVal )
        //the time picker itself has input elements
        .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

    this._setManualHandler( this.$fakeDateI );
    this._setFocusHandler( this.$fakeDateI.add( this.$fakeTimeI ) );

    this.$fakeDateI.on( 'change changeDate', function() {
        changeVal();
        return false;
    } );

    this.$fakeTimeI.on( 'change', function() {
        changeVal();
        return false;
    } );

    //reset button
    this.$fakeTimeI.next( '.btn-reset' ).on( 'click', function() {
        that.$fakeDateI.val( '' ).trigger( 'change' ).datepicker( 'update' );
        that.$fakeTimeI.val( '' ).trigger( 'change' );
    } );

    function changeVal() {
        if ( that.$fakeDateI.val().length > 0 && that.$fakeTimeI.val().length > 3 ) {
            var d = that.$fakeDateI.val().split( '-' );
            var t = that.$fakeTimeI.val().split( ':' );
            $dateTimeI.val( new Date( d[ 0 ], d[ 1 ] - 1, d[ 2 ], t[ 0 ], t[ 1 ] ).toISOLocalString() ).trigger( 'change' );
        } else {
            $dateTimeI.val( '' ).trigger( 'change' );
        }
    }
};

/**
 * Creates fake date input elements
 * @param  {string} format the date format
 * @return {jQuery}        the jQuery-wrapped fake date input element
 */
DatetimepickerExtended.prototype._createFakeDateInput = function( dateVal ) {
    var $fakeDate = $(
        '<div class="date">' +
        '<input class="ignore" type="text" value="' + dateVal + '" placeholder="yyyy-mm-dd"/>' +
        '</div>' );
    var $fakeDateI = $fakeDate.find( 'input' );

    return $fakeDateI;
};

/**
 * Creates fake time input elements
 * @param  {string} format the date format
 * @return {jQuery}        the jQuery-wrapped fake date input element
 */
DatetimepickerExtended.prototype._createFakeTimeInput = function( timeVal ) {
    var $fakeTime = $(
        '<div class="timepicker">' +
        '<input class="ignore timepicker-default" type="text" value="' +
        timeVal + '" placeholder="hh:mm"/>' +
        '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button>' +
        '</div>' );
    var $fakeTimeI = $fakeTime.find( 'input' );

    return $fakeTimeI;
};

/**
 * copy manual changes to original date input field
 *
 * @param { jQuery } $fakeDateI Fake date input element
 */
DatetimepickerExtended.prototype._setManualHandler = function() {};


DatetimepickerExtended.prototype.update = function() {
    var $dateTimeI = $( this.element );
    var val = ( $dateTimeI.val().length > 0 ) ? new Date( $dateTimeI.val() ).toISOLocalString() : '';
    var vals = val.split( 'T' );
    var dateVal = vals[ 0 ];
    var timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '';

    this.$fakeDateI.val( dateVal );
    this.$fakeTimeI.val( timeVal );

};

/**
 * Handler for focus events.
 * These events on the original input are used to check whether to display the 'required' message
 *
 * @param { jQuery } $fakeDateI Fake date input element
 */
DatetimepickerExtended.prototype._setFocusHandler = function( $els ) {
    var that = this;
    // Handle focus on widget.
    $els.on( 'focus', function() {
        $( that.element ).trigger( 'fakefocus' );
    } );
    // Handle focus on original input (goTo functionality)
    $( this.element ).on( 'applyfocus', function() {
        $els.eq( 0 ).focus();
    } );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this ),
            data = $this.data( pluginName ),
            badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

        /*
            Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
            already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
            existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
            This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then 
            attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
          
            browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
            webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30" 
            */
        if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.datetime || badSamsung.test( navigator.userAgent ) ) ) {
            $this.data( pluginName, new DatetimepickerExtended( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in fix()
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': 'input[type="datetime"]:not([readonly])'
};
