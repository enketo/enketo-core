'use strict';

require( 'enketo/polyfills-ie11' );

var pluginName = 'rankWidget';
var $ = require( 'jquery' );
var Widget = require( '../../js/Widget' );
var support = require( '../../js/support' );
var sortable = require( 'html5sortable/dist/html5sortable.cjs' );
var t = require( 'enketo/translator' ).t;

/*
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {{}|{helpers: *}}                             options   options
 */
function RankWidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

RankWidget.prototype = Object.create( Widget.prototype );
RankWidget.prototype.constructor = RankWidget;

RankWidget.prototype._init = function() {
    var that = this;
    var loadedValue = this.element.value;
    this.props = this._getProps();
    this.itemSelector = 'label:not(.itemset-template)';

    this.list = $( this.element ).next( '.option-wrapper' ).addClass( 'widget rank-widget' )[ 0 ];
    var $reset = $( this.resetButtonHtml ).on( 'click', function() {
        that._reset();
        return false;
    } );
    var startText = support.touch ? t( 'rankwidget.tapstart' ) : t( 'rankwidget.clickstart' );

    $( this.list )
        .toggleClass( 'rank-widget--empty', !loadedValue )
        .append( $reset )
        .append( '<div class="rank-widget__overlay"><span class="rank-widget__overlay__content">' + startText + '</span></div>' )
        .on( 'click', function() {
            if ( !that.element.disabled ) {
                this.classList.remove( 'rank-widget--empty' );
                that._updateOriginalInput( that._getValueFromWidget() );
            }
        } );

    this.element.classList.add( 'hide' );

    this._setValueInWidget( loadedValue );

    // Create the sortable drag-and-drop functionality
    sortable( this.list, {
        items: this.itemSelector,
        //hoverClass: 'rank-widget__item--hover',
        containerSerializer: function( container ) {
            return {
                value: [].slice.call( container.node.querySelectorAll( that.itemSelector + ' input' ) ).map( function( input ) {
                    return input.value;
                } ).join( ' ' )
            };
        }
    } )[ 0 ].addEventListener( 'sortupdate', function() {
        that._updateOriginalInput( that._getValueFromWidget() );
    } );

    if ( this.props.readonly ) {
        this.disable();
    }
};

RankWidget.prototype._getProps = function() {
    return {
        readonly: this.element.readOnly,
    };
};

RankWidget.prototype._getValueFromWidget = function() {
    var result = sortable( this.list, 'serialize' );
    return result[ 0 ].container.value;
};

RankWidget.prototype._setValueInWidget = function( value ) {
    if ( !value ) {
        return this._reset();
    }
    var that = this;
    var values = value.split( ' ' );
    var items = [].slice.call( this.list.querySelectorAll( this.itemSelector + ' input' ) );

    // Basic error check
    if ( values.length !== items.length ) {
        throw new Error( 'Could not load rank widget value. Number of items mismatch.' );
    }

    // Don't even attempt to rectify a mismatch between the value and the available items.
    items.sort( function( a, b ) {
        var aIndex = values.indexOf( a.value );
        var bIndex = values.indexOf( b.value );
        if ( aIndex === -1 || bIndex === -1 ) {
            throw new Error( 'Could not load rank widget value. Mismatch in item values.' );
        }
        return aIndex > bIndex;
    } );

    items.forEach( function( item ) {
        $( that.list ).find( '.btn-reset' ).before( $( item.parentNode ).detach() );
    } );
};

/**
 * This is the input that Enketo's engine listens on.
 */
RankWidget.prototype._updateOriginalInput = function( value ) {
    $( this.element ).val( value ).trigger( 'change' );
    $( this.list ).toggleClass( 'rank-widget--empty', !value );
};

RankWidget.prototype._reset = function() {
    this._updateOriginalInput( '' );
};

RankWidget.prototype.disable = function() {
    $( this.element )
        .prop( 'disabled', true )
        .next( '.widget' )
        .find( 'input, button' )
        .prop( 'disabled', true );

    sortable( this.list, 'disable' );
};

RankWidget.prototype.enable = function() {
    if ( this.props && !this.props.readonly ) {
        $( this.element )
            .prop( 'disabled', false )
            .next( '.widget' )
            .find( 'input, button' )
            .prop( 'disabled', false );

        sortable( this.list, 'enable' );
    }
};

RankWidget.prototype.update = function() {
    var value = this.element.value;
    // re-initalize sortable because the options may have changed
    sortable( this.list );

    if ( value ) {
        this._setValueInWidget( value );
        this._updateOriginalInput( value );
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
            $this.data( pluginName, new RankWidget( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'list': true,
    // avoid initizialing number inputs in geopoint widgets!
    'selector': 'input.rank'
};
