requirejs.config( {
    baseUrl: '../lib/',
    paths: {
        js: '../src/js',
        widget: '../src/widget',
        text: 'text/text',
        xpath: 'xpath/build/xpathjs_javarosa',
        config: '../config.json',
        gmaps: 'http://maps.google.com/maps/api/js?v=3.exp&sensor=false&libraries=places&callback=gmapsLoaded',
        "file-manager": "file-manager/src/file-manager"
    },
    shim: {
        'xpath': {
            exports: 'XPathJS'
        },
        'bootstrap': {
            deps: [ 'jquery' ],
            exports: 'jQuery.fn.bootstrap'
        },
        'widget/date/bootstrap-datepicker/js/bootstrap-datepicker': {
            deps: [ 'jquery' ],
            exports: 'jQuery.fn.datepicker'
        },
        'widget/time/bootstrap-timepicker/js/bootstrap-timepicker': {
            deps: [ 'jquery' ],
            exports: 'jQuery.fn.timepicker'
        }
    }
} );

define( 'modernizr', [], Modernizr );

requirejs( [ 'jquery', 'modernizr', 'js/Form' ],
    function( $, modernizr, Form ) {
        var loadErrors, form;

        //if querystring touch=true is added, override Modernizr
        if ( getURLParameter( 'touch' ) === 'true' ) {
            modernizr.touch = true;
            $( 'html' ).addClass( 'touch' );
        }

        //check if HTML form is hardcoded or needs to be retrieved
        if ( getURLParameter( 'xform' ) !== 'null' ) {
            $( '.guidance' ).remove();
            $.get( 'http://xslt-dev.enketo.org/?xform=' + getURLParameter( 'xform' ), function( data ) {
                var $data;
                //this replacement should move to XSLT after which the GET can just return 'xml' and $data = $(data)
                data = data.replace( /jr\:template=/gi, 'template=' );
                $data = $( $.parseXML( data ) );
                formStr = ( new XMLSerializer() ).serializeToString( $data.find( 'form:eq(0)' )[ 0 ] );
                modelStr = ( new XMLSerializer() ).serializeToString( $data.find( 'model:eq(0)' )[ 0 ] );
                $( '#validate-form' ).before( formStr );
                initializeForm();
            }, 'text' );
        } else if ( $( 'form.or' ).length > 0 ) {
            $( '.guidance' ).remove();
            initializeForm();
        }

        //validate handler for validate button
        $( '#validate-form' ).on( 'click', function() {
            form.validateForm();
            if ( !form.isValid() ) {
                alert( 'Form contains errors. Please see fields marked in red.' );
            } else {
                alert( 'Form is valid! (see XML record in the console)' );
                console.log( 'record:', form.getDataStr() );
            }
        } );

        //initialize the form

        function initializeForm() {
            form = new Form( 'form.or:eq(0)', modelStr );
            //for debugging
            window.form = form;
            //initialize form and check for load errors
            loadErrors = form.init();
            if ( loadErrors.length > 0 ) {
                alert( 'loadErrors: ', loadErrors.toString() );
            }
        }

        //get query string parameter

        function getURLParameter( name ) {
            return decodeURI(
                ( RegExp( name + '=' + '(.+?)(&|$)' ).exec( location.search ) || [ , null ] )[ 1 ]
            );
        }
    } );
