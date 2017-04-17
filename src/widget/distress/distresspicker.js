'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
require( 'bootstrap-slider-basic' );

var pluginName = 'distresspicker';

/**
 * Creates a distress picker.
 *
 * @constructor
 * @param {Element} element Element to apply widget to.
 * @param {(boolean|{touch: boolean})} options options
 * @param {*=} event     event
 */

function Distresspicker( element, options, event ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

//copy the prototype functions from the Widget super class
Distresspicker.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
Distresspicker.prototype.constructor = Distresspicker;

/**
 * Initialize
 */
Distresspicker.prototype._init = function() {
    var value = Number( this.element.value ) || -1;

    this.props = this._getProps();

    $( this.element ).slider( {
        reversed: true,
        min: -1,
        max: 10,
        orientation: 'vertical',
        step: this.props.step,
        value: value,
        enabled: !this.props.readonly
    } );
    this.$widget = $( this.element ).next( '.widget' );
    this.$slider = this.$widget.find( '.slider' );
    this._addBulb();
    this._addScale();
    this._setChangeListener();
};

Distresspicker.prototype._getProps = function() {
    var type = this.element.attributes[ 'data-type-xml' ].value;

    return {
        touch: this.options.touch,
        readonly: this.element.readOnly,
        step: type === 'decimal' ? 0.1 : 1,
    };
};

Distresspicker.prototype._addBulb = function() {
    this.$slider.append(
        '<div class="bulb"><div class="inner"></div></div>'
    );
};

Distresspicker.prototype._addScale = function() {
    var $scale = $( '<div class="scale"></div>' );
    for ( var i = 10; i >= -1; i-- ) {
        $scale.append( '<div class="number"><div class="value">' + i + '</div></div>' );
    }
    this.$slider.prepend( $scale );
};

/**
 * Set delegated event handlers
 */
Distresspicker.prototype._setChangeListener = function() {
    $( this.element ).on( 'slideStop.' + this.namespace, function() {
        // set to empty if value = -1
        if ( Number( this.value ) === -1 ) {
            this.value = '';
        }
        $( this ).trigger( 'change' );
    } );
};

Distresspicker.prototype.disable = function() {
    var value = ( this.element.value !== '' ) ? Number( this.element.value ) : -1;
    $( this.element )
        .slider( 'disable' )
        .slider( 'setValue', value, false );
};

Distresspicker.prototype.enable = function() {
    $( this.element )
        .slider( 'enable' );
};

Distresspicker.prototype.update = function() {
    var value = ( this.element.value !== '' ) ? Number( this.element.value ) : -1;
    var $el = $( this.element );
    var sliderValue = $el.slider( 'getValue' );

    if ( value !== sliderValue ) {
        $( this.element )
            .slider( 'setValue', value, false );
    }
};

$.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
        var $this = $( this ),
            data = $( this ).data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new Distresspicker( this, options, event ) );
        } else if ( data && typeof options === 'string' ) {
            //pass the context, used for destroy() as this method is called on a cloned widget
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-distress input[type="number"]'
};
