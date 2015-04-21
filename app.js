/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */


requirejs( [ 'require-config' ], function( rc ) {
    requirejs( [ 'jquery', 'Modernizr', 'enketo-js/Form', 'file-manager' ],
        function( $, Modernizr, Form, fileManager ) {
            var loadErrors, form, formStr, modelStr;

            // if querystring touch=true is added, override Modernizr
            if ( getURLParameter( 'touch' ) === 'true' ) {
                Modernizr.touch = true;
                $( 'html' ).addClass( 'touch' );
            }

            // check if HTML form is hardcoded or needs to be retrieved
            if ( getURLParameter( 'xform' ) !== 'null' ) {
                $( '.guidance' ).remove();
                $.getJSON( 'http://xslt-dev.enketo.org/transform?xform=' + getURLParameter( 'xform' ), function( survey ) {
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
                form.validate();
                if ( !form.isValid() ) {
                    alert( 'Form contains errors. Please see fields marked in red.' );
                } else {
                    alert( 'Form is valid! (see XML record and media files in the console)' );
                    console.log( 'record:', form.getDataStr() );
                    console.log( 'media files:', fileManager.getCurrentFiles() );
                }
            } );

            // initialize the form
            function initializeForm() {
                form = new Form( 'form.or:eq(0)', {
                    modelStr: modelStr
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
        } );
} );
