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
                expect( form1.model.xml.querySelector( 'hidden_first_load' ).textContent ).to.equal( geopoint );
            } ).then( done, done );
        } );

        it( 'works for questions with odk-instance-first-load inside of the XForms body', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).to.equal( geopoint );
            } ).then( done, done );
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
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).to.equal( geopoint );
                expect( geopoint ).to.equal( '48.66 -120.5 123 0.0' );
            } ).then( done, done );
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
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).to.equal( geopoint );
                expect( geopoint ).to.include( '48.66 -120.5 0.0 2500.12' );
            } ).then( done, done );
        } );
    } );

    describe( 'lookup failure', () => {
        const mock = mockGetCurrentPosition( createGeolocationLookupError( 'PERMISSION_DENIED' ), { expectLookup: true } );

        it( 'sets an empty string when lookup fails', done => {
            const form1 = loadForm( 'setgeopoint.xml' );
            form1.init();

            mock.lookup.then( ( { geopoint } ) => {
                expect( form1.model.xml.querySelector( 'visible_first_load' ).textContent ).to.equal( geopoint );
                expect( geopoint ).to.include( '' );
            } ).then( done, done );
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

        expect( form.input.getVal( locationChangedView ) ).to.equal( '' );
        expect( locationChangedModel.textContent ).to.equal( '' );

        mock.lookup.then( () => {
            form.input.setVal( changeTarget, '11', events.Change()  );

            requestAnimationFrame( () => {
                mock.lookup.then( ( { geopoint } ) => {
                    expect( form.input.getVal( locationChangedView ) ).to.equal( geopoint );
                    expect( locationChangedModel.textContent ).to.equal( geopoint );
                } ).then( done, done );
            } );
        } ).catch( done );
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
                expect( bModel.textContent ).to.equal( geopoint );
                expect( cModel.textContent ).to.equal( geopoint );
                expect( dModel.textContent ).to.equal( geopoint );
                expect( eModel.textContent ).to.equal( geopoint );
                expect( cView.value ).to.equal( geopoint );
                expect( dView.value ).to.equal( geopoint );

                form.input.setVal( aView, '11', events.Change() );

                requestAnimationFrame( () => {
                    mock.lookup.then( ( { geopoint } ) => {
                        expect( bModel.textContent ).to.equal( geopoint );
                        expect( cModel.textContent ).to.equal( geopoint );
                        expect( dModel.textContent ).to.equal( geopoint );
                        expect( eModel.textContent ).to.equal( geopoint );
                        expect( cView.value ).to.equal( geopoint );
                        expect( dView.value ).to.equal( geopoint );
                    } ).then( done, done );
                } );
            } ).catch( done );
        } );
    } );

} );
