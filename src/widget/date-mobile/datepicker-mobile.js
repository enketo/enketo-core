import Widget from '../../js/widget';
import support from '../../js/support';
import { elementDataStore as data } from '../../js/dom-utils';

/**
 * For now, the whole purpose of this widget is to show a native month picker on 
 * MOBILE devices with browsers that support it.
 */
class DatepickerMobile extends Widget {

    static get selector() {
        return '.or-appearance-month-year input[type="date"]';
    }

    static condition( element ) {
        // Do not instantiate if DatepickerExtended was instantiated on element or if non-mobile device is used.
        return !data.has( element, 'DatepickerExtended' ) && support.touch;
    }

    _init() {
        if ( support.inputTypes.month ) {
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
    }

    get value() {
        return this.widgetInput.value ? `${this.widgetInput.value}-01` : '';
    }

    set value( value ) {
        const toSet = value ? value.substring( 0, value.lastIndexOf( '-' ) ) : '';
        this.widgetInput.value = toSet;
    }

    update() {
        this.value = this.originalInputValue;
    }
}

export default DatepickerMobile;
