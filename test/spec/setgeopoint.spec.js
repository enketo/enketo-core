import { createGeolocationLookupError, createTestCoordinates, mockGetCurrentPosition } from '../helpers/geolocation';
import loadForm from '../helpers/load-form';

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
