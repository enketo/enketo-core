/**
 * @module event
 */
// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.

/**
 * Data update event
 *
 * @param detail
 * @return {CustomEvent}
 */
function DataUpdate( detail ) {
    return new CustomEvent( 'dataupdate', { detail } );
}

/**
 * Fake focus event.
 *
 * @return {CustomEvent}
 */
function FakeFocus() {
    return new CustomEvent( 'fakefocus', { bubbles: true } );
}

/**
 * Apply focus event.
 *
 * @return {CustomEvent}
 */
function ApplyFocus() {
    return new CustomEvent( 'applyfocus' );
}

/**
 * Page flip event.
 *
 * @return {CustomEvent}
 */
function PageFlip() {
    return new CustomEvent( 'pageflip', { bubbles: true } );
}

/**
 * Removed event.
 *
 * @param detail
 * @return {CustomEvent}
 */
function Removed( detail ) {
    return new CustomEvent( 'removed', { detail, bubbles: true } );
}

/**
 * Add repeat event.
 *
 * @param detail
 * @return {CustomEvent}
 */
function AddRepeat( detail ) {
    return new CustomEvent( 'addrepeat', { detail, bubbles: true } );
}

/**
 * Remove repeat event.
 *
 * @return {CustomEvent}
 */
function RemoveRepeat() {
    return new CustomEvent( 'removerepeat', { bubbles: true } );
}

/**
 * Change language event.
 *
 * @return {CustomEvent}
 */
function ChangeLanguage() {
    return new CustomEvent( 'changelanguage', { bubbles: true } );
}

/**
 * Change event.
 *
 * @return {Event}
 */
function Change() {
    return new Event( 'change', { bubbles: true } );
}

/**
 * Input event.
 *
 * @return {Event}
 */
function Input() {
    return new Event( 'input', { bubbles: true } );
}

/**
 * Input update event
 *
 * @return {CustomEvent}
 */
function InputUpdate() {
    return new CustomEvent( 'inputupdate', { bubbles: true } );
}

/**
 * Edited event.
 *
 * @return {CustomEvent}
 */
function Edited() {
    return new CustomEvent( 'edited', { bubbles: true } );
}

/**
 * Validation complete event.
 *
 * @return {CustomEvent}
 */
function ValidationComplete() {
    return new CustomEvent( 'validationcomplete', { bubbles: true } );
}

/**
 * Invalidated event.
 *
 * @return {CustomEvent}
 */
function Invalidated() {
    return new CustomEvent( 'invalidated', { bubbles: true } );
}

/**
 * Progress update event
 *
 * @param detail
 * @return {CustomEvent}
 */
function ProgressUpdate( detail ) {
    return new CustomEvent( 'progressupdate', { detail, bubbles: true } );
}

/**
 * Go to hidden event.
 *
 * @return {CustomEvent}
 */
function GoToHidden() {
    return new CustomEvent( 'gotohidden', { bubbles: true } );
}

export default {
    DataUpdate,
    FakeFocus,
    ApplyFocus,
    PageFlip,
    Removed,
    AddRepeat,
    RemoveRepeat,
    ChangeLanguage,
    Change,
    Input,
    InputUpdate,
    Edited,
    ValidationComplete,
    Invalidated,
    ProgressUpdate,
    GoToHidden
};
