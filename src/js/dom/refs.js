// @ts-check

/**
 * @typedef {import('../form').Form} Form
 */

/**
 * Sets convenience classes and related annotations on DOM elements with model
 * references, to optimize:
 *
 * - identifying action references (and their event types) and distinguish them
 *   from non-action references
 * - identifying controls and their pertinent container elements by their
 *   reference
 *
 * These annotations allow simplification of many DOM lookups, and in many cases
 * allow formerly dynamic queries to be static.
 *
 * @param {Form} form
 */
export const setRefTypeClasses = (form) => {
    const rootElement = form.view.html;

    const hasActions =
        rootElement.querySelector('[data-setvalue], [data-setgeopoint]') !=
        null;

    const selector = hasActions
        ? '[name], [data-name], [data-setvalue], [data-setgeopoint]'
        : '.question [name], .question [data-name]';

    const elements = /** @type {NodeListOf<HTMLElement>} */ (
        rootElement.querySelectorAll(selector)
    );

    const eventTypes = [
        'odk-instance-first-load',
        'odk-new-repeat',
        'xforms-value-changed',
    ];

    const nonEventClasses = eventTypes.map((event) => `non-${event}`);

    /** @type {string[]} */
    let classes = [];

    for (const element of elements) {
        if (hasActions) {
            const isAction =
                element.dataset.setvalue != null ||
                element.dataset.setgeopoint != null;
            const isFormControlAction =
                isAction && element.closest('.question') != null;
            const actionClasses = [
                isAction ? 'action' : 'non-action',
                isFormControlAction
                    ? 'form-control-action'
                    : 'non-form-control-action',
            ];
            const elementEvents = isAction
                ? element.dataset.event?.trim()?.split(/\s+/) ?? []
                : [];
            const eventClasses = isAction
                ? eventTypes.map((event, index) =>
                      elementEvents.includes(event)
                          ? event
                          : nonEventClasses[index]
                  )
                : nonEventClasses;

            classes = [...actionClasses, ...eventClasses];

            element.classList.add(...classes);
        }

        if (
            !hasActions ||
            !element.matches(
                '.or-group, .or-group-data, .or-repeat, .or-repeat-info, .question [data-event="xforms-value-changed"]'
            )
        ) {
            const ref = element.dataset.name ?? element.getAttribute('name');

            if (ref == null) {
                return;
            }

            const container = /** @type {HTMLElement} */ (
                element.closest('.itemset-template') ??
                    // @ts-ignore
                    form.input.getWrapNode(element)
            );

            element.classList.add('ref-target');
            container.classList.add('contains-ref-target');
            container.dataset.containsRefTarget = ref;
            element.dataset.ref = ref;
        }
    }
};
