// @ts-check

/**
 * @typedef {import('../form').Form} Form
 */

/**
 * @param {HTMLFormElement} formElement
 */
export const detectFeatures = (formElement) => {
    const action = formElement.querySelector('.action') != null;
    const calculate =
        action || formElement.querySelector('[data-calculate]') != null;
    const instanceFirstLoadAction =
        action && formElement.querySelector('.odk-instance-first-load') != null;
    const itemset = formElement.querySelector('.itemset-template') != null;
    const newRepeatAction =
        action && formElement.querySelector('.odk-new-repeat') != null;
    const output = formElement.querySelector('.or-output') != null;
    const pagination = formElement.classList.contains('pages');
    const relevant = formElement.querySelector('[data-relevant]') != null;
    const repeat = formElement.querySelector('.or-repeat') != null;
    const repeatClone =
        repeat && formElement.querySelector('.or-repeat.clone') != null;
    const repeatCount =
        repeat &&
        formElement.querySelector('.or-repeat-info[data-repeat-count]') != null;
    const required = formElement.querySelector('[data-required]') != null;
    const valueChangedAction =
        formElement.querySelector('.xforms-value-changed') != null;

    return {
        action,
        calculate,
        instanceFirstLoadAction,
        itemset,
        newRepeatAction,
        output,
        pagination,
        relevant,

        /**
         * This will be updated in repeat.js as repeats are added/removed.
         */
        repeatClone,

        repeatCount,
        repeat,
        required,
        valueChangedAction,
    };
};
