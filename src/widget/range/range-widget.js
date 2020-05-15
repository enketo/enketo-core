import Widget from '../../js/widget';
import { isNumber } from '../../js/utils';
import events from '../../js/event';

/**
 * @augments Widget
 */
class RangeWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-distress input[type="number"], .question:not(.or-appearance-analog-scale):not(.or-appearance-rating) > input[type="number"][min][max][step]';
    }

    _init() {
        const that = this;

        const fragment = document.createRange().createContextualFragment( this._getHtmlStr() );
        fragment.querySelector( '.range-widget__scale__end' ).before( this.resetButtonHtml );
        fragment.querySelector( '.range-widget__scale__start' ).textContent = this.props.min;
        fragment.querySelector( '.range-widget__scale__end' ).textContent = this.props.max;

        this.element.after( fragment );
        this.element.classList.add( 'hide' );
        this.element.addEventListener( 'applyfocus', () => {
            this.range.focus();
        } );

        this.widget = this.question.querySelector( '.widget' );
        this.range = this.widget.querySelector( 'input' );
        this.current = this.widget.querySelector( '.range-widget__current' );

        if ( this.props.readonly ) {
            this.disable();
        }

        this.range.addEventListener( 'change', () => {
            // Avoid unnecessary change events on original input as these can have big negative consequences
            // https://github.com/OpenClinica/enketo-express-oc/issues/209
            if ( this.originalInputValue !== this.value ) {
                this.current.textContent = this.value;
                this.originalInputValue = this.value;
                this._updateMercury( ( this.value - this.props.min ) / ( that.props.max - that.props.min ) );
            }
        } );

        // Do not use change handler for this because this doesn't fire if the user clicks on the internal DEFAULT
        // value of the range input.
        this.widget.querySelector( 'input.empty' ).addEventListener( 'click', () => {
            this.range.classList.remove( 'empty' );
            this.range.dispatchEvent( events.Change() );
        } );
        this.widget.querySelector( 'input.empty' ).addEventListener( 'touchstart', () => {
            this.range.classList.remove( 'empty' );
            this.range.dispatchEvent( events.Change() );
        } );

        this.widget.querySelector( '.btn-reset' ).addEventListener( 'click', this._reset.bind( this ) );

        // loads the default value if exists, else resets
        this.update();

        let ticks = this.props.ticks ? Math.ceil( Math.abs( ( this.props.max - this.props.min ) / this.props.step ) ) : 1;
        // Now reduce to a number < 50 to avoid showing a sold black tick line.
        let divisor = Math.ceil( ticks / this.props.maxTicks );
        while ( ticks % divisor && divisor < ticks ) {
            divisor++;
        }
        ticks = ticks / divisor;

        // Various attemps to use more elegant CSS background on the _ticks div, have failed due to little
        // issues seemingly related to rounding or browser sloppiness. This far is less elegant but nice and robust:
        this.widget.querySelector( '.range-widget__ticks' )
            .append( document.createRange().createContextualFragment( new Array( ticks ).fill( '<span></span>' ).join( '' ) ) );
    }

    /**
     * This is separated so it can be extended (in the analog-scale widget)
     *
     * @return {string} HTML string
     */
    _getHtmlStr() {
        const html =
            `<div class="widget range-widget">
                <div class="range-widget__wrap">
                    <div class="range-widget__current"></div>
                    <div class="range-widget__bg"></div>
                    <div class="range-widget__ticks"></div>
                    <div class="range-widget__scale">
                        <span class="range-widget__scale__start"></span>
                        ${this._stepsBetweenHtmlStr( this.props )}
                        <span class="range-widget__scale__end"></span>
                    </div>
                    <div class="range-widget__bulb">
                        <div class="range-widget__bulb__inner"></div>
                        <div class="range-widget__bulb__mercury"></div>
                    </div>
                </div>
                <input type="range" class="ignore empty" min="${this.props.min}" max="${this.props.max}" step="${this.props.step}"/>
            </div>`;

        return html;
    }

    /**
     * @param {number} completeness - level of mercury
     */
    _updateMercury( completeness ) {
        const trackHeight = this.widget.querySelector( '.range-widget__ticks' ).clientHeight;
        const bulbHeight = this.widget.querySelector( '.range-widget__bulb' ).clientHeight;
        this.widget.querySelector( '.range-widget__bulb__mercury' ).style.height = `${( completeness * trackHeight ) + ( 0.5 * bulbHeight )}px`;
    }

    /**
     * @param {object} props - The range properties.
     * @return {string} HTML string
     */
    _stepsBetweenHtmlStr( props ) {
        let html = '';
        if ( props.distress ) {
            const stepsCount = ( props.max - props.min ) / props.step;
            if ( stepsCount <= 10 && ( props.max - props.min ) % props.step === 0 ) {
                for ( let i = props.min + props.step; i < props.max; i += props.step ) {
                    html += `<span class="range-widget__scale__between">${i}</span>`;
                }
            }
        }

        return html;
    }

    /**
     * Resets widget
     */
    _reset() {
        // Update UI stuff before the actual value to avoid issues in custom clients that may want to programmatically undo a reset ("strict required" in OpenClinica)
        // as that is subtly different from updating a value with a calculation since this.originalInputValue=  sets the evaluation cascade in motion.
        this.current.textContent = '';
        this._updateMercury( 0 );
        this.value = '';
        this.originalInputValue = '';
    }

    /**
     * Disables widget
     */
    disable() {
        this.widget.querySelectorAll( 'input, button' ).forEach( el => el.disabled = true );
    }

    /**
     * Enables widget
     */
    enable() {
        this.widget.querySelectorAll( 'input, button' ).forEach( el => el.disabled = false );
    }

    /**
     * Updates widget
     */
    update() {
        const value = this.element.value;

        if ( isNumber( value ) ) {
            this.value = value;
            this.range.dispatchEvent( events.Change() );
        } else {
            this._reset();
        }
    }

    /**
     * @type {object}
     */
    get props() {
        const props = this._props;
        const min = isNumber( this.element.getAttribute( 'min' ) ) ? this.element.getAttribute( 'min' ) : 0;
        const max = isNumber( this.element.getAttribute( 'max' ) ) ? this.element.getAttribute( 'max' ) : 10;
        const step = isNumber( this.element.getAttribute( 'step' ) ) ? this.element.getAttribute( 'step' ) : 1;
        const distress = props.appearances.includes( 'distress' );

        props.min = Number( min );
        props.max = Number( max );
        props.step = Number( step );
        props.vertical = props.appearances.includes( 'vertical' ) || distress;
        props.ticks = !props.appearances.includes( 'no-ticks' );
        props.distress = distress;
        props.maxTicks = 50;

        return props;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.range.classList.contains( 'empty' ) ? '' : this.range.value;
    }

    set value( value ) {
        this.range.value = value;
        // value '' actually sets the value to some default value in html range input, not really helpful
        this.range.classList.toggle( 'empty', value === '' );
    }


}

export default RangeWidget;
