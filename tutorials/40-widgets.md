### Widgets in Enketo Core

Widgets extend the [Widget class](../src/js/widget.js). This is an example:

(see full functioning example at [/src/widget/example/my-widget.js](../src/widget/example/my-widget.js)
```js
import Widget from '../../js/widget';

/*
 * Make sure to give the widget a unique widget class name and extend Widget.
 */
class MyWidget extends Widget {

    /*
     * The selector that determines on which form control the widget is instantiated.
     * Make sure that any other widgets that target the same from control are not interfering with this widget by disabling
     * the other widget or making them complementary.
     * This function is always required.
     */
    static get selector() {
        return '.or-appearance-my-widget input[type="number"]';
    }

    /*
     * Initialize the widget that has been instantiated using the Widget (super) constructor.
     * The _init function is called by that super constructor unless that constructor is overridden.
     * This function is always required.
     */
    _init() {
        // Hide the original input
        this.element.classList.add( 'hide' );

        // Create the widget's DOM fragment.
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget">
                <input class="ignore" type="range" min="0" max="100" step="1"/>
            <div>`
        );
        fragment.querySelector( '.widget' ).appendChild( this.resetButtonHtml );

        // Only when the new DOM has been fully created as a HTML fragment, we append it.
        this.element.after( fragment );

        const widget = this.element.parentElement.querySelector( '.widget' );
        this.range = widget.querySelector( 'input' );

        // Set the current loaded value into the widget
        this.value = this.originalInputValue;

        // Set event handlers for the widget
        this.range.addEventListener( 'change', this._change.bind( this ) );
        widget.querySelector( '.btn-reset' ).addEventListener( 'click', this._reset.bind( this ) );

        // This widget initializes synchronously so we don't return anything.
        // If the widget initializes asynchronously return a promise that resolves to `this`.
    }

    _reset() {
        this.value = '';
        this.originalInputValue = '';
        this.element.classList.add( 'empty' );
    }

    _change( ev ) {
        // propagate value changes to original input and make sure a change event is fired
        this.originalInputValue = ev.target.value;
        this.element.classList.remove( 'empty' );
    }

    /*
     * Disallow user input into widget by making it readonly.
     */
    disable() {
        this.range.disabled = true;
    }

    /*
     * Performs opposite action of disable() function.
     */
    enable() {
        this.range.disabled = false;
    }

    /*
     * Update the language, list of options and value of the widget.
     */
    update() {
        this.value = this.originalInputValue;
    }

    /*
     * Obtain the current value from the widget. Usually required.
     */
    get value() {
        return this.element.classList.contains( 'empty' ) ? '' : this.range.value;
    }

    /*
     * Set a value in the widget. Usually required.
     */
    set value( value ) {
        this.range.value = value;
    }

}

export default MyWidget;
```

Some of the tests are common to all widgets, and can be run with a few lines:

(see full functioning example at [/test/spec/widget.example.spec.js](../test/spec/widget.example.spec.js))
```js
import ExampleWidget from '../../src/widget/example/my-widget';
import { runAllCommonWidgetTests } from '../helpers/testWidget';

const FORM =
    `<label class="question or-appearance-my-widget">
        <input type="number" name="/data/node">
    </label>`;
const VALUE = '2';

runAllCommonWidgetTests( ExampleWidget, FORM, VALUE );
```

### DO

* use the rank widget as a more complex example that uses the best practices (some other widgets use an older style)
* add an `_init` function to your widget that either returns nothing or a Promise (if it initializes asynchronously)
* include a widget.my-widget.spec.js file in the /test folder
* run at least the standardized common widget tests by doing: TBD
* make the widget responsive up to a minimum window width of 320px
* ensure the widget's scss and js file is/are loaded in widgets.js and _widgets.scss respectively
* if hiding the original input element, it needs to load the default value `this.originalInputValue` into the widget
* if hiding the original input element, keep its value  syncronized using `this.originalInputValue = ...`
* if hiding the original input element, it needs to listen for the `applyfocus` event on the original input and focus the widget
* if hiding the original input element, the widget value needs to update when the original input updates due to a calculation or becoming non-relevant (update)
* apply the `widget` css class to the top level elements it adds to the DOM (but not to their children)
* new input/select/textarea elements inside widgets should have the `ignore` class to isolate them from the Enketo form engine
* include `enable()`, `disable()` and `update()` method overrides. See the Widget class.
* if the widget needs tweaks or needs to be disabled for mobile use, use support.js to detect this and override the static `condition()` function in Widget.js.
* allow clearing of the original input (i.e. setting value to '')
* if the widget does not get automatic (built-in HTML) focus, trigger a `fakefocus` event to the original input when the widget gets focus (rarely required, but see rank widget)

#### DON'T

* do not include jQuery, React, Vue or any other general purpose libraries or frameworks
