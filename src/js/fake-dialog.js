/*
 * This file is meant to be overidden with one that uses the app's dialogs.
 */

/**
 * @param {String | {message: String, heading: String}} content Dialog content
 */
function alert( content ) {
    window.alert( content );
    return Promise.resolve();
}

/**
 * @param {String | {message: String, heading: String}} content Dialog content
 */
function confirm( content ) {
    return Promise.resolve( window.confirm( content ) );
}

function prompt( content, def ) {
    return Promise.resolve( window.prompt( content, def ) );
}

export default {
    alert,
    confirm,
    prompt
};
