import Geopicker from '../../src/widget/geo/geopicker';
import { createTestCoordinates, mockGetCurrentPosition } from '../helpers/geolocation';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question">
            <input name="/data/geo" type="text" data-type-xml="geoshape"/>
        </label>
    </form>`;
const SHAPE = '7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0;7.9377 -11.5845 0 0';

runAllCommonWidgetTests( Geopicker, FORM, SHAPE );

describe( 'geoshape widget', () => {
    let geoshapePicker;

    beforeEach( () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'input' );
        geoshapePicker = new Geopicker( control );
    } );

    mockGetCurrentPosition( createTestCoordinates( {
        latitude: 48.66,
        longitude: -120.5,
        accuracy: 2500.12,
        altitude: 123,
    } ) );


    describe( 'KML to Leaflet conversion', () => {
        const kmlCoordinates = '81.601884,44.160723 83.529902,43.665148 82.947737,44.248831 81.509322,44.321015',
            a = {
                kml: `<coordinates>${kmlCoordinates}</coordinates>`,
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

        it( 'works for space-separated KML <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml ) ).to.deep.equal( a.result );
        } );

        it( 'works for newline-separated KML <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml.replace( ' ', '\n' ) ) ).to.deep.equal( a.result );
        } );

        it( 'ignores gobbledigook outside of <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + gobbledigook ) ).to.deep.equal( a.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + a.kml ) ).to.deep.equal( a.result );
        } );

        it( 'only extracts the values of the first <coordinates> if multiple are present', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + b.kml ) ).to.deep.equal( a.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( b.kml + a.kml ) ).to.deep.equal( b.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + b.kml + gobbledigook + a.kml + gobbledigook ) ).to.deep.equal( b.result );
        } );

        it( 'works for the content of a single <coordinates> without the tags', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( kmlCoordinates ) ).to.deep.equal( a.result );
        } );

    } );
} );
