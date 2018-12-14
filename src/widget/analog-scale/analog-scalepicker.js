import RangeWidget from '../../widget/range/range-widget';
import { isNumber } from '../../js/utils';
import support from '../../js/support';

class AnalogScaleWidget extends RangeWidget {

    static get selector() {
        return '.or-appearance-analog-scale input[type="number"]';
    }

    _init() {
        super._init();
        if ( this.props.vertical ) {
            this.question.classList.add( 'or-appearance-vertical' );
        }
        this.question.classList.add( 'or-analog-scale-initialized' );
        this._renderLabels();
        this._setResizeListener();
    }

    _getHtmlStr() {
        const html =
            `<div class="widget analog-scale-widget">
                ${super._getHtmlStr()}
            </div>`;

        return html;
    }

    _updateMercury() {}

    /** 
     * (re-)Renders the widget labels based on the current content of .question-label.active
     */
    _renderLabels() {
        const fragment = document.createRange().createContextualFragment( '<div class="label-content widget"></div>' );
        const wrapper = fragment.querySelector( '.label-content' );

        this.question.querySelectorAll( '.question-label, .or-hint, .or-required-msg, .or-constraint-msg' )
            .forEach( el => wrapper.append( el ) );

        this.question.prepend( fragment );

        this.labelContent = this.question.querySelector( '.label-content' );
        this._updateLabels();
    }

    _updateLabels() {
        if ( !this.question.classList.contains( 'or-analog-scale-initialized' ) ) {
            return;
        }
        const labelEl = this.labelContent.querySelector( '.question-label.active:not(.widget)' );
        const labels = labelEl.innerHTML.split( /\|/ ).map( label => label.trim() );

        const existingLabel = this.labelContent.querySelector( '.question-label.widget' );
        if ( existingLabel ) {
            existingLabel.remove();
        }
        const labelFragment = document.createRange().createContextualFragment( `<span class="question-label widget active">${labels[ 0 ]}</span>` );
        labelEl.after( labelFragment );

        const existingMaxLabel = this.widget.querySelector( '.max-label' );
        if ( existingMaxLabel ) {
            existingMaxLabel.remove();
        }
        const maxLabel = document.createRange().createContextualFragment( `<div class="max-label">${labels[ 1 ]}</div>` );
        this.widget.prepend( maxLabel );

        const existingMinLabel = this.widget.querySelector( '.min-label' );
        if ( existingMinLabel ) {
            existingMinLabel.remove();
        }
        const minLabel = document.createRange().createContextualFragment( `<div class="min-label">${labels[ 2 ]}</div>` );
        this.widget.append( minLabel );

        const showValue = this.labelContent.querySelector( '.show-value' );
        if ( showValue ) {
            showValue.remove();
        }
        if ( labels[ 3 ] ) {
            const showValueBox = document.createRange().createContextualFragment(
                `<div class="widget show-value">
                    <div class="show-value__box">${labels[ 3 ]}<span class="show-value__value">${this.value}</span></div>
                <div>` );
            this.labelContent.append( showValueBox );
            this.current = this.labelContent.querySelector( '.show-value__value' );
        }
    }


    /*
     * Stretch the question to full page height.
     * Doing this with pure css flexbox using "flex-direction: column" interferes with the Grid theme 
     * because that theme relies on flexbox with "flex-direction: row".
     */
    _setResizeListener() {
        if ( this.props.vertical ) {
            // Will only be triggered if question by itself constitutes a page.
            // It will not be triggered if question is contained inside a group with fieldlist appearance.
            this.question.addEventListener( 'pageflip', this._stretchHeight.bind( this ) );
        }
    }

    _stretchHeight() {
        this.question.style[ 'min-height' ] = 'auto';
        const height = this.question.offsetHeight;
        const form = this.question.closest( '.or' );
        const diff = form.offsetTop + form.offsetHeight - this.question.offsetTop + height - 10;
        //const diff = ( $form.offset().top + $form.height() ) - ( $question.offset().top + height ) - 10;
        if ( diff ) {
            // To somewhat avoid problems when a repeat is clone and height is set while the widget is detached
            // we use min-height instead of height.
            //this.question.style[ 'min-height' ] = `${height + diff}px`;
        }
    }

    update() {
        super.update();
        this._updateLabels();
    }

    get props() {
        // TODO: use super.props() and override step, max, vertical?
        const props = this._props;
        props.touch = support.touch;
        props.min = isNumber( this.element.getAttribute( 'min' ) ) ? this.element.getAttribute( 'min' ) : 0;
        props.max = isNumber( this.element.getAttribute( 'max' ) ) ? this.element.getAttribute( 'max' ) : 100;
        props.step = isNumber( this.element.getAttribute( 'step' ) ) ? this.element.getAttribute( 'step' ) : 1; //( props.type === 'decimal' ? 0.1 : 1 );
        props.vertical = !props.appearances.includes( 'horizontal' );
        props.ticks = !props.appearances.includes( 'no-ticks' );
        props.maxTicks = 10;
        return props;
    }

    get value() {
        return super.value;
    }

    set value( value ) {
        super.value = value;
    }
}

export default AnalogScaleWidget;
