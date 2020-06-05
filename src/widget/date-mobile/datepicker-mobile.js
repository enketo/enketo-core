import Widget from '../../js/widget';
import support from '../../js/support';
import { elementDataStore as data } from '../../js/dom-utils';

/**
 * For now, the whole purpose of this widget is to show a native month picker on
 * MOBILE devices with browsers that support it.
 *
 * @augments Widget
 */
class DatepickerMobile extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-month-year input[type="date"]';
    }

    /**
     * @param {Element} element - the element to instantiate the widget on
     * @return {boolean} to instantiate or not to instantiate, that is the question
     */
    static condition( element ) {
        // Do not instantiate if DatepickerExtended was instantiated on element or if non-mobile device is used.
        return !data.has( element, 'DatepickerExtended' ) && support.touch && support.inputTypes.month;
    }

    _init() {
        this.element.classList.add( 'hide' );
        const fragment = document.createRange().createContextualFragment( '<input class="ignore widget datepicker-mobile" type="month"/>' );
        this.element.after( fragment );
        this.widgetInput = this.question.querySelector( 'input.widget' );
        // set default value
        this.value = this.originalInputValue;

        this.widgetInput.addEventListener( 'change', () => {
            this.originalInputValue = this.value;
        } );
    }

    /**
     * @type {string}
     */
    get value() {
        return this.widgetInput.value ? `${this.widgetInput.value}-01` : '';
    }

    set value( value ) {
        const toSet = value ? value.substring( 0, value.lastIndexOf( '-' ) ) : '';
        this.widgetInput.value = toSet;
    }

    /**
     * Updates value
     */
    update() {
        this.value = this.originalInputValue;
    }
}

export default DatepickerMobile;
