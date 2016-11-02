if ( typeof exports === "object" && typeof exports.nodeName !== "string" && typeof define !== "function" ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
var SOURCE_STRINGS;

define( function( require, exports, module ) {
    "use strict";

    /**
     * Meant to be replaced by a real translator in the app that consumes enketo-core
     *
     * @param  {String} key translation key
     * @param  {*} key translation options
     * @return {String} translation output
     */
    function t( key, options ) {
        var str = '';
        var target = SOURCE_STRINGS;
        var AR = "العربية ";
        // crude string getter
        key.split( '.' ).forEach( function( part ) {
            target = target ? target[ part ] : '';
            str = target;
        } );
        // crude interpolator
        options = options || {};
        str = str.replace( /__([^_]+)__/, function( match, p1 ) {
            return options[ p1 ];
        } );

        // Enable line below to switch to fake Arabic, very useful for testing RTL
        // return str.split( "" ).map( function( char, i ) { return AR[ i % AR.length ];} ).join( "" );
        return str;
    }

    module.exports = {
        t: t
    };
} );


// This is NOT a complete list of all enketo-core UI strings. Use a parser to find 
// all strings. E.g. https://github.com/i18next/i18next-parser
SOURCE_STRINGS = {
    "form": {
        "required": "required"
    },
    "selectpicker": {
        "noneselected": "none selected",
        "numberselected": "__number__ selected"
    },
    "geopicker": {
        "accuracy": "accuracy (m)",
        "altitude": "altitude (m)",
        "closepolygon": "close polygon",
        "kmlcoords": "KML coordinates",
        "kmlpaste": "paste KML coordinates here",
        "latitude": "latitude (x.y °)",
        "longitude": "longitude (x.y °)",
        "points": "points",
        "searchPlaceholder": "search for place or address"
    },
    "esri-geopicker": {
        "decimal": "decimal",
        "notavailable": "Not Available",
        "mgrs": "MGRS",
        "utm": "UTM",
        "degrees": "degrees, minutes, seconds",
        "coordinate-mgrs": "MGRS coordinate",
        "latitude-degrees": "latitude (d&deg m&rsquo; s&rdquo; N)",
        "longitude-degrees": "longitude (d&deg m&rsquo; s&rdquo; W)",
        "utm-zone": "zone",
        "utm-hemisphere": "hemisphere",
        "utm-north": "North",
        "utm-south": "South",
        "utm-easting": "easting (m)",
        "utm-northing": "northing (m)"
    }
};
