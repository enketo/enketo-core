/**
 * Placeholder module for translator. It is meant to be overwritten by a translator used in your app.
 *
 * @module fake-translator
 */

// This is NOT a complete list of all enketo-core UI strings. Use a parser to find
// all strings. E.g. https://github.com/i18next/i18next-parser
const SOURCE_STRINGS = {
    constraint: {
        invalid: 'Value not allowed',
        required: 'This field is required',
    },
    filepicker: {
        placeholder: 'Click here to upload file. (< __maxSize__)',
        notFound:
            'File __existing__ could not be found (leave unchanged if already submitted and you want to preserve it).',
        waitingForPermissions: 'Waiting for user permissions.',
        resetWarning:
            'This will remove the __item__. Are you sure you want to do this?',
        toolargeerror: 'File too large (> __maxSize__)',
        file: 'file',
    },
    drawwidget: {
        drawing: 'drawing',
        signature: 'signature',
        annotation: 'file and drawing',
    },
    form: {
        required: 'required',
    },
    geopicker: {
        accuracy: 'accuracy (m)',
        altitude: 'altitude (m)',
        closepolygon: 'close polygon',
        kmlcoords: 'KML coordinates',
        kmlpaste: 'paste KML coordinates here',
        latitude: 'latitude (x.y °)',
        longitude: 'longitude (x.y °)',
        points: 'points',
        searchPlaceholder: 'search for place or address',
        removePoint:
            'This will completely remove the current geopoint from the list of geopoints and cannot be undone. Are you sure you want to do this?',
    },
    selectpicker: {
        noneselected: 'none selected',
        numberselected: '__number__ selected',
    },
    imagemap: {
        svgNotFound: 'SVG image could not be found',
    },
    rankwidget: {
        tapstart: 'Tap to start',
        clickstart: 'Click to start',
    },
    widget: {
        comment: {
            update: 'Update',
        },
    },
    alert: {
        gotonotfound: {
            msg: "Failed to find question '__path__' in form. Is it a valid path?",
        },
        valuehasspaces: {
            multiple:
                'Select multiple question has an illegal value "__value__" that contains a space.',
        },
    },
    confirm: {
        repeatremove: {
            heading: 'Delete this group of responses?',
            msg: 'This action is irreversible. Are you sure you want to proceed?',
        },
    },
};

/**
 * Add keys from XSL stylesheets manually so i18next-parser will detect them.
 *
 * t('constraint.invalid');
 * t('constraint.required');
 * t('hint.guidance.details');
 */

/**
 * Meant to be replaced by a real translator in the app that consumes enketo-core
 *
 * @static
 * @param  {string} key - Translation key
 * @param  {object} [options] - Translation options object
 * @return {string} Translation output
 */
function t(key, options) {
    let str = '';
    let target = SOURCE_STRINGS;

    // crude string getter
    key.split('.').forEach((part) => {
        target = target ? target[part] : '';
        str = target;
    });
    // crude interpolator
    options = options || {};
    str = str.replace(/__([^_]+)__/, (match, p1) => options[p1]);

    // Enable line below to switch to fake Arabic, very useful for testing RTL
    // var AR = 'العربية '; return str.split( '' ).map( function( char, i ) { return AR[ i % AR.length ];} ).join( '' );
    return str;
}

export { t };
