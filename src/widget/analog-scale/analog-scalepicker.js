'use strict';
var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'analogscalepicker';

require( 'bootstrap-slider-basic' );

/**
 * Creates an analog scale picker
 *
 * @constructor
 * @param {Element} element Element to apply widget to.
 * @param {(boolean|{touch: boolean})} options options
 */
function Analogscalepicker( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

// copy the prototype functions from the Widget super class
Analogscalepicker.prototype = Object.create( Widget.prototype );

// ensure the constructor is the new one
Analogscalepicker.prototype.constructor = Analogscalepicker;

/**
 * Initialize
 */
Analogscalepicker.prototype._init = function() {
    var $question = $( this.element ).closest( '.question' );
    var $input = $( this.element );
    var value = Number( this.element.value ) || -1;

    this.props = this._getProps( $question );

    $input
        .slider( {
            reversed: this.props.orientation === 'vertical',
            min: 0,
            max: 100,
            orientation: this.props.orientation,
            step: this.props.step,
            value: value,
            enabled: !this.props.readonly
        } );

    this.$widget = $input.next( '.widget' );
    this.$slider = this.$widget.find( '.slider' );
    this.$labelContent = $( '<div class="label-content widget" />' ).prependTo( $question );
    this.$originalLabels = $question.find( '.question-label, .or-hint, .or-required-msg, .or-constraint-msg' );
    this.$labelContent.append( this.$originalLabels );

    this._renderResetButton();
    this._renderLabels();
    this._renderScale();
    this._setChangeListener();
    this._setResizeListener();

    // update reset button and slider "empty" state
    $input.trigger( 'programmaticChange' + this.namespace );
};

Analogscalepicker.prototype._getProps = function( $question ) {
    var appearances = $question.attr( 'class' ).split( ' ' )
        .map( function( appearance, index ) {
            return appearance.substring( 14 );
        } );
    var type = this.element.attributes[ 'data-type-xml' ].value;

    return {
        touch: this.options.touch,
        readonly: this.element.readOnly,
        step: type === 'decimal' ? 0.1 : 1,
        orientation: appearances.indexOf( 'horizontal' ) !== -1 ? 'horizontal' : 'vertical'
    };
};

/** 
 * (re-)Renders the widget labels based on the current content of .question-label.active
 */
Analogscalepicker.prototype._renderLabels = function() {
    var $labelEl = this.$labelContent.find( '.question-label.active' );
    var labels = $labelEl.html().split( /\|/ ).map( function( label ) {
        return label.trim();
    } );

    this.$mainLabel = this.$mainLabel || $( '<span class="question-label widget active" />' ).insertAfter( $labelEl );
    this.$mainLabel.empty().append( labels[ 0 ] );

    this.$maxLabel = this.$maxLabel || $( '<div class="max-label" />' ).prependTo( this.$widget );
    this.$maxLabel.empty().append( labels[ 1 ] );

    this.$minLabel = this.$minLabel || $( '<div class="min-label" />' ).appendTo( this.$widget );
    this.$minLabel.empty().append( labels[ 2 ] );

    if ( labels[ 3 ] ) {
        this.$showValue = this.$showValue || $( '<div class="widget show-value" />' ).appendTo( this.$labelContent );
        this.$showValue.empty().append( '<div class="show-value__box">' + labels[ 3 ] +
            '<span class="show-value__value">' + this.element.value + '</span></div>' );
    } else if ( this.$showValue ) {
        this.$showValue.remove();
        this.$showValue = undefined;
    }
};

Analogscalepicker.prototype._renderScale = function() {
    var i;
    var $scale = $( '<div class="scale"></div>' );

    if ( this.props.orientation === 'vertical' ) {
        for ( i = 100; i >= 0; i -= 10 ) {
            $scale.append( this._getNumberHtml( i ) );
        }
    } else {
        for ( i = 0; i <= 100; i += 10 ) {
            $scale.append( this._getNumberHtml( i ) );
        }
    }

    this.$slider.prepend( $scale );
};

Analogscalepicker.prototype._getNumberHtml = function( num ) {
    return '<div class="scale__number"><div class="scale__ticks"></div><div class="scale__value">' + num + '</div></div>';
};

Analogscalepicker.prototype._renderResetButton = function() {
    var that = this;

    this.$resetBtn = $( '<button class="btn-icon-only btn-reset"><i class="icon icon-refresh"></i></button>' )
        .appendTo( this.$widget )
        .on( 'click', function() {
            $( that.element ).slider( 'setValue', 0, false );
            $( that.element ).val( '' ).trigger( 'programmaticChange' + that.namespace );
            return false;
        } )
        .prop( 'disabled', that.props.readonly );
};

Analogscalepicker.prototype._updateCurrentValueShown = function() {
    if ( this.$showValue ) {
        this.$showValue.find( '.show-value__value' ).text( this.element.value );
    }
};

Analogscalepicker.prototype._setChangeListener = function() {
    var that = this;

    $( this.element ).on( 'slideStop.' + this.namespace + ' programmaticChange' + this.namespace, function() {
        var empty = ( this.value === '' );
        $( this ).trigger( 'change' );
        that.$resetBtn.prop( 'disabled', empty || that.props.readonly );
        that.$slider.toggleClass( 'slider--empty', empty );
        that._updateCurrentValueShown();
    } );
};

/*
 * Stretch the question to full page height.
 * Doing this with pure css flexbox using "flex-direction: column" interferes with the Grid theme 
 * because that theme relies on flexbox with "flex-direction: row".
 */
Analogscalepicker.prototype._setResizeListener = function() {
    var $question = $( this.element ).closest( '.question' );

    if ( !$question.hasClass( 'or-appearance-horizontal' ) ) {
        // Will only be triggered if question by itself constitutes a page.
        // It will not be triggerd if question is contained inside a group with fieldlist appearance.
        $question.on( 'pageflip.enketo', this._stretchHeight );
    }
};

Analogscalepicker.prototype._stretchHeight = function() {
    var $question = $( this ).closest( '.question' ).css( 'min-height', 'auto' );
    var height = $question.outerHeight();
    var $form = $question.closest( '.or' );
    var diff = ( $form.offset().top + $form.height() ) - ( $question.offset().top + height ) - 10;
    if ( diff ) {
        // To somewhat avoid problems when a repeat is clone and height is set while the widget is detached
        // we use min-height instead of height.
        $question.css( 'min-height', height + diff + 'px' );
    }
};

Analogscalepicker.prototype.disable = function() {
    var value = ( this.element.value !== '' ) ? Number( this.element.value ) : 0;
    $( this.element )
        .slider( 'disable' )
        .slider( 'setValue', value, false );
};

Analogscalepicker.prototype.enable = function() {
    $( this.element )
        .slider( 'enable' );
};

Analogscalepicker.prototype.update = function() {
    // in case input value was changed (due to calculation update)
    var that = this;
    var value = ( this.element.value !== '' ) ? Number( this.element.value ) : 0;
    var $el = $( this.element );
    var sliderValue = $el.slider( 'getValue' );
    if ( value !== sliderValue ) {
        $( this.element )
            .slider( 'setValue', value, false )
            .trigger( 'programmaticChange' + that.namespace );
    }
    // in case language was changed
    this._renderLabels();
};

$.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
        var $this = $( this ),
            data = $( this ).data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new Analogscalepicker( this, options, event ) );
        } else if ( data && typeof options === 'string' ) {
            //pass the context, used for destroy() as this method is called on a cloned widget
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-analog-scale input[type="number"]'
};
