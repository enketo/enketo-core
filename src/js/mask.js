/**
 * @module mask
 */

import { getPasteData } from './utils';
const KEYBOARD_CUT_PASTE = 'xvc';

export default {

    init() {
    /*
     * These are hardcoded number input masks. The approach will be different if we
     * ever add complex user-defined input masks.
     */
        this._setNumberMask( '[data-type-xml="int"]', /^(-?[0-9]+$)/, '-0123456789' );
        this._setNumberMask( '[data-type-xml="decimal"]', /^(-?[0-9]+[.,]?[0-9]*$)/, '-0123456789.,' );
    },

    /**
     * @param {string} selector - selector of elements to apply mask to
     * @param {string} validRegex - regular expression for valid values
     * @param {string} allowedChars - string of allowed characters
     */
    _setNumberMask( selector, validRegex, allowedChars ) {
        const form = this.form.view.html;

        form.addEventListener( 'keydown', event => {
            if ( event.target.matches( selector ) ){
            // The "key" property is the correct standards-compliant property to use
            // but needs some corrections for non-standard-compliant IE behavior.
                if ( this._isNotPrintableKey( event ) || this._isKeyboardCutPaste( event ) || allowedChars.indexOf( event.key ) !== -1 ) {
                    return true;
                }
                event.preventDefault();
                event.stopPropagation();
            }

        } );

        form.addEventListener( 'paste', event => {
            if ( event.target.matches( selector ) ){
                const val = getPasteData( event );
                // HTML number input fields will trim the pasted value automatically.
                if ( val && validRegex.test( val.trim() ) ) {
                // Note that event.target.value will be empty if the pasted value is not a valid number (except in IE11).
                // In that case the paste action has the same result as pasting an empty value, ie
                // clearing any existing value.
                    return true;
                }

                event.target.value =  '';
                event.target.dispatchEvent( new Event( 'change' ) );

                event.preventDefault();
                event.stopPropagation();
            }

        } );
        /*
     * Workaround for most browsers keeping invalid numbers visible in the input without a means to access the invalid value.
     * E.g. see https://bugs.chromium.org/p/chromium/issues/detail?id=178437&can=2&q=178437&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
     *
     * A much more intelligent way to solve the problem would be to add a feedback loop from the Model to the input that would
     * correct (a converted number) or empty (an invalid number). https://github.com/enketo/enketo-core/issues/407
     */
        form.addEventListener( 'blur', event => {
            if ( event.target.matches( selector ) ){
            // proper browsers:
                if ( typeof event.target.validity !== 'undefined' && typeof event.target.validity.badInput !== 'undefined' && event.target.validity.badInput ) {
                    event.target.value = '';
                }
                // IE11 (no validity.badInput support, but does give access to invalid number with event.target.value)
                else if ( typeof event.target.validity.badInput === 'undefined' && event.target.value && !validRegex.test( event.target.value.trim() ) ) {
                    event.target.value = '';
                }
            }
        } );

    },

    // Using the (assumed) fact that a non-printable character key always has length > 1
    // IE11: non-confirming 'Spacebar'
    /**
     * @param {Event} e - event
     * @return {boolean} whether key is printable
     */
    _isNotPrintableKey( e ) {
        return e.key.length > 1 && e.key !== 'Spacebar';
    },

    /**
     * @param {Event} e - event
     * @return {boolean} whether event is a paste event
     */
    _isKeyboardCutPaste( e ) {
        return KEYBOARD_CUT_PASTE.indexOf( e.key ) !== -1 && ( e.metaKey || e.ctrlKey );
    }

};
