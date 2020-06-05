/**
 * XML types
 *
 * @module types
 */

import { isNumber } from './utils';
import { time } from './format';

/**
 * @namespace types
 */
const types = {
    /**
     * @namespace
     */
    'string': {
        /**
         * @param {string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            return x.replace( /^\s+$/, '' );
        },
        //max length of type string is 255 chars.Convert( truncate ) silently ?
        /**
         * @return {boolean} always `true`
         */
        validate() {
            return true;
        }
    },
    /**
     * @namespace
     */
    'select': {
        /**
         * @return {boolean} always `true`
         */
        validate() {
            return true;
        }
    },
    /**
     * @namespace
     */
    'select1': {
        /**
         * @return {boolean} always `true`
         */
        validate() {
            return true;
        }
    },
    /**
     * @namespace
     */
    'decimal': {
        /**
         * @param {number|string} x - value
         * @return {number} converted value
         */
        convert( x ) {
            const num = Number( x );
            if ( isNaN( num ) || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY ) {
                // Comply with XML schema decimal type that has no special values. '' is our only option.
                return '';
            }

            return num;
        },
        /**
         * @param {number|string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const num = Number( x );

            return !isNaN( num ) && num !== Number.POSITIVE_INFINITY && num !== Number.NEGATIVE_INFINITY;
        }
    },
    /**
     * @namespace
     */
    'int': {
        /**
         * @param {number|string} x - value
         * @return {number} converted value
         */
        convert( x ) {
            const num = Number( x );
            if ( isNaN( num ) || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY ) {
                // Comply with XML schema int type that has no special values. '' is our only option.
                return '';
            }

            return ( num >= 0 ) ? Math.floor( num ) : -Math.floor( Math.abs( num ) );
        },
        /**
         * @param {number|string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const num = Number( x );

            return !isNaN( num ) && num !== Number.POSITIVE_INFINITY && num !== Number.NEGATIVE_INFINITY && Math.round( num ) === num && num.toString() === x.toString();
        }
    },
    /**
     * @namespace
     */
    'date': {
        /**
         * @param {string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const pattern = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
            const segments = pattern.exec( x );
            if ( segments && segments.length === 4 ) {
                const year = Number( segments[ 1 ] );
                const month = Number( segments[ 2 ] ) - 1;
                const day = Number( segments[ 3 ] );
                const date = new Date( year, month, day );

                // Do not approve automatic JavaScript conversion of invalid dates such as 2017-12-32
                return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
            }

            return false;
        },
        /**
         * @param {number|string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            if ( isNumber( x ) ) {
                // The XPath expression "2012-01-01" + 2 returns a number of days in XPath.
                const date = new Date( x * 24 * 60 * 60 * 1000 );

                return date.toString() === 'Invalid Date' ?
                    '' : `${date.getFullYear().toString().pad( 4 )}-${( date.getMonth() + 1 ).toString().pad( 2 )}-${date.getDate().toString().pad( 2 )}`;
            } else {
                // For both dates and datetimes
                // If it's a datetime, we can quite safely assume it's in the local timezone, and therefore we can simply chop off
                // the time component.
                if ( /[0-9]T[0-9]/.test( x ) ) {
                    x = x.split( 'T' )[ 0 ];
                }

                return this.validate( x ) ? x : '';
            }
        }
    },
    /**
     * @namespace
     */
    'datetime': {
        /**
         * @param {string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const parts = x.split( 'T' );
            if ( parts.length === 2 ) {
                return types.date.validate( parts[ 0 ] ) && types.time.validate( parts[ 1 ], false );
            }

            return types.date.validate( parts[ 0 ] );
        },
        /**
         * @param {number|string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            let date = 'Invalid Date';
            const parts = x.split( 'T' );
            if ( isNumber( x ) ) {
                // The XPath expression "2012-01-01T01:02:03+01:00" + 2 returns a number of days in XPath.
                date = new Date( x * 24 * 60 * 60 * 1000 );
            } else if ( /[0-9]T[0-9]/.test( x ) && parts.length === 2 ) {
                const convertedDate = types.date.convert( parts[ 0 ] );
                // The milliseconds are optional for datetime (and shouldn't be added)
                const convertedTime = types.time.convert( parts[ 1 ], false );
                if ( convertedDate && convertedTime ) {
                    return `${convertedDate}T${convertedTime}`;
                }
            } else {
                const convertedDate = types.date.convert( parts[ 0 ] );
                if ( convertedDate ) {
                    return `${convertedDate}T00:00:00.000${( new Date() ).getTimezoneOffsetAsTime()}`;
                }
            }

            return date.toString() !== 'Invalid Date' ? date.toISOLocalString() : '';
        }
    },
    /**
     * @namespace
     */
    'time': {
        // Note that it's okay if the validate function is stricter than the spec,
        // (for timezone offset), as long as the convertor automatically converts
        // to a valid time.
        /**
         * @param {string} x - value
         * @param {boolean} [requireMillis] - whether milliseconds are required
         * @return {boolean} whether value is valid
         */
        validate( x, requireMillis ) {
            let m = x.match( /^(\d\d):(\d\d):(\d\d)\.\d\d\d(\+|-)(\d\d):(\d\d)$/ );

            requireMillis = typeof requireMillis !== 'boolean' ? true : requireMillis;

            if ( !m && !requireMillis ) {
                m = x.match( /^(\d\d):(\d\d):(\d\d)(\+|-)(\d\d):(\d\d)$/ );
            }

            if ( !m ) {
                return false;
            }

            // no need to convert to numbers since we know they are number strings
            return m[ 1 ] < 24 && m[ 1 ] >= 0 &&
                m[ 2 ] < 60 && m[ 2 ] >= 0 &&
                m[ 3 ] < 60 && m[ 3 ] >= 0 &&
                m[ 5 ] < 24 && m[ 5 ] >= 0 && // this could be tighter
                m[ 6 ] < 60 && m[ 6 ] >= 0; // this is probably either 0 or 30
        },
        /**
         * @param {string} x - value
         * @param {boolean} [requireMillis] - whether milliseconds are required
         * @return {string} converted value
         */
        convert( x, requireMillis ) {
            let date;
            const o = {};
            let parts;
            let time;
            let secs;
            let tz;
            let offset;
            const timeAppearsCorrect = /^[0-9]{1,2}:[0-9]{1,2}(:[0-9.]*)?/;

            requireMillis = typeof requireMillis !== 'boolean' ? true : requireMillis;

            if ( !timeAppearsCorrect.test( x ) ) {
                // An XPath expression would return a datetime string since there is no way to request a timeValue.
                // We can test this by trying to convert to a date.
                date = new Date( x );
                if ( date.toString() !== 'Invalid Date' ) {
                    x = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}${date.getTimezoneOffsetAsTime()}`;
                } else {
                    return '';
                }
            }

            parts = x.toString().split( /(\+|-|Z)/ );
            // We're using a 'capturing group' here, so the + or - is included!.
            if ( parts.length < 1 ) {
                return '';
            }

            time = parts[ 0 ].split( ':' );
            tz = parts[ 2 ] ? [ parts[ 1 ] ].concat( parts[ 2 ].split( ':' ) ) : ( parts[ 1 ] === 'Z' ? [ '+', '00', '00' ] : [] );

            o.hours = time[ 0 ].pad( 2 );
            o.minutes = time[ 1 ].pad( 2 );

            secs = time[ 2 ] ? time[ 2 ].split( '.' ) : [ '00' ];

            o.seconds = secs[ 0 ];
            o.milliseconds = secs[ 1 ] || ( requireMillis ? '000' : undefined );

            if ( tz.length === 0 ) {
                offset = new Date().getTimezoneOffsetAsTime();
            } else {
                offset = `${tz[0] + tz[1].pad( 2 )}:${tz[2] ? tz[2].pad( 2 ) : '00'}`;
            }

            x = `${o.hours}:${o.minutes}:${o.seconds}${o.milliseconds ? `.${o.milliseconds}` : ''}${offset}`;

            return this.validate( x, requireMillis ) ? x : '';
        },
        /**
         * converts "11:30 AM", and "11:30 ", and "11:30 上午" to: "11:30"
         * converts "11:30 PM", and "11:30 下午" to: "23:30"
         *
         * @param {string} x - value
         * @return {string} converted value
         */
        convertMeridian( x ) {
            x = x.trim();
            if ( time.hasMeridian( x ) ) {
                const parts = x.split( ' ' );
                const timeParts = parts[ 0 ].split( ':' );
                if ( parts.length > 0 ) {
                    // This will only work for latin numbers but that should be fine because that's what the widget supports.
                    if ( parts[ 1 ] === time.pmNotation ) {
                        timeParts[ 0 ] = ( ( Number( timeParts[ 0 ] ) % 12 ) + 12 ).toString().pad( 2 );
                    } else if ( parts[ 1 ] === time.amNotation ) {
                        timeParts[ 0 ] = ( Number( timeParts[ 0 ] ) % 12 ).toString().pad( 2 );
                    }
                    x = timeParts.join( ':' );
                }
            }

            return x;
        }
    },
    /**
     * @namespace
     */
    'barcode': {
        /**
         * @return {boolean} always `true`
         */
        validate() {
            return true;
        }
    },
    /**
     * @namespace
     */
    'geopoint': {
        /**
         * @param {string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const coords = x.toString().trim().split( ' ' );

            // Note that longitudes from -180 to 180 are problematic when recording points close to the international
            // dateline. They are therefore set from -360  to 360 (circumventing Earth twice, I think) which is
            // an arbitrary limit. https://github.com/kobotoolbox/enketo-express/issues/1033
            return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                ( coords[ 1 ] !== '' && coords[ 1 ] >= -360 && coords[ 1 ] <= 360 ) &&
                ( typeof coords[ 2 ] === 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                ( typeof coords[ 3 ] === 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) );
        },
        /**
         * @param {string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            return x.toString().trim();
        }
    },
    /**
     * @namespace
     */
    'geotrace': {
        /**
         * @param {string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const geopoints = x.toString().split( ';' );

            return geopoints.length >= 2 && geopoints.every( geopoint => types.geopoint.validate( geopoint ) );
        },
        /**
         * @param {string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            return x.toString().trim();
        }
    },
    /**
     * @namespace
     */
    'geoshape': {
        /**
         * @param {string} x - value
         * @return {boolean} whether value is valid
         */
        validate( x ) {
            const geopoints = x.toString().split( ';' );

            return geopoints.length >= 4 && ( geopoints[ 0 ] === geopoints[ geopoints.length - 1 ] ) && geopoints.every( geopoint => types.geopoint.validate( geopoint ) );
        },
        /**
         * @param {string} x - value
         * @return {string} converted value
         */
        convert( x ) {
            return x.toString().trim();
        }
    },
    /**
     * @namespace
     */
    'binary': {
        /**
         * @return {boolean} always `true`
         */
        validate() {
            return true;
        }
    }
};

export default types;
