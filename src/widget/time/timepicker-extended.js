'use strict';

var Widget = require( '../../js/Widget' );
var support = require( '../../js/support' );
var $ = require( 'jquery' );
var timeFormat = require( '../../js/format' ).time;
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
    var $fakeTime = $( '<div class="widget timepicker">' +
        '<input class="ignore timepicker-default" type="text" placeholder="hh:mm" />' +
        this.resetButtonHtml + '</div>' );
    var $resetBtn = $fakeTime.find( '.btn-reset' );
    var $fakeTimeI = $fakeTime.find( 'input' );

    $timeI.hide().after( $fakeTime );

    $fakeTimeI
        .timepicker( {
            showMeridian: timeFormat.hour12,
            meridianNotation: {
                am: timeFormat.amNotation,
                pm: timeFormat.pmNotation
            }
        } )
        // using setTime ensures that the fakeInput shows the meridan when needed
        .timepicker( 'setTime', this.element.value );

    $fakeTimeI.on( 'change', function() {
        var modified = timeFormat.hour12 ? types.time.convertMeridian( this.value ) : this.value;
        $timeI.val( modified ).trigger( 'change' );
        return false;
    } );

    // reset button
    $resetBtn.on( 'click', function() {
        var event = $timeI.val() ? 'change' : '';
        if ( event || $fakeTimeI.val() ) {
            $fakeTimeI.val( '' ).trigger( event );
        }
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

TimepickerExtended.prototype.update = function() {
    $( this.element )
        .next( '.widget' )
        .find( 'input' )
        .timepicker( 'setTime', this.element.value );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this ),
            data = $this.data( pluginName );

        if ( !data && typeof options === 'object' && ( !support.touch || !support.inputTypes.time ) ) {
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
