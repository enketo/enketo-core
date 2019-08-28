/**
 * @module mask
 */

import $ from 'jquery';
import { getPasteData } from './utils';
const KEYBOARD_CUT_PASTE = 'xvc';

/**
 * @static
 */
function init() {
    /*
     * These are hardcoded number input masks. The approach will be different if we
     * ever add complex user-defined input masks.
     */
    _setNumberMask( '[data-type-xml="int"]', /^(-?[0-9]+$)/, '-0123456789' );
    _setNumberMask( '[data-type-xml="decimal"]', /^(-?[0-9]+[.,]?[0-9]*$)/, '-0123456789.,' );
}

/**
 * @param {string} selector
 * @param {string} validRegex
 * @param {string} allowedChars
 */
function _setNumberMask( selector, validRegex, allowedChars ) {

    $( selector )
        .on( 'keydown', e => {
            // The "key" property is the correct standards-compliant property to use
            // but needs some corrections for non-standard-compliant IE behavior.
            if ( _isNotPrintableKey( e ) || _isKeyboardCutPaste( e ) || allowedChars.indexOf( e.key ) !== -1 ) {
                return true;
            }

            return false;
        } )
        .on( 'paste', function( e ) {
            const val = getPasteData( e );
            // HTML number input fields will trim the pasted value automatically.
            if ( val && validRegex.test( val.trim() ) ) {
                // Note that this.value will be empty if the pasted value is not a valid number (except in IE11).
                // In that case the paste action has the same result as pasting an empty value, ie
                // clearing any existing value.
                return true;
            }

            $( this ).val( '' ).trigger( 'change' );

            return false;
        } )
        /*
         * Workaround for most browsers keeping invalid numbers visible in the input without a means to access the invalid value.
         * E.g. see https://bugs.chromium.org/p/chromium/issues/detail?id=178437&can=2&q=178437&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
         *
         * A much more intelligent way to solve the problem would be to add a feedback loop from the Model to the input that would
         * correct (a converted number) or empty (an invalid number). https://github.com/enketo/enketo-core/issues/407
         */
        .on( 'blur', function() {
            // proper browsers:
            if ( typeof this.validity !== 'undefined' && typeof this.validity.badInput !== 'undefined' && this.validity.badInput ) {
                this.value = '';
            }
            // IE11 (no validity.badInput support, but does give access to invalid number with this.value)
            else if ( typeof this.validity.badInput === 'undefined' && this.value && !validRegex.test( this.value.trim() ) ) {
                this.value = '';
            }
        } );
}

// Using the (assumed) fact that a non-printable character key always has length > 1
// IE11: non-confirming 'Spacebar'
/**
 * @param {Event} e
 * @return {boolean}
 */
function _isNotPrintableKey( e ) {
    return e.key.length > 1 && e.key !== 'Spacebar';
}

/**
 * @param {Event} e
 * @return {boolean}
 */
function _isKeyboardCutPaste( e ) {
    return KEYBOARD_CUT_PASTE.indexOf( e.key ) !== -1 && ( e.metaKey || e.ctrlKey );
}

export default {
    init
};
