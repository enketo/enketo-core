'use strict';

var utils = require( './utils' );
var types = {
    'string': {
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
            var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/;
            var segments = pattern.exec( x );

            return ( segments && segments.length === 6 ) ? ( new Date( Number( segments[ 1 ] ) + '-' + Number( segments[ 3 ] ) + '-' + Number( segments[ 5 ] ) ).toString() !== 'Invalid Date' ) : false;
        },
        convert: function( x ) {
            var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/;
            var segments;
            var date;

            if ( utils.isNumber( x ) ) {
                // The XPath expression "2012-01-01" + 2 returns a number of days in XPath.
                date = new Date( x * 24 * 60 * 60 * 1000 );
            } else {
                date = new Date( x );
                if ( date.toString() === 'Invalid Date' ) {
                    segments = pattern.exec( x );
                    //this code is really only meant for the Rhino and PhantomJS engines, in browsers it may never be reached
                    if ( segments && Number( segments[ 1 ] ) > 0 && Number( segments[ 3 ] ) >= 0 && Number( segments[ 3 ] ) < 12 && Number( segments[ 5 ] ) < 32 ) {
                        date = new Date( Number( segments[ 1 ] ), ( Number( segments[ 3 ] ) - 1 ), Number( segments[ 5 ] ) );
                    }
                }
            }

            return date.toString() === 'Invalid Date' ?
                '' : date.getUTCFullYear().toString().pad( 4 ) + '-' + ( date.getUTCMonth() + 1 ).toString().pad( 2 ) + '-' + date.getUTCDate().toString().pad( 2 );
        }
    },
    'datetime': {
        validate: function( x ) {
            //the second part builds in some tolerance for slightly-off dates provides as defaults (e.g.: 2013-05-31T07:00-02)
            return ( new Date( x.toString() ).toString() !== 'Invalid Date' || new Date( this.convert( x.toString() ) ).toString() !== 'Invalid Date' );
        },
        convert: function( x ) {
            var date;
            var patternCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2}):([0-9]{2})$/;
            var patternAlmostCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2})$/;

            if ( utils.isNumber( x ) ) {
                // The XPath expression "2012-01-01T01:02:03+01:00" + 2 returns a number of days in XPath.
                date = new Date( x * 24 * 60 * 60 * 1000 );
            } else if ( new Date( x ).toString() !== 'Invalid Date' && patternCorrect.test( x ) ) {
                // Do not risk changing the time zone by calling toISOLocalString()
                return x;
            } else if ( new Date( x ).toString() === 'Invalid Date' && patternAlmostCorrect.test( x ) ) {
                // Do not risk changing the time zone by calling toISOLocalString()
                return x + ':00';
            } else {
                date = new Date( x );
            }

            return ( date.toString() !== 'Invalid Date' ) ? date.toISOLocalString() : '';
        }
    },
    'time': {
        validate: function( x ) {
            var m = x.match( /^(\d\d):(\d\d):(\d\d)\.\d\d\d(\+|-)(\d\d):(\d\d)$/ );

            if ( !m ) {
                return false;
            }

            // no need to convert to numbers since we now they are number strings
            return m[ 1 ] < 24 && m[ 1 ] >= 0 &&
                m[ 2 ] < 60 && m[ 2 ] >= 0 &&
                m[ 3 ] < 60 && m[ 3 ] >= 0 &&
                m[ 5 ] < 24 && m[ 5 ] >= 0 && // this could be tighter
                m[ 6 ] < 60 && m[ 6 ] >= 0; // this is probably either 0 or 30
        },
        convert: function( x ) {
            var date;
            var o = {};
            var parts;
            var offset;
            var timeAppearsCorrect = /^[0-9]{2}:[0-9]{2}(:[0-9.]*)?$/;

            if ( !timeAppearsCorrect.test( x ) ) {
                // An XPath expression would return a datetime string since there is no way to request a timeValue.
                // We can test this by trying to convert to a date.
                date = new Date( x );
                if ( date.toString() !== 'Invalid Date' ) {
                    x = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds() + date.getTimezoneOffsetAsTime();
                }
            }

            parts = x.toString().split( ':' );

            if ( parts.length < 2 ) {
                return '';
            }

            o.hours = parts[ 0 ].pad( 2 );
            o.minutes = parts[ 1 ].pad( 2 );
            parts = ( parts[ 2 ] || '00' ).split( '.' );
            o.seconds = parts[ 0 ].pad( 2 );
            parts = ( parts[ 1 ] || '000' ).split( /(\+|-)/ );
            o.milliseconds = parts[ 0 ].pad( 3 );
            if ( parts.length === 1 ) {
                offset = new Date().getTimezoneOffsetAsTime();
                parts[ 1 ] = offset.substring( 0, 1 );
                parts[ 2 ] = offset.substring( 1 );
            }
            o.offsetDirection = parts[ 1 ];
            o.offsetTime = parts[ 2 ].length > 2 ? parts[ 2 ] : parts[ 2 ].pad( 2 ) + ':00';

            x = o.hours + ':' + o.minutes + ':' + o.seconds + '.' + o.milliseconds + o.offsetDirection + o.offsetTime;

            return this.validate( x ) ? x : '';
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
            return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                ( coords[ 1 ] !== '' && coords[ 1 ] >= -180 && coords[ 1 ] <= 180 ) &&
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
