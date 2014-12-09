if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ "jquery", "enketo-widget/geo/geopicker" ], function( $ ) {
    var form = '<form class="or"><label class="question"><input type="text" data-type-xml="geoshape"/></label></form>';

    describe( 'geoshape widget', function() {
        var $form, geoshapePicker;

        beforeEach( function() {
            $form = $( form );
            $( 'body' ).append( $form );
            geoshapePicker = $form.find( '[data-type-xml="geoshape"]' ).geopicker().data( 'geopicker' );
        } );

        afterEach( function() {
            $form.remove();
        } );

        it( 'can be instantiated', function() {
            expect( geoshapePicker ).not.toBeUndefined();
        } );

        describe( "KML to Leaflet conversion", function() {
            var kmlCoordinates = '81.601884,44.160723 83.529902,43.665148 82.947737,44.248831 81.509322,44.321015',
                a = {
                    kml: '<coordinates>' + kmlCoordinates + '</coordinates>',
                    result: [
                        [ 44.160723, 81.601884 ],
                        [ 43.665148, 83.529902 ],
                        [ 44.248831, 82.947737 ],
                        [ 44.321015, 81.509322 ]
                    ]
                },
                b = {
                    kml: '<coordinates>   11.111,22.222 33.333,44.444  </coordinates>',
                    result: [
                        [ 22.222, 11.111 ],
                        [ 44.444, 33.333 ]
                    ]
                },
                gobbledigook = '<something< notquite </right>';

            it( 'works for space-separated KML <coordinates>', function() {
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml ) ).toEqual( a.result );
            } );

            it( 'works for newline-separated KML <coordinates>', function() {
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml.replace( ' ', '\n' ) ) ).toEqual( a.result );
            } );

            it( 'ignores gobbledigook outside of <coordinates>', function() {
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + gobbledigook ) ).toEqual( a.result );
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + a.kml ) ).toEqual( a.result );
            } );

            it( 'only extracts the values of the first <coordinates> if multiple are present', function() {
                console.debug( 'going to extract from', a.kml + b.kml );
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + b.kml ) ).toEqual( a.result );
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( b.kml + a.kml ) ).toEqual( b.result );
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + b.kml + gobbledigook + a.kml + gobbledigook ) ).toEqual( b.result );
            } );

            it( 'works for the content of a single <coordinates> without the tags', function() {
                expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( kmlCoordinates ) ).toEqual( a.result );
            } );

        } );
    } );
} );
