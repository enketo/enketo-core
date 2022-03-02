export default {
    maps: [
        {
            tiles: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            name: 'streets',
            attribution:
                "© <a href='http://openstreetmap.org'>OpenStreetMap</a> | <a href='www.openstreetmap.org/copyright'>Terms</a>",
        },
        {
            tiles: 'GOOGLE_SATELLITE',
            name: 'satellite',
        },
    ],
    googleApiKey: '',
    repeatOrdinals: false,
    validateContinuously: false,
    validatePage: true,
    swipePage: true,
    textMaxChars: 2000,
};
