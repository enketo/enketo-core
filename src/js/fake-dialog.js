/**
 * This placeholder module is meant to be overwritten with one that uses the app's own dialogs.
 *
 * @module dialog
 */

/**
 * @typedef DialogContentObj
 * @property {string} message
 * @property {string} heading
 */

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 */
function alert( content ) {
    window.alert( content );

    return Promise.resolve();
}

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 */
function confirm( content ) {
    const msg = content.message ? content.message : content;

    return Promise.resolve( window.confirm( msg ) );
}

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 * @param {string} def - Default input value
 */
function prompt( content, def ) {
    return Promise.resolve( window.prompt( content, def ) );
}

export default {
    alert,
    confirm,
    prompt
};
