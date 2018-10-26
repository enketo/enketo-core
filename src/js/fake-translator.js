// This is NOT a complete list of all enketo-core UI strings. Use a parser to find 
// all strings. E.g. https://github.com/i18next/i18next-parser
const SOURCE_STRINGS = {
    'constraint': {
        'invalid': 'Value not allowed',
        'required': 'This field is required'
    },
    'esri-geopicker': {
        'coordinate-mgrs': 'MGRS coordinate',
        'decimal': 'decimal',
        'degrees': 'degrees, minutes, seconds',
        'latitude-degrees': 'latitude (d° m’ s” N)',
        'longitude-degrees': 'longitude (d° m’ s” W)',
        'mgrs': 'MGRS',
        'notavailable': 'Not Available',
        'utm': 'UTM',
        'utm-easting': 'easting (m)',
        'utm-hemisphere': 'hemisphere',
        'utm-north': 'North',
        'utm-northing': 'northing (m)',
        'utm-south': 'South',
        'utm-zone': 'zone'
    },
    'filepicker': {
        'placeholder': 'Click here to upload file. (< __maxSize__)',
        'notFound': 'File __existing__ could not be found (leave unchanged if already submitted and you want to preserve it).',
        'waitingForPermissions': 'Waiting for user permissions.',
        'resetWarning': 'This will remove the __item__. Are you sure you want to do this?',
        'toolargeerror': 'File too large (> __maxSize__)',
        'file': 'file'
    },
    'drawwidget': {
        'drawing': 'drawing',
        'signature': 'signature',
        'annotation': 'file and drawing'
    },
    'form': {
        'required': 'required'
    },
    'geopicker': {
        'accuracy': 'accuracy (m)',
        'altitude': 'altitude (m)',
        'closepolygon': 'close polygon',
        'kmlcoords': 'KML coordinates',
        'kmlpaste': 'paste KML coordinates here',
        'latitude': 'latitude (x.y °)',
        'longitude': 'longitude (x.y °)',
        'points': 'points',
        'searchPlaceholder': 'search for place or address',
        'removePoint': 'This will completely remove the current geopoint from the list of geopoints and cannot be undone. Are you sure you want to do this?'
    },
    'selectpicker': {
        'noneselected': 'none selected',
        'numberselected': '__number__ selected'
    },
    'imagemap': {
        'svgNotFound': 'SVG image could not be found'
    },
    'rankwidget': {
        'tapstart': 'Tap to start',
        'clickstart': 'Click to start'
    },
    'widget': {
        'comment': {
            'update': 'Update'
        }
    },
    'alert': {
        'gotonotfound': {
            'msg': 'Failed to find question \'__path__\' in form. Is it a valid path?'
        }
    }
};

/**
 * Add keys from XSL stylesheets manually so i18next-parser will detect them.
 *
 * t('constraint.invalid');
 * t('constraint.required');
 */

/**
 * Meant to be replaced by a real translator in the app that consumes enketo-core
 *
 * @param  {String} key translation key
 * @param  {*} key translation options
 * @return {String} translation output
 */
function t( key, options ) {
    let str = '';
    let target = SOURCE_STRINGS;

    // crude string getter
    key.split( '.' ).forEach( part => {
        target = target ? target[ part ] : '';
        str = target;
    } );
    // crude interpolator
    options = options || {};
    str = str.replace( /__([^_]+)__/, ( match, p1 ) => options[ p1 ] );

    // Enable line below to switch to fake Arabic, very useful for testing RTL
    // var AR = 'العربية '; return str.split( '' ).map( function( char, i ) { return AR[ i % AR.length ];} ).join( '' );
    return str;
}

export { t };
