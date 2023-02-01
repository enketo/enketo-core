import Widget from '../../js/widget';
import events from '../../js/event';
import { getSiblingElement } from '../../js/dom-utils';

import './jquery.relevant-dropdown';

/**
 * Autocomplete select1 picker for modern browsers.
 *
 * @augments Widget
 */
class AutocompleteSelectpicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input[list]';
    }

    /**
     * @type {boolean}
     */
    static get list() {
        return true;
    }

    _init() {
        const listId = this.element.getAttribute('list');

        if (!getSiblingElement(this.element, 'datalist')) {
            const info = getSiblingElement(
                this.element.closest('.or-repeat'),
                '.or-repeat-info'
            );
            this.options = info
                ? [
                      ...info.querySelectorAll(
                          `datalist#${CSS.escape(listId)} > option`
                      ),
                  ]
                : [];
        } else {
            this.options = [
                ...this.question.querySelectorAll(
                    `datalist#${CSS.escape(listId)} > option`
                ),
            ];
        }

        // This value -> data-value change is not slow, so no need to move to enketo-xslt as that would
        // increase itemset complexity even further.
        this.options.forEach((item) => {
            const value = item.getAttribute('value');
            /**
             * We're changing the original datalist here, so have to make sure we don't do anything
             * if dataset.value is already populated.
             *
             * However, for some reason !item.dataset.value is failing in Safari, which as a result sets all dataset.value attributes to "null"
             * To workaround this, we check for the value attribute instead.
             */
            if (
                !item.classList.contains('itemset-template') &&
                item.textContent &&
                value !== undefined &&
                value !== null
            ) {
                item.dataset.value = value;
                item.setAttribute('value', item.textContent);
                item.textContent = '';
            }
        });

        const fragment = document
            .createRange()
            .createContextualFragment(
                `<input type="text" class="ignore widget autocomplete" list="${listId}" />`
            );
        this.element.classList.add('hide');
        this.element.after(fragment);

        this.fakeInput =
            this.element.parentElement.querySelector('input.autocomplete');

        if (this.props.readonly) {
            this.fakeInput.setAttribute('readonly', 'readonly');
        }
        if (this.props.disabled) {
            this.fakeInput.setAttribute('disabled', 'disabled');
        }

        this._setFakeInputListener();
        this._setFocusListener();
        this._showCurrentLabel(); // after setting fakeInputListener!
    }

    /**
     * Displays current label
     */
    _showCurrentLabel() {
        const inputValue = this.originalInputValue;
        const label = this._findLabel(inputValue);

        this.fakeInput.value = label;

        // If a corresponding label cannot be found the value is invalid,
        // and should be cleared. For this we trigger an 'input' event.
        if (inputValue && !label) {
            this.fakeInput.dispatchEvent(events.Input());
        }
    }

    /**
     * Sets fake input listener
     */
    _setFakeInputListener() {
        this.fakeInput.addEventListener('input', (e) => {
            const input = e.target;
            const label = input.value;
            const value = this._findValue(label) || '';
            if (this.originalInputValue !== value) {
                this.originalInputValue = value;
            }
            input.classList.toggle('notfound', label && !value);
        });
    }

    /**
     * @param {string} label - label value
     * @return {string} value
     */
    _findValue(label) {
        let value = '';

        if (!label) {
            return '';
        }

        this.options.forEach((option) => {
            if (option.value === label) {
                value = option.getAttribute('data-value');

                return false;
            }
        });

        return value;
    }

    /**
     * @param {string} value - option value
     * @return {string} label
     */
    _findLabel(value) {
        let label = '';

        if (!value) {
            return '';
        }

        this.options.forEach((option) => {
            if (option.dataset.value === value) {
                label = option.value;

                return false;
            }
        });

        return label;
    }

    /**
     * Handles focus listener
     */
    _setFocusListener() {
        // Handle original input focus
        this.element.addEventListener(events.ApplyFocus().type, () => {
            this.fakeInput.focus();
        });
    }

    /**
     * Disables widget
     */
    disable() {
        this.fakeInput.classList.add('disabled');
    }

    /**
     * Enables widget
     */
    enable() {
        this.fakeInput.classList.remove('disabled');
    }

    /**
     * Updates widget
     *
     * There are 3 scenarios for which method is called:
     * 1. The options change (dynamic itemset)
     * 2. The language changed. (just this._showCurrentLabel() would be more efficient)
     * 3. The value of the underlying original input changed due a calculation. (same as #2?)
     *
     * For now we just dumbly reinstantiate it (including the polyfill).
     */
    update() {
        this.element.parentElement.querySelector('.widget').remove();
        this._init();
    }
}

export default AutocompleteSelectpicker;
