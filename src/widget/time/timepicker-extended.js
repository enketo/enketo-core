'use strict';

var Widget = require( '../../js/Widget' );
var support = require( '../../js/support' );
var $ = require( 'jquery' );
var types = require( '../../js/types' );
require( './timepicker' );

var pluginName = 'timepickerExtended';

/**
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */
function TimepickerExtended( element, options ) {
    this.namespace = pluginName;
    //call the Super constructor
    Widget.call( this, element, options );
    this._init();
}

TimepickerExtended.prototype = Object.create( Widget.prototype );

TimepickerExtended.prototype.constructor = TimepickerExtended;

/**
 * Initialize timepicker widget
 */
TimepickerExtended.prototype._init = function() {
    var $timeI = $( this.element );
    var timeVal = $( this.element ).val();
    var $fakeTime = $( '<div class="widget timepicker">' +
        '<input class="ignore timepicker-default input-small" type="text" value="' + timeVal + '" placeholder="hh:mm" />' +
        '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button></div>' );
    var $resetBtn = $fakeTime.find( '.btn-reset' );
    var $fakeTimeI = $fakeTime.find( 'input' );

    $timeI.hide().after( $fakeTime );

    $fakeTimeI.timepicker( {
            defaultTime: ( timeVal.length > 0 ) ? timeVal : 'current',
            showMeridian: false
        } ).val( timeVal )
        //the time picker itself has input elements
        .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

    $fakeTimeI.on( 'change', function() {
        var val = this.value;
        // the following line can be removed if https://github.com/jdewit/bootstrap-timepicker/issues/202 gets approved
        val = /^[0-9]:/.test( val ) ? '0' + val : val;
        // add 00 minutes if they are missing (probably a bug in bootstrap timepicker)
        val = /^[0-9]{2}:$/.test( val ) ? val + '00' : val;
        $timeI.val( val ).trigger( 'change' ).blur();
        return false;
    } );

    // reset button
    $fakeTimeReset.on( 'click', function() {
        $fakeTimeI.val( '' ).trigger( 'change' );
    } );

    // pass widget focus event
    $fakeTimeI.on( 'focus', function() {
        $timeI.trigger( 'fakefocus' );
    } );

    // handle original input focus
    $( this.element ).on( 'applyfocus', function() {
        $fakeTimeI.focus();
    } );

};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this ),
            data = $this.data( pluginName );

        if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.time ) ) {
            $this.data( pluginName, new TimepickerExtended( this, options, event ) );
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
    'selector': 'input[type="time"]:not([readonly])'
};
