'use strict';

var Widget = require( '../../js/Widget' );
var support = require( '../../js/support' );
var $ = require( 'jquery' );
var types = require( '../../js/types' );
require( './timepicker' );
require( '../../js/dropdown.jquery' );

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
        '<input class="ignore timepicker-default" type="text" value="' + timeVal + '" placeholder="hh:mm" />' +
        '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button></div>' );
    var $resetBtn = $fakeTime.find( '.btn-reset' );
    var $fakeTimeI = $fakeTime.find( 'input' );

    $timeI.hide().after( $fakeTime );

    $fakeTimeI.timepicker( {
            defaultTime: ( timeVal.length > 0 ) ? timeVal : false,
            showMeridian: false
        } ).val( timeVal )
        //the time picker itself has input elements
        .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

    $fakeTimeI.on( 'change', function() {
        $timeI.val( this.value ).trigger( 'change' );
        return false;
    } );

    // reset button
    $resetBtn.on( 'click', function() {
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
