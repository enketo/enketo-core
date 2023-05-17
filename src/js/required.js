/**
 * Deals with form logic around required questions.
 *
 * @module required
 */

import $ from 'jquery';

/**
 * @typedef {import('./form').Form} Form
 */

export default {
    /**
     * @type {Form}
     */
    // @ts-expect-error - this will be populated during form init, but assigning
    // its type here improves intellisense.
    form: null,

    init() {
        if (!this.form) {
            throw new Error(
                'Required module not correctly instantiated with form property.'
            );
        }

        if (!this.form.features.required) {
            this.update = () => {};
        }

        this.update();
    },

    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update(updated /* , filter */) {
        const that = this;
        // A "required" update will never result in a node value change so the expression evaluation result can be cached fairly aggressively.
        const requiredCache = {};

        const $nodes = this.form.getRelatedNodes('data-required', '', updated);

        $nodes.each(function () {
            const $input = $(this);
            const input = this;
            const requiredExpr = that.form.input.getRequired(input);
            const path = that.form.input.getName(input);
            // Minimize index determination because it is expensive.
            const index = that.form.input.getIndex(input);
            // The path is stripped of the last nodeName to record the context.
            // This might be dangerous, but until we find a bug, it improves performance a lot in those forms where one group contains
            // many sibling questions that each have the same required expression.
            const cacheIndex = `${requiredExpr}__${path.substring(
                0,
                path.lastIndexOf('/')
            )}__${index}`;

            if (typeof requiredCache[cacheIndex] === 'undefined') {
                requiredCache[cacheIndex] = that.form.model
                    .node(path, index)
                    .isRequired(requiredExpr);
            }

            $input
                .closest('.question')
                .find('.required')
                .toggleClass('hide', !requiredCache[cacheIndex]);
        });
    },
};
