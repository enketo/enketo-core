/**
 * @module readonly
 */

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

    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update(updated) {
        const nodes = this.form.getRelatedNodes('readonly', '', updated).get();

        const { valueChanged } = this.form.collections.actions;

        nodes.forEach((node) => {
            node.closest('.question').classList.add('readonly');

            const path = this.form.input.getName(node);
            const action = valueChanged?.hasRef(path);

            // Note: the readonly-forced class is added for special readonly views of a form.
            const empty =
                !node.value &&
                !node.dataset.calculate &&
                !action &&
                !node.classList.contains('readonly-forced');

            node.classList.toggle('empty', empty);

            if (empty) {
                node.setAttribute('aria-hidden', 'true');
            } else {
                node.removeAttribute('aria-hidden');
            }
        });
    },
};
