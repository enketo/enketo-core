/**
 * Progress module.
 *
 * @module progress
 */

import events from './event';

/**
 * Maintains progress state of user traversing through form, using
 * currently focused input or the last changed input as the indicator for the current location.
 */
export default {
    /**
     * @type {number}
     */
    status: 0,
    /**
     * @type {Element}
     */
    lastChanged: null,
    /**
     * @type {Array<Element>}
     */
    all: null,
    /**
     * Updates total
     */
    updateTotal() {
        this.all = [
            ...this.form.view.html.querySelectorAll(
                '.question:not(.disabled):not(.or-appearance-comment):not(.or-appearance-dn):not(.readonly)'
            ),
        ].filter((question) => !question.closest('.disabled'));
    },

    isUpdateScheduled: false,

    /** @type {HTMLElement | null} */
    scheduledUpdateElement: null,

    /**
     * Updates rounded % value of progress and triggers event if changed.
     *
     * @param {Element} el - the element that represent the current state of progress
     */
    update(el, isScheduledCall = false) {
        this.scheduledUpdateElement = el;

        if (!isScheduledCall) {
            if (!this.isUpdateScheduled) {
                this.isUpdateScheduled = true;

                queueMicrotask(() => {
                    this.update(this.scheduledUpdateElement, true);
                    this.isUpdateScheduled = false;
                    this.scheduledUpdateElement = null;
                });
            }

            return;
        }

        let status;

        if (!this.all || !el) {
            this.updateTotal();
        }

        this.lastChanged = el || this.lastChanged;
        if (this.lastChanged) {
            status = Math.round(
                ((this.all.indexOf(this.lastChanged.closest('.question')) + 1) *
                    100) /
                    this.all.length
            );
        }

        // if the current el was removed (inside removed repeat), the status will be 0 - leave unchanged
        if (status > 0 && status !== this.status) {
            this.status = status;
            this.form.view.html.dispatchEvent(events.ProgressUpdate(status));
        }
    },
    /**
     * @return {string} status
     */
    get() {
        return this.status;
    },
};
