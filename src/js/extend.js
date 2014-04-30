//extend native objects, aka monkey patching ..... really I see no harm!

define( function( window ) {
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
        var offset = {},
            plus,
            pad2 = function( x ) {
                return ( x < 10 ) ? '0' + x : x;
            };

        if ( this.toString() == 'Invalid Date' ) {
            return this.toString();
        }

        offset.minstotal = this.getTimezoneOffset();
        offset.direction = ( offset.minstotal < 0 ) ? '+' : '-';
        offset.hrspart = pad2( Math.abs( Math.floor( offset.minstotal / 60 ) ) );
        offset.minspart = pad2( Math.abs( Math.floor( offset.minstotal % 60 ) ) );

        return new Date( this.getTime() - ( offset.minstotal * 60 * 1000 ) ).toISOString()
            .replace( 'Z', offset.direction + offset.hrspart + ':' + offset.minspart );
    };
} );
