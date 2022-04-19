export default /** @type {const} */ ({
    experimentalOptimizations: {
        /**
         * When set to `true`, recomputations of the evaluation cascade will be performed
         * asynchronously to reduce time spent blocking UI updates. This may be improve
         * perceived performance on large forms with complex chained computations. These
         * computations are technically delayed and will perform more slowly, but their
         * corresponding UI updates will render more quickly as each step in the chain of
         * computations completes.
         */
        computeAsync: window.location.search.includes('&computeAsync'),
    },

    forceClearNonRelevant: window.location.search.includes('&clearNonRelevant'),

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
});
