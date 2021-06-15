/**
 * @module date
 * @description Provides helper functions for working with Dates
 * @see {@link https://github.com/enketo/openrosa-xpath-evaluator/blob/02bb3c301e1c584db87ffdf736a65ea3d630f8e3/src/date-extensions.js}
 * @see {@link https://github.com/enketo/enketo-xpathjs/blob/e6f6d3d1395e41066b7d0c142a8b5fbb5a0e8098/src/date-extensions.js}
 *
 * Note: this module was introduced to address this comment in
 * `enketo/openrosa-xpath-evaluator`:
 *
 * ```js
 * // TODO probably shouldn't be changing Date.prototype
 * ```
 *
 * The logic was copied from `enketo/enketo-xpathjs` as that appeared to be the
 * source of truth, then adapted to:
 *
 * - Accept a `Date` parameter rather than monkeypatching `Date.prototype`.
 * - Conform to local ESLint rules/consisten local formatting
 */

/**
 * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
 * used in ODK, so it replaces the Z in the ISOstring with a local offset
 *
 * @param {Date} date
 * @return {string} a datetime string formatted according to RC3339 with local offset
 */
export const toISOLocalString = ( date ) => {
    //2012-09-05T12:57:00.000-04:00 (ODK)

    if ( date.toString() === 'Invalid Date' ) {
        return date.toString();
    }

    const dt = new Date( date.getTime() - ( date.getTimezoneOffset() * 60 * 1000 ) ).toISOString()
        .replace( 'Z', getTimezoneOffsetAsTime( date ) );

    if ( dt.indexOf( 'T00:00:00.000' ) > 0 ) {
        return dt.split( 'T' )[ 0 ];
    } else {
        return dt;
    }
};

/**
 * @param {string} str
 * @returns {string}
 */
const pad2 = function( str ) {
    return ( str < 10 ) ? '0' + str : str;
};

/**
 * @param {Date} date
 * @returns {string}
 */
export const getTimezoneOffsetAsTime = ( date ) => {
    if ( date.toString() === 'Invalid Date' ) {
        return date.toString();
    }

    const offsetMinutesTotal = date.getTimezoneOffset();

    const direction = ( offsetMinutesTotal < 0 ) ? '+' : '-';
    const hours = pad2(  Math.floor( Math.abs( offsetMinutesTotal ) / 60 ) );
    const minutes = pad2( Math.floor( Math.abs( offsetMinutesTotal ) % 60 ) );

    return direction + hours + ':' + minutes;
};
