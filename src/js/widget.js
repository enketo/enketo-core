import input from './input';
import event from './event';
const range = document.createRange();

/**
 * A Widget class that can be extended to provide some of the basic widget functionality out of the box.
 */
class Widget {
    /*
     * @constructor
     * @param {Element} element The DOM element the widget is applied on
     * @param {string} name Name of the widget
     * @param {(boolean|{touch: boolean})} options Options passed to the widget during instantiation
     */
    constructor( element, options ) {
        this.element = element;
        this.options = options || {};
        this.question = element.closest( '.question' );
        this._props = this._getProps();
        // Some widgets (e.g. ImageMap) initialize asynchronously and init returns a promise.
        return this._init() || this;
    }

    // Meant to be overridden, but automatically called.
    _init() {
        // load default value into the widget
        this.value = this.originalInputValue;
        // if widget initializes asynchronously return a promise here. Otherwise, return nothing/undefined/null.
    }

    // Not meant to be overridden, but could be. Recommend to extend `get props()` instead.
    _getProps() {
        const that = this;
        return {
            get readonly() { return that.element.nodeName.toLowerCase() === 'select' ? !!that.element.getAttribute( 'readonly' ) : !!that.element.readOnly; },
            appearances: [ ...this.element.closest( '.question, form.or' ).classList ]
                .filter( cls => cls.indexOf( 'or-appearance-' ) === 0 )
                .map( cls => cls.substring( 14 ) ),
            multiple: !!this.element.multiple,
            disabled: !!this.element.disabled,
            type: this.element.getAttribute( 'data-type-xml' ),
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
     * Updates languages, <option>s (cascading selects, and (calculated) values.
     * Most of the times, this function needs to be overridden in the widget.
     */
    update() {}

    /**
     * Returns widget properties. May need to be extended.
     *
     * @readonly
     * @memberof Widget
     */
    get props() {
        return this._props;
    }

    /**
     * Returns a HTML document fragment for a reset button.
     *
     * @readonly
     * @memberof Widget
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
     * @memberof Widget
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
     * @memberof Widget
     */
    get value() {
        return undefined;
    }

    /**
     * Sets a value in the widget. Should be overridden.
     *
     * @memberof Widget
     */
    set value( value ) {}

    /**
     * Obtains the value from the original form control the widget is instantiated on.
     * This form control is often hidden by the widget.
     *
     * @readonly
     * @memberof Widget
     */
    get originalInputValue() {
        return input.getVal( this.element );
    }

    /**
     * Updates the value in the original form control the widget is instantiated on.
     * This form control is often hidden by the widget.
     *
     * @memberof Widget
     */
    set originalInputValue( value ) {
        // Avoid unnecessary change events as they could have significant negative consequences!
        // However, to add a check for this.originalInputValue !== value here would affect performance too much,
        // so we rely on widget code to only this setter when the value changes.
        input.setVal( this.element, value, null );
        this.element.dispatchEvent( event.Change() );
    }

    /** 
     * Returns its own name.
     * 
     * @readonly
     * @static
     * @memberof Widget
     */
    static get name() {
        return this.constructor.name;
    }

    /**
     * Returns true if the widget is using a list of options.
     *
     * @readonly
     * @static
     * @memberof Widget
     */
    static get list() {
        return false;
    }

    /**
     * Tests whether widget needs to be instantiated (e.g. if not to be used for touchscreens).
     * Note that the Element (used in the constructor) will be provided as parameter.
     */
    static condition() {
        return true;
    }
}

export default Widget;
