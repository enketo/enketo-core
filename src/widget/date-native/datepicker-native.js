import Widget from '../../js/widget';
import support from '../../js/support';
import { elementDataStore as data } from '../../js/dom-utils';

/**
 * The whole purpose of this widget is to hide the placeholder text on native date inputs
 * and show a consistent date format between readonly and non-readonly questions. This widget
 * is only activated for READONLY questions on NON-MOBILE devices.
 *
 * The placeholder is considered particularly unhelpful for month-year and year appearances.
 * For consistency it's also removed from regular date inputs.
 *
 * TODO: it looks like empty date/datetime-local inputs are hidden, so not clear to me if this widget actually
 * changes anything.
 *
 * @augments Widget
 */
class DatepickerNative extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input[type="date"],.question input[type="datetime-local"]';
    }

    /**
     * @param {Element} element - the element to instantiate the widget on
     * @return {boolean} to instantiate or not to instantiate, that is the question
     */
    static condition(element) {
        // Do not instantiate if DatepickerExtended was instantiated on element or if mobile device is used.
        return (
            !data.has(element, 'DatepickerExtended') &&
            !data.has(element, 'DatetimepickerExtended') &&
            !support.touch
        );
    }

    _init() {
        this.element.type = 'text';
        this.element.classList.add('mask-date');
    }
}

export default DatepickerNative;
