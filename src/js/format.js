var _language = navigator.language;
var NUMBER = '0-9\u0660-\u0669';
var TIME_PART = '[:' + NUMBER + ']+';
var MERIDIAN_PART = '[^: ' + NUMBER + ']+';
var HAS_MERIDIAN = new RegExp( '^(' + TIME_PART + ' ?(' + MERIDIAN_PART + '))|((' + MERIDIAN_PART + ') ?' + TIME_PART + ')$' );

module.exports = {
    set language( lang ) {
        _language = lang;
    },
    time: {
        // For now we just look at a subset of numbers in Arabic and Latin. There are actually over 20 number scripts and :digit: doesn't work in browsers
        get hour12() {
            return HAS_MERIDIAN.test( new Date().toLocaleTimeString( _language ) );
        },
        get pmNotation() {
            return this.meridianNotation( '01-01-1970 23:00:00' );
        },
        get amNotation() {
            return this.meridianNotation( '01-01-1970 01:00:00' );
        },
        meridianNotation: function( dt ) {
            var matches = new Date( dt ).toLocaleTimeString( _language ).match( HAS_MERIDIAN );
            if ( matches && matches.length ) {
                matches = matches.filter( function( item ) { return !!item; } );
                return matches[ matches.length - 1 ];
            }
            return null;
        },
        hasMeridian: function( time ) {
            return HAS_MERIDIAN.test( time );
        }
    }
};
