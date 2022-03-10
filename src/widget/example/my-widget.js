import Widget from '../../js/widget';

/**
 * An example widget.
 *
 * Make sure to give the widget a unique widget class name and extend Widget.
 */
class MyWidget extends Widget {
    /**
     * The selector that determines on which form control the widget is instantiated.
     * Make sure that any other widgets that target the same from control are not interfering with this widget by disabling
     * the other widget or making them complementary.
     * This function is always required.
     */
    static get selector() {
        return '.or-appearance-my-widget input[type="number"]';
    }

    /**
     * Initialize the widget that has been instantiated using the Widget (super) constructor.
     * The _init function is called by that super constructor unless that constructor is overridden.
     * This function is always required.
     */
    _init() {
        // Hide the original input
        this.element.classList.add('hide');

        // Create the widget's DOM fragment.
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget">
                <input class="ignore" type="range" min="0" max="100" step="1"/>
            </div>`
        );
        fragment.querySelector('.widget').appendChild(this.resetButtonHtml);

        // Only when the new DOM has been fully created as a HTML fragment, we append it.
        this.element.after(fragment);

        const widget = this.element.parentElement.querySelector('.widget');
        this.range = widget.querySelector('input');

        // Set the current loaded value into the widget
        this.value = this.originalInputValue;

        // Set event handlers for the widget
        this.range.addEventListener('change', this._change.bind(this));
        widget
            .querySelector('.btn-reset')
            .addEventListener('click', this._reset.bind(this));

        // This widget initializes synchronously so we don't return anything.
        // If the widget initializes asynchronously return a promise that resolves to `this`.
    }

    _reset() {
        this.value = '';
        this.originalInputValue = '';
        this.element.classList.add('empty');
    }

    _change(ev) {
        // propagate value changes to original input and make sure a change event is fired
        this.originalInputValue = ev.target.value;
        this.element.classList.remove('empty');
    }

    /**
     * Disallow user input into widget by making it readonly.
     */
    disable() {
        this.range.disabled = true;
    }

    /**
     * Performs opposite action of disable() function.
     */
    enable() {
        this.range.disabled = false;
    }

    /**
     * Update the language, list of options and value of the widget.
     */
    update() {
        this.value = this.originalInputValue;
    }

    /**
     * Obtain the current value from the widget. Usually required.
     *
     * @type {*}
     */
    get value() {
        return this.element.classList.contains('empty') ? '' : this.range.value;
    }

    /**
     * Set a value in the widget. Usually required.
     *
     * @param {*} value - value to set
     */
    set value(value) {
        this.range.value = value;
    }
}

export default MyWidget;
