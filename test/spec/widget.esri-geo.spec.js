var $ = require( 'jquery' );
require( '../../src/widget/geo-esri/geopicker' );

var form = '<form class="or"><label class="question"><input type="text" data-type-xml="geopoint"/></label></form>';

describe( 'ESRI geopoint widget', function() {
    var $form, geopointPicker;

    beforeEach( function() {
        $form = $( form );
        $( 'body' ).append( $form );
        geopointPicker = $form.find( '[data-type-xml="geopoint"]' ).esriGeopicker().data( 'geopicker' );
    } );

    afterEach( function() {
        $form.remove();
    } );

    it( 'can be instantiated', function() {
        expect( geopointPicker ).not.toBeUndefined();
    } );

    describe( 'convertor of LatLng to degrees, minutes, seconds', function() {
        [
            [ '-39.42342342', {
                latitude: [ 39, 25, 24.324312, 'S' ],
                longitude: [ 39, 25, 24.324312, 'W' ]
            } ]
        ].forEach( function( test ) {
            it( 'converts correctly back and forth, test[0]', function() {
                expect( geopointPicker._latLngToDms( test[ 0 ], test[ 0 ], 8 ) ).toEqual( test[ 1 ] );
                expect( geopointPicker._dmsToDecimal( test[ 1 ].latitude ) ).toEqual( test[ 0 ] );
                expect( geopointPicker._dmsToDecimal( test[ 1 ].longitude ) ).toEqual( test[ 0 ] );
            } );
        } );

        [
            [ undefined, undefined, undefined, undefined, '0.000000000' ],
            [ 20, undefined, undefined, undefined, '20.00000000' ],
            [ 20, null, null, null, '20.00000000' ],
            [ 20, 0, 0, 'S', '-20.00000000' ],
            [ 20, 0, 0, 'W', '-20.00000000' ],
            [ -20, 0, 0, 'S', '-20.00000000' ],
            [ -20, 0, 0, 'W', '-20.00000000' ],
            // conflicting negative degrees and 'N/W' cardinal
            [ -20, 0, 0, 'N', '-20.00000000' ],
            [ -20, 0, 0, 'E', '-20.00000000' ]
        ].forEach( function( test ) {
            it( 'converts dmsc to decimal correctly', function() {
                expect( geopointPicker._dmsToDecimal( [ test[ 0 ], test[ 1 ], test[ 2 ], test[ 3 ] ] ) ).toEqual( test[ 4 ] );
            } );
        } );
    } );

    describe( 'MGRS to latLong conversion', function() {

    } );


    describe( 'extractor of webMapId from an array of classes', function() {
        [
            [
                [], undefined
            ],
            [ undefined, undefined ],
            [ null, undefined ],
            [ 'a', undefined ],
            [ false, undefined ],
            [ true, undefined ],
            [ {}, undefined ],
            [
                [ 'arcgis:abc' ], undefined
            ],
            [
                [ 'arcgis::abc' ], 'abc'
            ],
            [
                [ 'pages', 'or', 'arcgis::ab12' ], 'ab12'
            ],
            [
                [ 'pages', 'aRCgIs::AB12', 'arcgis::bc34' ], 'AB12'
            ],
        ].forEach( function( test ) {
            it( 'extracts ' + test[ 1 ] + ' from ' + test[ 0 ], function() {
                expect( geopointPicker._getWebMapIdFromFormClasses( test[ 0 ] ) ).toEqual( test[ 1 ] );
            } );
        } );
    } );
} );
