// Extend native objects... Bad.

if (typeof console.deprecate === 'undefined') {
    console.deprecate = (bad, good) => {
        console.warn(`${bad} is deprecated. Use ${good} instead.`);
    };
}
