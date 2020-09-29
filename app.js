/* eslint no-console: 0 */

/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */

import support from './src/js/support';
import { Form } from './src/js/form';
import fileManager from './src/js/file-manager';
import events from './src/js/event';
import { fixGrid, styleToAll, styleReset } from './src/js/print';
var form;
var formStr;
var modelStr;
var xform = getURLParameter( 'xform' );

// if querystring touch=true is added, override detected touchscreen presence
if ( getURLParameter( 'touch' ) === 'true' ) {
    support.touch = true;
    document.querySelector( 'html' ).classList.add( 'touch' );
}

// Check if HTML form is hardcoded or needs to be retrieved
// note: when running this file in enketo-core-performance-monitor xform = 'null'
if ( xform && xform !== 'null' ) {
    document.querySelector( '.guidance' ).remove();
    xform = /^https?:\/\//.test( xform ) ? xform : location.origin + '/' + xform;
    var transformerUrl = 'http://' + location.hostname + ':8085/transform?xform=' + xform;
    fetch( transformerUrl )
        .then( response => response.json() )
        .then( survey => {
            formStr = survey.form;
            modelStr = survey.model;
            const range = document.createRange();
            const formEl = range.createContextualFragment( formStr ).querySelector( 'form' );
            document.querySelector( '.form-header' ).after( formEl );
            initializeForm();
        } )
        .catch( () => {
            window.alert( 'Error fetching form from enketo-transformer at:\n\n' + transformerUrl + '.\n\nPlease check that enketo-transformer has been started.' );
        } );
} else if ( document.querySelector( 'form.or' ) ) {
    document.querySelector( '.guidance' ).remove();
    modelStr = window.globalModelStr;
    initializeForm();
}

// validate handler for validate button
document.querySelector( '#validate-form' ).addEventListener( 'click', () => {
    // validate form
    form.validate()
        .then( function( valid ) {
            if ( !valid ) {
                window.alert( 'Form contains errors. Please see fields marked in red.' );
            } else {
                window.alert( 'Form is valid! (see XML record and media files in the console)' );
                form.view.html.dispatchEvent( events.BeforeSave() );
                console.log( 'record:', form.getDataStr() );
                console.log( 'media files:', fileManager.getCurrentFiles() );
            }
        } );
} );

// initialize the form
function initializeForm() {
    const formEl = document.querySelector( 'form.or' );
    form = new Form( formEl, {
        modelStr: modelStr
    }, {
        'printRelevantOnly': false
    } );
    // for debugging
    window.form = form;
    //initialize form and check for load errors
    const loadErrors = form.init();
    if ( loadErrors.length > 0 ) {
        window.alert( 'loadErrors: ' + loadErrors.join( ', ' ) );
    }
}

// get query string parameter
function getURLParameter( name ) {
    return decodeURI(
        ( new RegExp( name + '=' + '(.+?)(&|$)' ).exec( location.search ) || [ null, null ] )[ 1 ]
    );
}

// to facilitate developing print-specific issues
function printView( on = true, grid = false ) {
    if ( on ) {
        document.querySelectorAll( '.question' ).forEach( el => el.dispatchEvent( events.Printify() ) );
        styleToAll();
        if ( grid ) {
            fixGrid( { format: 'letter' } )
                .then( () => console.log( 'done' ) );
        }

    } else {
        document.querySelectorAll( '.question' ).forEach( el => el.dispatchEvent( events.DePrintify() ) );
        styleReset();
    }
}

window.printGridView = ( on = true ) => printView( on, true );
window.printView = printView;
