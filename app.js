/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */

var $ = require( 'jquery' );
window.jQuery = $; // required for bootstrap-timepicker
var support = require( './src/js/support' );
var Form = require( './src/js/Form' );
var fileManager = require( './src/js/file-manager' );
var loadErrors;
var form;
var formStr;
var modelStr;
var xform = getURLParameter( 'xform' );

// if querystring touch=true is added, override detected touchscreen presence
if ( getURLParameter( 'touch' ) === 'true' ) {
    support.touch = true;
    $( 'html' ).addClass( 'touch' );
}

// Check if HTML form is hardcoded or needs to be retrieved
// note: when running this file in enketo-core-performance-monitor xform = 'null'
if ( xform && xform !== 'null' ) {
    $( '.guidance' ).remove();
    xform = /^https?:\/\//.test( xform ) ? xform : location.origin + '/' + xform;
    $.getJSON( 'http://' + location.hostname + ':8085/transform?xform=' + xform, function( survey ) {
        formStr = survey.form;
        modelStr = survey.model;
        $( '.form-header' ).after( formStr );
        initializeForm();
    } );
} else if ( $( 'form.or' ).length > 0 ) {
    $( '.guidance' ).remove();
    modelStr = globalModelStr;
    initializeForm();
}

// validate handler for validate button
$( '#validate-form' ).on( 'click', function() {
    // validate form
    form.validate()
        .then( function( valid ) {
            if ( !valid ) {
                alert( 'Form contains errors. Please see fields marked in red.' );
            } else {
                alert( 'Form is valid! (see XML record and media files in the console)' );
                $( 'form.or' ).trigger( 'beforesave' );
                console.log( 'record:', form.getDataStr() );
                console.log( 'media files:', fileManager.getCurrentFiles() );
            }
        } );
} );

// initialize the form
function initializeForm() {
    form = new Form( 'form.or:eq(0)', {
        modelStr: modelStr
    }, {
        arcGis: {
            basemaps: [ "streets", "topo", "satellite", "osm" ],
            webMapId: 'f2e9b762544945f390ca4ac3671cfa72',
            hasZ: true
        },
        'clearIrrelevantImmediately': false
    } );
    // for debugging
    window.form = form;
    //initialize form and check for load errors
    loadErrors = form.init();
    if ( loadErrors.length > 0 ) {
        alert( 'loadErrors: ' + loadErrors.join( ', ' ) );
    }
}

// get query string parameter
function getURLParameter( name ) {
    return decodeURI(
        ( new RegExp( name + '=' + '(.+?)(&|$)' ).exec( location.search ) || [ null, null ] )[ 1 ]
    );
}
