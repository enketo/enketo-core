import Widget from '../../js/widget';
import $ from 'jquery';
import support from '../../js/support';
import event from '../../js/event';
import 'bootstrap-slider-basic';

// TODO: replace bootstrap-slider-basic with native slider as in range picker.
// TODO: remove jQuery
// TODO: make common widget tests pass

class Analogscalepicker extends Widget {

    static get selector() {
        return '.or-appearance-analog-scale input[type="number"]';
    }

    _init() {
        const $question = $( this.element ).closest( '.question' ).addClass( 'or-analog-scale-initialized' );
        const $input = $( this.element );
        const value = Number( this.originalInputValue ) || -1;

        $input
            .slider( {
                reversed: this.props.orientation === 'vertical',
                min: 0,
                max: 100,
                orientation: this.props.orientation,
                step: this.props.step,
                value,
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
        $input.trigger( `programmaticChange${this.namespace}` );
    }

    /** 
     * (re-)Renders the widget labels based on the current content of .question-label.active
     */
    _renderLabels() {
        const $labelEl = this.$labelContent.find( '.question-label.active' );
        const labels = $labelEl.html().split( /\|/ ).map( label => label.trim() );

        this.$mainLabel = this.$mainLabel || $( '<span class="question-label widget active" />' ).insertAfter( $labelEl );
        this.$mainLabel.empty().append( labels[ 0 ] );

        this.$maxLabel = this.$maxLabel || $( '<div class="max-label" />' ).prependTo( this.$widget );
        this.$maxLabel.empty().append( labels[ 1 ] );

        this.$minLabel = this.$minLabel || $( '<div class="min-label" />' ).appendTo( this.$widget );
        this.$minLabel.empty().append( labels[ 2 ] );

        if ( labels[ 3 ] ) {
            this.$showValue = this.$showValue || $( '<div class="widget show-value" />' ).appendTo( this.$labelContent );
            this.$showValue.empty().append( `<div class="show-value__box">${labels[ 3 ]}<span class="show-value__value">${this.element.value}</span></div>` );
        } else if ( this.$showValue ) {
            this.$showValue.remove();
            this.$showValue = undefined;
        }
    }

    _renderScale() {
        let i;
        const $scale = $( '<div class="scale"></div>' );

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
    }

    _getNumberHtml( num ) {
        return `<div class="scale__number"><div class="scale__ticks"></div><div class="scale__value">${num}</div></div>`;
    }

    _renderResetButton() {
        const that = this;

        this.$resetBtn = $( this.resetButtonHtml )
            .appendTo( this.$widget )
            .on( 'click', () => {
                $( that.element ).slider( 'setValue', 0, false );
                $( that.element ).val( '' ).trigger( `programmaticChange${that.namespace}` );
                return false;
            } )
            .prop( 'disabled', that.props.readonly );
    }

    _updateCurrentValueShown() {
        if ( this.$showValue ) {
            this.$showValue.find( '.show-value__value' ).text( this.originalInputValue );
        }
    }

    _setChangeListener() {
        const that = this;

        $( this.element ).on( `slideStop.${this.namespace} programmaticChange${this.namespace}`, () => {
            const empty = ( this.value === '' );
            this.element.dispatchEvent( event.Change() ); //).trigger( 'change' );
            that.$resetBtn.prop( 'disabled', empty || that.props.readonly );
            that.$slider.toggleClass( 'slider--empty', empty );
            that._updateCurrentValueShown();
        } );
    }

    /*
     * Stretch the question to full page height.
     * Doing this with pure css flexbox using "flex-direction: column" interferes with the Grid theme 
     * because that theme relies on flexbox with "flex-direction: row".
     */
    _setResizeListener() {
        const $question = $( this.element ).closest( '.question' );

        if ( !$question.hasClass( 'or-appearance-horizontal' ) ) {
            // Will only be triggered if question by itself constitutes a page.
            // It will not be triggerd if question is contained inside a group with fieldlist appearance.
            $question.on( 'pageflip.enketo', this._stretchHeight );
        }
    }

    _stretchHeight() {
        const $question = $( this ).closest( '.question' ).css( 'min-height', 'auto' );
        const height = $question.outerHeight();
        const $form = $question.closest( '.or' );
        const diff = ( $form.offset().top + $form.height() ) - ( $question.offset().top + height ) - 10;
        if ( diff ) {
            // To somewhat avoid problems when a repeat is clone and height is set while the widget is detached
            // we use min-height instead of height.
            $question.css( 'min-height', `${height + diff}px` );
        }
    }

    disable() {
        //const value = ( this.originalInputValue !== '' ) ? Number( this.originalInputValue ) : 0;
        $( this.element )
            .slider( 'disable' );
        //.slider( 'setValue', value, false );
    }

    enable() {
        $( this.element )
            .slider( 'enable' );
    }


    update() {
        // in case input value was changed (due to calculation update)
        const that = this;
        const value = this.originalInputValue !== '' ? Number( this.originalInputValue ) : 0;
        //const $el = $( this.element );
        const sliderValue = this.value; //$el.slider( 'getValue' );
        if ( value !== sliderValue ) {
            this.value = value;
            //$( this.element )
            //    .slider( 'setValue', value, false )
            $( this.element ).trigger( `programmaticChange${that.namespace}` );
        }
        // in case language was changed
        this._renderLabels();
    }


    get props() {
        const props = this._props;
        props.touch = support.touch;
        props.step = props.type === 'decimal' ? 0.1 : 1;
        props.orientation = props.appearances.includes( 'horizontal' ) ? 'horizontal' : 'vertical';

        return props;
    }

    get value() {
        return $( this.element ).slider( 'getValue' );
    }

    set value( value ) {
        $( this.element ).slider( 'setValue', value, false );
    }
}

export default Analogscalepicker;
