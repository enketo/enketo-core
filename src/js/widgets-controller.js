/**
 * @module widgets-controller
 */

import $ from 'jquery';
import _widgets from 'enketo/widgets';
import { elementDataStore as data } from './dom-utils';
import events from './event';

/**
 * @typedef {import('./widget').WidgetClass} WidgetClass
 */

/** @type {WidgetClass[]} */
let widgets = _widgets.filter((widget) => widget.selector);

let options;

/** @type {import('./form').Form} */
let form;

/** @type {HTMLFormElement} */
let formElement;

/**
 * @param {HTMLFormElement} formElement
 */
const initForm = (formElement) => {
    widgets = _widgets.filter(
        (widget) =>
            widget.selector &&
            (widget.selector === 'form' ||
                formElement.querySelector(widget.selector) != null)
    );
};

/**
 * Initializes widgets
 *
 * @static
 * @param {jQuery} $group - The element inside which the widgets have to be initialized.
 * @param {*} [opts] - Options (e.g. helper function of Form.js passed)
 * @return {boolean} `true` when initialized successfuly
 */
function init($group, opts = {}) {
    if (!this.form) {
        throw new Error(
            'Widgets module not correctly instantiated with form property.'
        );
    }

    options = opts;
    form = this.form;
    formElement = this.form.view.html; // not sure why this is only available in init

    const group = $group && $group.length ? $group[0] : formElement;

    widgets.forEach((Widget) => {
        _instantiate(Widget, group);
    });

    return true;
}

/**
 * Enables widgets if they weren't enabled already if they are not readonly.
 * In most widgets, this function will do nothing because the disabled attribute was automatically removed from all
 * fieldsets, inputs, textareas and selects inside the branch element provided as parameter.
 * Note that this function can be called before the widgets have been initialized and will in that case do nothing. This is
 * actually preferable than waiting for create() to complete, because enable() will never do anything that isn't
 * done during create().
 *
 * @static
 * @param {HTMLElement} group - HTML element
 */
function enable(group) {
    widgets.forEach((Widget) => {
        const els = _getElements(group, Widget.selector).filter((el) =>
            el.nodeName.toLowerCase() === 'select'
                ? !el.hasAttribute('readonly')
                : !el.readOnly
        );
        new Collection(els).enable(Widget);
    });
}

/**
 * Disables  widgets, if they aren't disabled already when the branch was disabled by the controller.
 * In most widgets, this function will do nothing because all fieldsets, inputs, textareas and selects will get
 * the disabled attribute automatically when the branch element provided as parameter becomes non-relevant.
 *
 * @static
 * @param {HTMLElement} group - The element inside which all widgets need to be disabled.
 */
function disable(group) {
    widgets.forEach((Widget) => {
        const els = _getElements(group, Widget.selector);

        new Collection(els).disable(Widget);
    });
}

/**
 * Returns the elements on which to apply the widget
 *
 * @param {HTMLElement} group - A jQuery-wrapped element
 * @param {string|null} selector - If the selector is `null`, the form element will be returned
 * @return {HTMLElement[]} A jQuery collection
 */
function _getElements(group, selector) {
    if (selector) {
        if (selector === 'form') {
            return [formElement];
        }
        // e.g. if the widget selector starts at .question level (e.g. ".or-appearance-draw input")
        if (group.classList.contains('question')) {
            return [
                ...group.querySelectorAll(
                    'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
                ),
            ].filter((el) => el.matches(selector));
        }

        return [...group.querySelectorAll(selector)];
    }

    return [];
}

/**
 * Instantiate a widget on a group (whole form or newly cloned repeat)
 *
 * @param {typeof import('./widget').default} Widget
 * @param {Element} group - The element inside which widgets need to be created.
 */
function _instantiate(Widget, group) {
    const opts = {};

    if (!Widget.name) {
        return console.error("widget doesn't have a name");
    }

    if (Widget.helpersRequired && Widget.helpersRequired.length > 0) {
        opts.helpers = {};
        Widget.helpersRequired.forEach((helper) => {
            opts.helpers[helper] = options[helper];
        });
    }

    const elements = _getElements(group, Widget.selector);

    if (group === formElement) {
        Widget.globalInit(form, formElement);
    }

    if (!elements.length) {
        return;
    }

    new Collection(elements).instantiate(Widget, opts);

    _setLangChangeListener(Widget, elements);
    _setOptionChangeListener(Widget, elements);
    _setValChangeListener(Widget, elements);
}

const reset = () => {
    widgets.forEach((Widget) => {
        Widget.globalReset?.();
    });

    widgets = [..._widgets];
};

/** @type {Map<typeof Widget, Set<HTMLElement>>} */
const languageChangeUpdates = new Map();

let didSetLanguageChangeListener = false;

/**
 * Calls widget('update') when the language changes. This function is called upon initialization,
 * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
 * the elements of the repeat, there should be no duplicate eventhandlers.
 *
 * @param {{name: string}} Widget - The widget configuration object
 * @param {Array<Element>} els - Array of elements that the widget has been instantiated on.
 */
function _setLangChangeListener(Widget, els) {
    // call update for all widgets when language changes
    if (els.length > 0) {
        let all = languageChangeUpdates.get(Widget);

        if (all == null) {
            all = new Set();
            languageChangeUpdates.set(Widget, all);
        }

        els.forEach((el) => {
            all.add(el);
        });

        if (!didSetLanguageChangeListener) {
            formElement.addEventListener(events.ChangeLanguage().type, () => {
                for (const [Widget, els] of languageChangeUpdates) {
                    new Collection([...els]).update(Widget);
                }
            });

            didSetLanguageChangeListener = true;
        }
    }
}

/**
 * Calls widget('update') on select-type widgets when the options change. This function is called upon initialization,
 * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
 * the elements of the repeat, there should be no duplicate eventhandlers.
 *
 * @param {{name: string}} Widget - The widget configuration object
 * @param {Array<Element>} els - The array of elements that the widget has been instantiated on.
 */
function _setOptionChangeListener(Widget, els) {
    if (els.length > 0 && Widget.list) {
        $(els).on(events.ChangeOption().type, function () {
            // update (itemselect) picker on which event was triggered because the options changed
            new Collection(this).update(Widget);
        });
    }
}

/**
 * Calls widget('update') if the form input/select/textarea value changes due to an action outside
 * of the widget (e.g. a calculation).
 *
 * @param {{name: string}} Widget - The widget configuration object.
 * @param {Array<Element>} els - The array of elements that the widget has been instantiated on.
 */
function _setValChangeListener(Widget, els) {
    // avoid adding eventhandlers on widgets that apply to the <form> or <label> element
    if (els.length > 0 && els[0].matches('input, select, textarea')) {
        els.forEach((el) =>
            el.addEventListener(events.InputUpdate().type, (event) => {
                new Collection(event.target).update(Widget);
            })
        );
    }
}

class Collection {
    /**
     * @class
     * @param {Array<Element>} elements - HTML elements
     */
    constructor(elements) {
        if (!Array.isArray(elements)) {
            elements = [elements];
        }
        this.elements = elements;
    }

    /**
     * @param {Element} element - HTML element
     * @param {object} Widget - widget to instantiate
     * @param {object} [options] - widget options
     */
    _instantiateSingleWidget(element, Widget, options = {}) {
        if (!Widget.condition(element)) {
            return;
        }
        if (data.has(element, Widget)) {
            return;
        }
        const w = new Widget(element, options);
        if (w instanceof Promise) {
            w.then((wr) => data.put(element, Widget.name, wr));
        } else {
            data.put(element, Widget.name, w);
        }
    }

    /**
     * @param {object} Widget - widget to instantiate
     * @param {Function} method - widget function to call
     */
    _methodCall(Widget, method) {
        this.elements.forEach((element) => {
            const w = data.get(element, Widget.name);
            if (w) {
                w[method]();
            }
        });
    }

    /**
     * @param {object} Widget - widget to instantiate
     * @param {object} [options] - widget options
     */
    instantiate(Widget, options) {
        this.elements.forEach((el) =>
            this._instantiateSingleWidget(el, Widget, options)
        );
    }

    /**
     * @param {object} Widget - widget to instantiate
     */
    update(Widget) {
        this._methodCall(Widget, 'update');
    }

    /**
     * @param {object} Widget - widget to instantiate
     */
    disable(Widget) {
        this._methodCall(Widget, 'disable');
    }

    /**
     * @param {object} Widget - The widget to instantiate
     */
    enable(Widget) {
        this._methodCall(Widget, 'enable');
    }
}

export default {
    initForm,
    init,
    enable,
    disable,
    reset,
};
