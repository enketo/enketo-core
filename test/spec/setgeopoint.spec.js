import { createGeolocationLookupError, createTestCoordinates, mockGetCurrentPosition } from '../helpers/geolocation';
import loadForm from '../helpers/load-form';
import events from '../../src/js/event';

/*
 * These tests are for setgeopoint actions. Even though this functionality is part of calculate.js they are separated since they
 * different features of XForms.
 */

describe( 'setgeopoint action', () => {
    describe( 'first load', () => {
        const mock = mockGetCurrentPosition( createTestCoordinates( {
            latitude: 48.66,
            longitude: -120.5,
            accuracy: 2500.12,
            altitude: 123,
        } ), { expectLookup: true } );

        it( 'works for questions with odk-instance-first-load outside of the XForms body', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'hidden_first_load' ).textContent ).toEqual( geopoint );

                done();
            } ).catch( fail );
        } );

        it( 'works for questions with odk-instance-first-load inside of the XForms body', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).toEqual( geopoint );

                done();
            } ).catch( fail );
        } );
    } );

    describe( 'null `accuracy`', () => {
        const mock = mockGetCurrentPosition( createTestCoordinates( {
            latitude: 48.66,
            longitude: -120.5,
            altitude: 123,
        } ), { expectLookup: true } );

        it( 'substitutes a null `accuracy` value with 0.0', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).toEqual( geopoint );
                expect( geopoint ).toEqual( '48.66 -120.5 123 0.0' );
            } ).catch( fail ).finally( done );
        } );
    } );

    describe( 'null `altitude`', () => {
        const mock = mockGetCurrentPosition( createTestCoordinates( {
            latitude: 48.66,
            longitude: -120.5,
            accuracy: 2500.12,
        } ), { expectLookup: true } );

        it( 'substitutes a null `altitude` value with 0.0', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).toEqual( geopoint );
                expect( geopoint ).toMatch( '48.66 -120.5 0.0 2500.12' );
            } ).catch( fail ).finally( done );
        } );
    } );

    describe( 'lookup failure', () => {
        const mock = mockGetCurrentPosition( createGeolocationLookupError( 'PERMISSION_DENIED' ), { expectLookup: true } );

        it( 'sets an empty string when lookup fails', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).toEqual( geopoint );
                expect( geopoint ).toMatch( '' );
            } ).catch( fail ).finally( done );
        } );
    } );

} );


describe( 'setgeopoint actions to populate a value if another value changes', () => {
    const mock = mockGetCurrentPosition( createTestCoordinates( {
        latitude: 48.66,
        longitude: -120.5,
        accuracy: 2500.12,
        altitude: 123,
    } ), { expectLookup: true } );

    it( 'works outside a repeat in conjunction with a select_minimal', done => {
        const form = loadForm( 'setgeopoint.xml' );
        form.init();

        const changeTarget = form.view.html.querySelector( '[name="/data/changes"]' );
        const locationChangedView = form.view.html.querySelector( '[name="/data/location_changed"]:not([data-setgeopoint])' );
        const locationChangedModel = form.model.xml.querySelector( 'data > location_changed' );

        expect( form.input.getVal( locationChangedView ) ).toEqual( '' );
        expect( locationChangedModel.textContent ).toEqual( '' );

        mock.lookup.then( () => {
            form.input.setVal( changeTarget, '11', events.Change()  );

            requestAnimationFrame( () => {
                mock.lookup.then( ( { geopoint } ) => {
                    expect( form.input.getVal( locationChangedView ) ).toEqual( geopoint );
                    expect( locationChangedModel.textContent ).toEqual( geopoint );
                } ).catch( fail ).finally( done );
            } );
        } ).catch( fail );
    } );

    it( 'works for multiple setgeopoint actions triggered by same question', done => {
        const form = loadForm( 'setgeopoint-multiple-under-one.xml' );
        form.init();
        const aView = form.input.find( '/data/a', 0 );
        const cView = form.input.find( '/data/c', 0 );
        const dView = form.input.find( '/data/d', 0 );
        const bModel = form.model.xml.querySelector( 'b' );
        const cModel = form.model.xml.querySelector( 'c' );
        const dModel = form.model.xml.querySelector( 'd' );
        const eModel = form.model.xml.querySelector( 'e' );

        form.input.setVal( aView, '3030', events.Change() );

        requestAnimationFrame( () => {
            mock.lookup.then( ( { geopoint } ) => {
                expect( bModel.textContent ).toEqual( geopoint );
                expect( cModel.textContent ).toEqual( geopoint );
                expect( dModel.textContent ).toEqual( geopoint );
                expect( eModel.textContent ).toEqual( geopoint );
                expect( cView.value ).toEqual( geopoint );
                expect( dView.value ).toEqual( geopoint );

                form.input.setVal( aView, '11', events.Change() );

                requestAnimationFrame( () => {
                    mock.lookup.then( ( { geopoint } ) => {
                        expect( bModel.textContent ).toEqual( geopoint );
                        expect( cModel.textContent ).toEqual( geopoint );
                        expect( dModel.textContent ).toEqual( geopoint );
                        expect( eModel.textContent ).toEqual( geopoint );
                        expect( cView.value ).toEqual( geopoint );
                        expect( dView.value ).toEqual( geopoint );
                    } ).catch ( fail ).finally( done );
                } );
            } ).catch( fail );
        } );
    } );

} );
