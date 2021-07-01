/**
 * @typedef CoordinatesData
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} [altitude]
 * @property {number} [accuracy]
 */

/**
 * @typedef TestCoordinates
 * @property {window.GeolocationCoordinates} [coordinates] - a GeolocationCoordinates instance
 * @property {string} geopoint
 */

/**
 * @param {CoordinatesData} coordinates - Coordinate data to populate a `GeolocationCoordinates` object
 *
 * @return {window.GeolocationCoordinates} - returns a TestCoordinates object
 */
export const createTestCoordinates = ( {
    latitude,
    longitude,
    altitude = null,
    accuracy = null,
} ) => (
    Object.create( window.GeolocationCoordinates.prototype, {
        latitude: { value: latitude },
        longitude: { value: longitude },
        altitude: { value: altitude },
        accuracy: { value: accuracy },
        altitudeAccuracy: { value: null },
        heading: { value: null },
        speed: { value: null },
    } )
);

/**
 * @param {'PERMISSION_DENIED'|'POSITION_UNAVAILABLE'|'TIMEOUT'} reason - the reason a geolocation lookup failed
 *
 * @return {window.GeolocationPositionError} - a lookup error instance
 */
export const createGeolocationLookupError = ( reason ) => (
    Object.create( window.GeolocationPositionError.prototype, {
        code: { value: window.GeolocationPositionError[reason] },
        message: { value: reason },
    } )
);

/**
 * @typedef MockGeolocationLookupOptions
 * @property {boolean} [expectLookup] - if true, after each test in a suite where `mockGeolocationLookup` is called, the test will fail if it did not perform a lookup.
 */

/**
 * Mocks geolocation lookups.
 *
 * If the provided `result` is a valid coordinate, a lookup will asynchronously call
 * the `successCallback` provided to `Geolocation#getCurrentPosition` with that result.
 *
 * If `result` is a `GeolocationPositionError`, and if an `errorCallback` is provided,
 * that callback will be called with the error.
 *
 * If the test completes and `Geolocation#getCurrentPosition` was not called, the test
 * expecting a lookup will fail.
 *
 * @param {TestCoordinates | window.GeolocationPositionError} result - the result of a mocked geolocation lookup
 * @param {MockGeolocationLookupOptions} [options] - options for mocking `Geolocation#getCurrentPosition`
 *
 * @return {{ lookup: Promise<{ geopoint: string }> }} - object containing `lookup` reference which,
 * if a geolocation lookup is performed, will be a promise that resolves with the
 * expected geopoint value when the lookup is complete.
 */
export const mockGetCurrentPosition = ( result, options = {} ) => {
    /**
     * @type {{ lookup: Promise<{ geopoint: string }> | null}}
     */
    let mock = { lookup: null };

    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {import('sinon').SinonStub} */
    let getCurrentPositionStub;

    beforeEach( () => {
        mock.lookup = null;

        sandbox = sinon.createSandbox();

        getCurrentPositionStub = sandbox.stub( navigator.geolocation, 'getCurrentPosition' ).callsFake(
            /**
             * @param {window.PositionCallback} successCallback - called on success
             * @param {window.PositionErrorCallback} [errorCallback] - called on failure
             */
            ( successCallback, errorCallback ) => {
                mock.lookup = new Promise( ( resolve ) => {
                    if ( result instanceof window.GeolocationPositionError ) {
                        errorCallback( result );
                        resolve( { geopoint: '' } );
                    } else {
                        const position = {
                            coords: result,
                            timestamp: Date.now(),
                        };
                        successCallback( position );

                        const {
                            latitude,
                            longitude,
                            altitude,
                            accuracy,
                        } = result;

                        const geopoint = `${latitude} ${longitude} ${altitude || '0.0'} ${accuracy || '0.0'}`;

                        resolve( { geopoint } );
                    }

                } );
            }
        );
    } );

    afterEach( () => {
        const { callCount = 0 } = getCurrentPositionStub || {};

        sandbox.restore();

        if ( options.expectLookup ) {
            expect( callCount ).to.be.greaterThan( 0 );
        }
    } );

    return mock;
};
