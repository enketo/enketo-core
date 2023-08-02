import input from './input';
import event from './event';

const range = document.createRange();

/**
 * @template {HTMLElement} [Element=HTMLElement]
 * A Widget class that can be extended to provide some of the basic widget functionality out of the box.
 */
class Widget {
    /**
     * @param {import('./form').Form} form
     * @param {HTMLFormElement} rootElement
     */
    static globalInit(form, rootElement) {
        this.form = form;
        this.rootElement = rootElement;
    }

    static globalReset() {
        const { form, rootElement } = this;

        delete this.form;
        delete this.rootElement;

        return { form, rootElement };
    }

    /**
     * @class
     * @param {Element} element - The DOM element the widget is applied on
     * @param {(boolean|{touch: boolean})} [options] - Options passed to the widget during instantiation
     */
    constructor(element, options) {
        this.element = element;
        this.options = options || {};
        this.question = element.closest('.question');
        this._props = this._getProps();

        // Some widgets (e.g. ImageMap) initialize asynchronously and init returns a promise.
        return this._init() || this;
    }

    /**
     * Meant to be overridden, but automatically called.
     *
     */
    _init() {
        // load default value into the widget
        this.value = this.originalInputValue;
        // if widget initializes asynchronously return a promise here. Otherwise, return nothing/undefined/null.
    }

    /**
     * Not meant to be overridden, but could be. Recommend to extend `get props()` instead.
     *
     * @return {object} props object
     */
    _getProps() {
        const that = this;

        return {
            get readonly() {
                return that.element.nodeName.toLowerCase() === 'select'
                    ? that.element.hasAttribute('readonly')
                    : !!that.element.readOnly;
            },
            appearances: [
                ...this.element.closest('.question, form.or').classList,
            ]
                .filter((cls) => cls.indexOf('or-appearance-') === 0)
                .map((cls) => cls.substring(14)),
            multiple: !!this.element.multiple,
            disabled: !!this.element.disabled,
            type: this.element.getAttribute('data-type-xml'),
        };
    }

    /**
     * Disallow user input into widget by making it readonly.
     */
    disable() {
        // leave empty in Widget.js
    }

    /**
     * Performs opposite action of disable() function.
     */
    enable() {
        // leave empty in Widget.js
    }

    /**
     * Updates form-defined language strings, <option>s (cascading selects, and (calculated) values.
     * Most of the times, this function needs to be overridden in the widget.
     */
    update() {}

    /**
     * Returns widget properties. May need to be extended.
     *
     * @readonly
     * @type {object}
     */
    get props() {
        return this._props;
    }

    /**
     * Returns a HTML document fragment for a reset button.
     *
     * @readonly
     * @type {Element}
     */
    get resetButtonHtml() {
        return range.createContextualFragment(
            `<button
                type="button"
                class="btn-icon-only btn-reset"
                aria-label="reset">
                <i class="icon icon-refresh"> </i>
            </button>`
        );
    }

    /**
     * Returns a HTML document fragment for a download button.
     *
     * @readonly
     * @type {Element}
     */
    get downloadButtonHtml() {
        return range.createContextualFragment(
            `<a
                class="btn-icon-only btn-download"
                aria-label="download"
                download
                href=""><i class="icon icon-download"> </i></a>`
        );
    }

    /**
     * Obtains the value from the current widget state. Should be overridden.
     *
     * @readonly
     * @type {*}
     */
    get value() {
        return undefined;
    }

    /**
     * Sets a value in the widget. Should be overridden.
     *
     * @param {*} value - value to set
     * @type {*}
     */
    set value(value) {} // eslint-disable-line no-empty-function -- this is defining the API

    /**
     * Obtains the value from the original form control the widget is instantiated on.
     * This form control is often hidden by the widget.
     *
     * @readonly
     * @type {*}
     */
    get originalInputValue() {
        return input.getVal(this.element);
    }

    /**
     * Updates the value in the original form control the widget is instantiated on.
     * This form control is often hidden by the widget.
     *
     * @param {*} value - value to set
     * @type {*}
     */
    set originalInputValue(value) {
        // Avoid unnecessary change events as they could have significant negative consequences!
        // However, to add a check for this.originalInputValue !== value here would affect performance too much,
        // so we rely on widget code to only use this setter when the value changes.
        input.setVal(this.element, value, null);
        this.element.dispatchEvent(event.Change());
    }

    /**
     * Returns its own name.
     *
     * @static
     * @readonly
     * @type {string}
     */
    static get name() {
        return this.constructor.name;
    }

    /**
     * Returns true if the widget is using a list of options.
     *
     * @readonly
     * @static
     * @type {boolean}
     */
    static get list() {
        return false;
    }

    /**
     * Tests whether widget needs to be instantiated (e.g. if not to be used for touchscreens).
     * Note that the Element (used in the constructor) will be provided as parameter.
     *
     * @static
     * @return {boolean} to instantiate or not to instantiate, that is the question
     */
    static condition() {
        return true;
    }
}

export default Widget;

/**
 * @typedef {(new (...args: any[]) => Widget & Pick<typeof Widget, keyof typeof Widget>)} WidgetClass
 */
