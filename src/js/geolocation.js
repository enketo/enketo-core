/**
 * @typedef GeolocationPosition
 * @property {string} geopoint
 * @property {number} lat
 * @property {number} lng
 * @property {window.GeolocationPosition} position
 */

/**
 * @param {window.PositionOptions} [options] - lookup options
 * @return {Promise<GeolocationPosition>} - coordinates
 */
export const getCurrentPosition = (options) =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, altitude, accuracy } =
                    position.coords;

                const lat = Math.round(latitude * 1000000) / 1000000;
                const lng = Math.round(longitude * 1000000) / 1000000;

                const geopoint = `${lat} ${lng} ${altitude || '0.0'} ${
                    accuracy || '0.0'
                }`;

                resolve({
                    geopoint,
                    lat,
                    lng,
                    position,
                });
            },
            reject,
            options
        );
    });
