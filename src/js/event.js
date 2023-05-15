/**
 * @module event
 */
// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.

/**
 * Data update event.
 *
 * @static
 * @param {*} detail - Data to be passed with event
 * @return {CustomEvent} Custom "dataupdate" event
 */
function DataUpdate(detail) {
    return new CustomEvent('dataupdate', { detail });
}

/**
 * Fake focus event.
 *
 * @return {CustomEvent} Custom "fakefocus" event (bubbling)
 */
function FakeFocus() {
    return new CustomEvent('fakefocus', { bubbles: true });
}

/**
 * Apply focus event.
 *
 * @return {CustomEvent} Custom "applyfocus" event
 */
function ApplyFocus() {
    return new CustomEvent('applyfocus');
}

/**
 * Page flip event.
 *
 * @return {CustomEvent} Custom "pageflip" event (bubbling)
 */
function PageFlip() {
    return new CustomEvent('pageflip', { bubbles: true });
}

/**
 * Removed event.
 *
 * @param {*} detail - Data to be passed with event
 * @return {CustomEvent} Custom "removed" event (bubbling)
 */
function Removed(detail) {
    return new CustomEvent('removed', { detail, bubbles: true });
}

/**
 * The odk-instance-first-load event as defined in the ODK XForms spec.
 *
 * @see https://getodk.github.io/xforms-spec/#event:odk-instance-first-load
 *@return {CustomEvent} Custom "odk-instance-first-load" event (bubbling)
 */
function InstanceFirstLoad() {
    return new CustomEvent('odk-instance-first-load', { bubbles: true });
}

/**
 * The odk-new-repeat event as defined in the ODK XForms spec.
 *
 * @see https://getodk.github.io/xforms-spec/#event:odk-new-repeat
 * @param {{repeatPath: string, repeatIndex: number, trigger: string}} detail - Data to be passed with event.
 * @return {CustomEvent} Custom "odk-new-repeat" event (bubbling)
 */
function NewRepeat(detail) {
    return new CustomEvent('odk-new-repeat', { detail, bubbles: true });
}

/**
 * @typedef {'magic' | 'user' | 'count' | 'model'} AddRepeatTrigger
 */

/**
 * @typedef AddRepeatDetail
 * @property {string} repeatPath
 * @property {number} repeatIndex
 * @property {AddRepeatTrigger} trigger
 */

/**
 * The addrepeat event is similar but fired under different circumstances.
 *
 * @param {AddRepeatDetail} [detail] - Data to be passed with event.
 * @return {CustomEvent<AddRepeatDetail> & { type: 'addrepeat' }} Custom "odk-new-repeat" event (bubbling)
 */
function AddRepeat(detail = {}) {
    return new CustomEvent('addrepeat', { detail, bubbles: true });
}

/**
 * @typedef InitRemoveRepeatDetail
 * @property {object} [initRepeatInfo]
 * @property {string} [initRepeatInfo.repeatPath]
 * @property {number} [initRepeatInfo.repeatIndex]
 */

/**
 * @typedef PostInitRemoveRepeatDetail
 * @property {object} [initRepeatInfo]
 * @property {string} [initRepeatInfo.repeatPath]
 * @property {number} [initRepeatInfo.repeatIndex]
 */

/**
 * @typedef {InitRemoveRepeatDetail | PostInitRemoveRepeatDetail} RemoveRepeatDetail
 */

/**
 * Remove repeat event.
 *
 * @param {RemoveRepeatDetail} [detail]
 * @return {CustomEvent<RemoveRepeatDetail> & { type: 'removerepeat' }} Custom "removerepeat" event (bubbling)
 */
function RemoveRepeat(detail) {
    return new CustomEvent('removerepeat', { detail, bubbles: true });
}

/**
 * Change language event.
 *
 * @return {CustomEvent} Custom "changelanguage" event (bubbling)
 */
function ChangeLanguage() {
    return new CustomEvent('changelanguage', { bubbles: true });
}

/**
 * Change event.
 *
 * @return {Event} The regular HTML "change" event (bubbling)
 */
function Change() {
    return new Event('change', { bubbles: true });
}

/**
 * Xforms-value-changed event as defined in the ODK XForms spec.
 *
 * @see https://getodk.github.io/xforms-spec/#event:xforms-value-changed
 * @param {{repeatIndex: number}} detail - Data to be passed with event.
 * @return {CustomEvent} Custom "xforms-value-changed" event (bubbling).
 */
function XFormsValueChanged(detail) {
    return new CustomEvent('xforms-value-changed', { detail, bubbles: true });
}

/**
 * Input event.
 *
 * @return {Event} "input" event (bubbling)
 */
function Input() {
    return new Event('input', { bubbles: true });
}

/**
 * Input update event which fires when a form control value is updated programmatically.
 *
 * @return {CustomEvent} Custom "inputupdate" event (bubbling)
 */
function InputUpdate() {
    return new CustomEvent('inputupdate', { bubbles: true });
}

/**
 * Edited event.
 *
 * @return {CustomEvent} Custom "edited" event (bubbling)
 */
function Edited() {
    return new CustomEvent('edited', { bubbles: true });
}

/**
 * Before save event.
 *
 * @return {CustomEvent} Custom "edited" event (bubbling)
 */
function BeforeSave() {
    return new CustomEvent('before-save', { bubbles: true });
}

/**
 * Validation complete event.
 *
 * @return {CustomEvent} Custom "validationcomplete" event (bubbling)
 */
function ValidationComplete() {
    return new CustomEvent('validation-complete', { bubbles: true });
}

/**
 * Invalidated event.
 *
 * @return {CustomEvent} Custom "invalidated" event (bubbling)
 */
function Invalidated() {
    return new CustomEvent('invalidated', { bubbles: true });
}

/**
 * Progress update event.
 *
 * @param {*} detail - Data to be passed with event
 * @return {CustomEvent} Custom "progressupdate" event (bubbling)
 */
function ProgressUpdate(detail) {
    return new CustomEvent('progress-update', { detail, bubbles: true });
}

/**
 * Go to hidden event fired when the goto target is not relevant.
 *
 * @return {CustomEvent} Custom "gotoirrelevant" event (bubbling)
 */
function GoToIrrelevant() {
    return new CustomEvent('goto-irrelevant', { bubbles: true });
}

/**
 * Go to invisible event fired when the target has no form control.
 * This is event has prevalence of the "go to hidden" event.
 *
 * @return {CustomEvent} Custom "gotoinvisible" event (bubbling)
 */
function GoToInvisible() {
    return new CustomEvent('goto-invisible', { bubbles: true });
}

function ChangeOption() {
    return new CustomEvent('change-option', { bubbles: true });
}

/**
 * Go to printify text event.
 *
 * @return {CustomEvent} Custom "printify" event (bubbling)
 */
function Printify() {
    return new CustomEvent('printify', { bubbles: true });
}

/**
 * Go to deprintify text event.
 *
 * @return {CustomEvent} Custom "deprintify" event (bubbling)
 */
function DePrintify() {
    return new CustomEvent('deprintify', { bubbles: true });
}

function UpdateMaxSize() {
    return new CustomEvent('update-max-size', { bubbles: true });
}

export default {
    DataUpdate,
    FakeFocus,
    ApplyFocus,
    PageFlip,
    Removed,
    InstanceFirstLoad,
    NewRepeat,
    AddRepeat,
    RemoveRepeat,
    ChangeLanguage,
    Change,
    Input,
    InputUpdate,
    Edited,
    BeforeSave,
    ValidationComplete,
    Invalidated,
    ProgressUpdate,
    GoToIrrelevant,
    GoToInvisible,
    XFormsValueChanged,
    ChangeOption,
    Printify,
    DePrintify,
    UpdateMaxSize,
};
