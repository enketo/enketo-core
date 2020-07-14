import Widget from '../../js/widget';
import { isNumber } from '../../js/utils';

/**
 * Thousands separator widget.
 * Deviates from ODK XForms spec by not supporting text fields.
 */
class ThousandsSeparatorWidget extends Widget {

    static get selector() {
        return '.or-appearance-thousands-sep input[type="number"]';
    }

    /**
     * Initialize
     */
    _init() {
        const fragment = document.createRange().createContextualFragment( '<div class="widget "></div>' );

        this.element.after( fragment );
        this.widget = this.element.parentElement.querySelector( '.widget' );

        // Set the current loaded value into the widget
        this.update();

        this.element.addEventListener( 'change', this.update.bind( this ) );
    }

    /**
     * Update the value of the widget.
     */
    update() {
        this.value = this.originalInputValue;
    }

    /**
     * Obtain the current value from the widget.
     *
     * @type {string}
     */
    get value() {
        return this.widget.textContent;
    }

    /**
     * Set a value in the widget.
     *
     * @param {number} [value] - The number value to update with.
     */
    set value( value ) {
        let displayValue = '';

        if ( isNumber( value ) ) {
            displayValue = Number( value ).toLocaleString( undefined, { maximumFractionDigits: 20 } );
        }

        this.widget.textContent = displayValue;
    }

}

export default ThousandsSeparatorWidget;
