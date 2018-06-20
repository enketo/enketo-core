'use strict';

var pluginName = 'rangewidget';
var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );
var utils = require( '../../js/utils' );

/*
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {{}|{helpers: *}}                             options   options
 */
function RangeWidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

RangeWidget.prototype = Object.create( Widget.prototype );
RangeWidget.prototype.constructor = RangeWidget;

RangeWidget.prototype._init = function() {
    var that = this;
    this.props = this._getProps();
    var $widget = $(
        '<div class="widget range-widget">' +
        '<div class="range-widget__wrap">' +
        '<div class="range-widget__current"/>' +
        '<div class="range-widget__bg"/>' +
        '<div class="range-widget__ticks"/>' +
        '<div class="range-widget__scale">' +
        '<span class="range-widget__scale__start"/>' +
        this._stepsBetweenHtml( this.props ) +
        this.resetButtonHtml +
        '<span class="range-widget__scale__end"/>' +
        '</div>' +
        '<div class="range-widget__bulb"><div class="range-widget__bulb__inner"/><div class="range-widget__bulb__mercury"/></div>' +
        '</div>' +
        '<input type="range" class="ignore empty" min="' + this.props.min + '" max="' + this.props.max + '" step="' + this.props.step + '"/>' +
        '</div>'
    );

    $widget.find( '.range-widget__scale__start' ).text( this.props.min );
    $widget.find( '.range-widget__scale__end' ).text( this.props.max );

    this.$number = $( this.element );
    this.$range = $widget.find( 'input' );
    this.$current = $widget.find( '.range-widget__current' );

    this.$number
        .after( $widget )
        .on( 'applyfocus', function() {
            that.$range.focus();
        } )
        .addClass( 'hide' );

    if ( this.props.readonly ) {
        this.disable();
    }

    this.$range
        .on( 'change', function() {
            that.$current.text( this.value );
            that.$number.val( this.value ).trigger( 'change' );
            that._updateMercury( ( this.value - this.min ) / ( that.props.max - that.props.min ) );
        } )
        .on( 'focus', function() {
            that.$number.trigger( 'fakefocus' );
        } );

    // Do not use change handler for this because this doesn't if the user clicks on the internal default
    // value of the range input.
    $widget
        .find( 'input.empty' )
        .on( 'click', function() {
            that.$range.removeClass( 'empty' ).change();
        } );

    $widget
        .find( '.btn-reset' )
        .on( 'click', this._reset.bind( this ) );

    // loads the default value if exists, else resets
    this.update();

    // The actual value to show all ticks
    // var backgroundSizes = [ props.step * 100 / ( props.max - props.min ), '100' ];
    // But don't show too many ticks
    // backgroundSizes[ 0 ] = Math.ceil( 1 / ( backgroundSizes[ 0 ] / 10 ) ) * backgroundSizes[ 0 ];
    // Round up to first decimal and cheat with +1 to work around Chrome background bug // REMOVE THIS WHEN CHROME IS FIXED
    //backgroundSizes[ 0 ] = Math.ceil( 0.9 + backgroundSizes[ 0 ] * 10 ) / 10;
    //if ( props.vertical ) {
    //    backgroundSizes.reverse();
    //}
    //$widget.find( '.range-widget__ticks' ).css( 'background-size', backgroundSizes.map( function( size ) { return size + '%'; } ).join( ' ' ) );
};

RangeWidget.prototype._getProps = function() {
    var min = utils.isNumber( this.element.getAttribute( 'min' ) ) ? this.element.getAttribute( 'min' ) : 0;
    var max = utils.isNumber( this.element.getAttribute( 'max' ) ) ? this.element.getAttribute( 'max' ) : 10;
    var step = utils.isNumber( this.element.getAttribute( 'step' ) ) ? this.element.getAttribute( 'step' ) : 1;
    var $q = $( this.element ).closest( '.question' );
    var distress = $q.hasClass( 'or-appearance-distress' );
    return {
        min: Number( min ),
        max: Number( max ),
        step: Number( step ),
        readonly: this.element.readOnly,
        vertical: $q.hasClass( 'or-appearance-vertical' ) || distress,
        distress: distress,
    };
};

RangeWidget.prototype._updateMercury = function( completeness ) {
    var $widget = $( this.element ).next( '.widget' );
    var trackHeight = $widget.find( '.range-widget__ticks' ).height();
    var bulbHeight = $widget.find( '.range-widget__bulb' ).height();
    $widget.find( '.range-widget__bulb__mercury' ).css( 'height', ( completeness * trackHeight ) + ( 0.5 * bulbHeight ) + 'px' );
};

RangeWidget.prototype._stepsBetweenHtml = function( props ) {
    var html = '';
    if ( props.distress ) {
        var stepsCount = ( props.max - props.min ) / props.step;
        if ( stepsCount <= 10 && ( props.max - props.min ) % props.step === 0 ) {
            for ( var i = props.min + props.step; i < props.max; i += props.step ) {
                html += '<span class="range-widget__scale__between">' + i + '</span>';
            }
        }
    }
    return html;
};

RangeWidget.prototype._reset = function() {
    this.$range
        .val( '' ) // this actually sets the value to some default value, not really helpful
        .addClass( 'empty' );

    this.$current.text( '-' );
    this.$number.val( '' ).trigger( 'change' );
    this._updateMercury( -1 );
};

RangeWidget.prototype.disable = function() {
    $( this.element )
        .next( '.widget' )
        .find( 'input, button' )
        .prop( 'disabled', true );
};

RangeWidget.prototype.enable = function() {
    if ( this.props && !this.props.readonly ) {
        $( this.element )
            .next( '.widget' )
            .find( 'input, button' )
            .prop( 'disabled', false );
    }
};

RangeWidget.prototype.update = function() {
    var value = this.element.value;

    if ( utils.isNumber( value ) ) {
        $( this.element )
            .next( '.widget' )
            .find( 'input' )
            .val( value )
            .trigger( 'change' )
            .removeClass( 'empty' );
    } else {
        this._reset();
    }
};


$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new RangeWidget( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};


module.exports = {
    'name': pluginName,
    // avoid initizialing number inputs in geopoint widgets!
    'selector': '.or-appearance-distress input[type="number"], .question > input[type="number"][min][max][step]'
};
