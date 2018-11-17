let _locale = navigator.language;
const NUMBER = '0-9\u0660-\u0669';
const TIME_PART = `[:${NUMBER}]+`;
const MERIDIAN_PART = `[^: ${NUMBER}]+`;
const HAS_MERIDIAN = new RegExp( `^(${TIME_PART} ?(${MERIDIAN_PART}))|((${MERIDIAN_PART}) ?${TIME_PART})$` );

function _getCleanLocalTime( dt ) {
    dt = typeof dt == 'undefined' ? new Date() : dt;
    return _cleanSpecialChars( dt.toLocaleTimeString( _locale ) );
}

function _cleanSpecialChars( timeStr ) {
    return timeStr.replace( /[\u200E\u200F]/g, '' );
}

const time = {
    // For now we just look at a subset of numbers in Arabic and Latin. There are actually over 20 number scripts and :digit: doesn't work in browsers
    get hour12() {
        return this.hasMeridian( _getCleanLocalTime() );
    },
    get pmNotation() {
        return this.meridianNotation( new Date( 2000, 1, 1, 23, 0, 0 ) );
    },
    get amNotation() {
        return this.meridianNotation( new Date( 2000, 1, 1, 1, 0, 0 ) );
    },
    meridianNotation( dt ) {
        let matches = _getCleanLocalTime( dt ).match( HAS_MERIDIAN );
        if ( matches && matches.length ) {
            matches = matches.filter( item => !!item );
            return matches[ matches.length - 1 ];
        }
        return null;
    },
    hasMeridian( time ) {
        return HAS_MERIDIAN.test( _cleanSpecialChars( time ) );
    }
};

const format = {
    set locale( loc ) {
        _locale = loc;
    },
    get locale() {
        return _locale;
    }
};

export { format, time };
