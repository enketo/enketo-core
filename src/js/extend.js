'use strict';
// Extend native objects, aka monkey patching ..... really I see no harm!

/**
 * Pads a string with prefixed zeros until the requested string length is achieved.
 * @param  {number} digits [description]
 * @return {String|string}        [description]
 */
String.prototype.pad = function( digits ) {
    var x = this;
    while ( x.length < digits ) {
        x = '0' + x;
    }
    return x;
};

/**
 * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
 * used in JavaRosa, so it replaces the Z in the ISOstring with a local offset
 * @return {string} a datetime string formatted according to RC3339 with local offset
 */
Date.prototype.toISOLocalString = function() {
    //2012-09-05T12:57:00.000-04:00 (ODK)

    if ( this.toString() === 'Invalid Date' ) {
        return this.toString();
    }

    return new Date( this.getTime() - ( this.getTimezoneOffset() * 60 * 1000 ) ).toISOString()
        .replace( 'Z', this.getTimezoneOffsetAsTime() );
};

Date.prototype.getTimezoneOffsetAsTime = function() {
    var offsetMinutesTotal;
    var hours;
    var minutes;
    var direction;
    var pad2 = function( x ) {
        return ( x < 10 ) ? '0' + x : x;
    };

    if ( this.toString() === 'Invalid Date' ) {
        return this.toString();
    }

    offsetMinutesTotal = this.getTimezoneOffset();

    direction = ( offsetMinutesTotal < 0 ) ? '+' : '-';
    hours = pad2( Math.abs( Math.floor( offsetMinutesTotal / 60 ) ) );
    minutes = pad2( Math.abs( Math.floor( offsetMinutesTotal % 60 ) ) );

    return direction + hours + ':' + minutes;
};

if ( typeof console.deprecate === 'undefined' ) {
    console.deprecate = function( bad, good ) {
        console.warn( bad + ' is deprecated. Use ' + good + ' instead.' );
    };
}
