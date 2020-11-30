/**
 * @module format
 */

let _locale = navigator.language;
const NUMBER = '0-9\u0660-\u0669';
const TIME_PART = `[:${NUMBER}]+`;
const MERIDIAN_PART = `[^: ${NUMBER}]+`;
const HAS_MERIDIAN = new RegExp( `^(${TIME_PART} ?(${MERIDIAN_PART}))|((${MERIDIAN_PART}) ?${TIME_PART})$` );

/**
 * Transforms time to a cleaned-up localized time.
 *
 * @param {Date} dt - date object
 * @return {string} cleaned-up localized time
 */
function _getCleanLocalTime( dt ) {
    dt = typeof dt == 'undefined' ? new Date() : dt;

    return _cleanSpecialChars( dt.toLocaleTimeString( _locale ) );
}

/**
 * Remove unneeded and problematic special characters in (date)time string.
 *
 * @param {string} timeStr - (date)time string to clean up
 * @return {string} transformed (date)time string with removed unneeded special characters that cause issues
 */
function _cleanSpecialChars( timeStr ) {
    return timeStr.replace( /[\u200E\u200F]/g, '' );
}

/**
 * @namespace time
 */
const time = {
    // For now we just look at a subset of numbers in Arabic and Latin. There are actually over 20 number scripts and :digit: doesn't work in browsers
    /**
     * @type {string}
     */
    get hour12() {
        return this.hasMeridian( _getCleanLocalTime() );
    },
    /**
     * @type {string}
     */
    get pmNotation() {
        return this.meridianNotation( new Date( 2000, 1, 1, 23, 0, 0 ) );
    },
    /**
     * @type {string}
     */
    get amNotation() {
        return this.meridianNotation( new Date( 2000, 1, 1, 1, 0, 0 ) );
    },
    /**
     * @type {Function}
     * @param {Date} dt - datetime string
     */
    meridianNotation( dt ) {
        let matches = _getCleanLocalTime( dt ).match( HAS_MERIDIAN );
        if ( matches && matches.length ) {
            matches = matches.filter( item => !!item );

            return matches[ matches.length - 1 ].trim();
        }

        return null;
    },
    /**
     * Whether time string has meridian parts
     *
     * @type {Function}
     * @param {string} time - Time string
     */
    hasMeridian( time ) {
        return HAS_MERIDIAN.test( _cleanSpecialChars( time ) );
    }
};

/**
 * @namespace format
 */
const format = {
    /**
     * @type {string}
     */
    set locale( loc ) {
        _locale = loc;
    },
    get locale() {
        return _locale;
    }
};

export { format, time };
