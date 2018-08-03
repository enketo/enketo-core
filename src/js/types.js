'use strict';

var utils = require( './utils' );
var format = require( './format' );
var types = {
    'string': {
        convert: function( x ) {
            return x.replace( /^\s+$/, '' );
        },
        //max length of type string is 255 chars.Convert( truncate ) silently ?
        validate: function() {
            return true;
        }
    },
    'select': {
        validate: function() {
            return true;
        }
    },
    'select1': {
        validate: function() {
            return true;
        }
    },
    'decimal': {
        convert: function( x ) {
            var num = Number( x );
            if ( isNaN( num ) || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY ) {
                // Comply with XML schema decimal type that has no special values. '' is our only option.
                return '';
            }
            return num;
        },
        validate: function( x ) {
            var num = Number( x );
            return !isNaN( num ) && num !== Number.POSITIVE_INFINITY && num !== Number.NEGATIVE_INFINITY;
        }
    },
    'int': {
        convert: function( x ) {
            var num = Number( x );
            if ( isNaN( num ) || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY ) {
                // Comply with XML schema int type that has no special values. '' is our only option.
                return '';
            }
            return ( num >= 0 ) ? Math.floor( num ) : -Math.floor( Math.abs( num ) );
        },
        validate: function( x ) {
            var num = Number( x );
            return !isNaN( num ) && num !== Number.POSITIVE_INFINITY && num !== Number.NEGATIVE_INFINITY && Math.round( num ) === num && num.toString() === x.toString();
        }
    },
    'date': {
        validate: function( x ) {
            var pattern = /([0-9]{4})-([0-9]{2})-([0-9]{2})/;
            var segments = pattern.exec( x );
            if ( segments && segments.length === 4 ) {
                var year = Number( segments[ 1 ] );
                var month = Number( segments[ 2 ] ) - 1;
                var day = Number( segments[ 3 ] );
                var date = new Date( year, month, day );
                // Do not approve automatic JavaScript conversion of invalid dates such as 2017-12-32
                return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
            }
            return false;
        },
        convert: function( x ) {
            if ( utils.isNumber( x ) ) {
                // The XPath expression "2012-01-01" + 2 returns a number of days in XPath.
                var date = new Date( x * 24 * 60 * 60 * 1000 );
                return date.toString() === 'Invalid Date' ?
                    '' : date.getFullYear().toString().pad( 4 ) + '-' + ( date.getMonth() + 1 ).toString().pad( 2 ) + '-' + date.getDate().toString().pad( 2 );
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
    'datetime': {
        validate: function( x ) {
            var parts = x.split( 'T' );
            if ( parts.length === 2 ) {
                return types.date.validate( parts[ 0 ] ) && types.time.validate( parts[ 1 ], false );
            }

            return false;
        },
        convert: function( x ) {
            var date = 'Invalid Date';
            var parts = x.split( 'T' );
            if ( utils.isNumber( x ) ) {
                // The XPath expression "2012-01-01T01:02:03+01:00" + 2 returns a number of days in XPath.
                date = new Date( x * 24 * 60 * 60 * 1000 );
            } else if ( /[0-9]T[0-9]/.test( x ) && parts.length === 2 ) {
                var convertedDate = types.date.convert( parts[ 0 ] );
                // The milliseconds are optional for datetime (and shouldn't be added)
                var convertedTime = types.time.convert( parts[ 1 ], false );
                if ( convertedDate && convertedTime ) {
                    return convertedDate + 'T' + convertedTime;
                }
            }

            return date.toString() !== 'Invalid Date' ? date.toISOLocalString() : '';
        }
    },
    'time': {
        // Note that it's okay if the validate function is stricter than the spec,
        // (for timezone offset), as long as the convertor automatically converts
        // to a valid time.
        validate: function( x, requireMillis ) {
            var m = x.match( /^(\d\d):(\d\d):(\d\d)\.\d\d\d(\+|-)(\d\d):(\d\d)$/ );

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
        convert: function( x, requireMillis ) {
            var date;
            var o = {};
            var parts;
            var time;
            var secs;
            var tz;
            var offset;
            var timeAppearsCorrect = /^[0-9]{1,2}:[0-9]{1,2}(:[0-9.]*)?/;

            requireMillis = typeof requireMillis !== 'boolean' ? true : requireMillis;

            if ( !timeAppearsCorrect.test( x ) ) {
                // An XPath expression would return a datetime string since there is no way to request a timeValue.
                // We can test this by trying to convert to a date.
                date = new Date( x );
                if ( date.toString() !== 'Invalid Date' ) {
                    x = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds() + date.getTimezoneOffsetAsTime();
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
                offset = tz[ 0 ] + tz[ 1 ].pad( 2 ) + ':' + ( tz[ 2 ] ? tz[ 2 ].pad( 2 ) : '00' );
            }

            x = o.hours + ':' + o.minutes + ':' + o.seconds + ( o.milliseconds ? '.' + o.milliseconds : '' ) + offset;

            return this.validate( x, requireMillis ) ? x : '';
        },
        // converts "11:30 AM", and "11:30 ", and "11:30 上午" to: "11:30"
        // converts "11:30 PM", and "11:30 下午" to: "23:30"
        convertMeridian: function( x ) {
            x = x.trim();
            if ( format.time.hasMeridian( x ) ) {
                var parts = x.split( ' ' );
                var timeParts = parts[ 0 ].split( ':' );
                if ( parts.length > 0 ) {
                    // This will only work for latin numbers but that should be fine because that's what the widget supports.
                    timeParts[ 0 ] = parts[ 1 ] === format.time.pmNotation ? Number( timeParts[ 0 ] ) + 12 : timeParts[ 0 ];
                    x = timeParts.join( ':' );
                }
            }
            return x;
        }
    },
    'barcode': {
        validate: function() {
            return true;
        }
    },
    'geopoint': {
        validate: function( x ) {
            var coords = x.toString().trim().split( ' ' );
            // Note that longitudes from -180 to 180 are problematic when recording points close to the international
            // dateline. They are therefore set from -360  to 360 (circumventing Earth twice, I think) which is 
            // an arbitrary limit. https://github.com/kobotoolbox/enketo-express/issues/1033
            return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                ( coords[ 1 ] !== '' && coords[ 1 ] >= -360 && coords[ 1 ] <= 360 ) &&
                ( typeof coords[ 2 ] === 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                ( typeof coords[ 3 ] === 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) );
        },
        convert: function( x ) {
            return x.toString().trim();
        }
    },
    'geotrace': {
        validate: function( x ) {
            var geopoints = x.toString().split( ';' );
            return geopoints.length >= 2 && geopoints.every( function( geopoint ) {
                return types.geopoint.validate( geopoint );
            } );
        },
        convert: function( x ) {
            return x.toString().trim();
        }
    },
    'geoshape': {
        validate: function( x ) {
            var geopoints = x.toString().split( ';' );
            return geopoints.length >= 4 && ( geopoints[ 0 ] === geopoints[ geopoints.length - 1 ] ) && geopoints.every( function( geopoint ) {
                return types.geopoint.validate( geopoint );
            } );
        },
        convert: function( x ) {
            return x.toString().trim();
        }
    },
    'binary': {
        validate: function() {
            return true;
        }
    }
};

module.exports = types;
