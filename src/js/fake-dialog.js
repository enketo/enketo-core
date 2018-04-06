'use strict';

var Promise = require( 'lie' );

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
    return new Promise( function( resolve, reject ) {
        if ( window.confirm( content ) ) {
            resolve();
        } else {
            reject();
        }
    } );
}

function prompt( content, def ) {
    return new Promise( function( resolve, reject ) {
        var value = window.prompt( content, def );
        if ( value ) {
            resolve( value );
        } else {
            reject();
        }
    } );
}

module.exports = {
    alert: alert,
    confirm: confirm,
    prompt: prompt
};
