requirejs.config( {
  baseUrl: 'lib/',
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

define( 'modernizr', [ ], Modernizr );

requirejs( [ 'jquery', 'modernizr', 'js/Form' ],
  function( $, modernizr, Form ) {
    var loadErrors, form;

    //if querystring touch=true is added, override Modernizr
    if ( window.location.search.indexOf( 'touch=true' ) > 0 ) {
      modernizr.touch = true;
      $( 'html' ).addClass( 'touch' );
    }

    form = new Form( 'form.jr:eq(0)', dataStr );
    //for debugging
    window.form = form;
    //initialize form and check for load errors
    loadErrors = form.init( );
    if ( loadErrors.length > 0 ) {
      alert( 'loadErrors: ', loadErrors.toString( ) );
    }

    //validate handler for validate button
    $( '#validate-form' ).on( 'click', function( ) {
      form.validateForm( );
      if ( !form.isValid( ) ) {
        alert( 'Form contains errors. Please see fields marked in red.' );
      } else {
        alert( 'Form is valid! (see XML record in the console)' );
        console.log( 'record:', form.getDataStr( ) );
      }
    } );
  } );