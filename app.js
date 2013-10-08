requirejs.config( {
  baseUrl: 'lib/',
  paths: {
    app: '../src/js',
    root: '../'
  },
  shim: {
    'xpath/build/xpathjs_javarosa': {
      exports: 'XPathJS'
    },
    'bootstrap-datepicker/js/bootstrap-datepicker': {
      deps: [ 'jquery' ],
      exports: 'jQuery.fn.datepicker'
    },
    'bootstrap-timepicker/js/bootstrap-timepicker': {
      deps: [ 'jquery' ],
      exports: 'jQuery.fn.timepicker'
    }
  }
} );

define( 'modernizr', [ ], Modernizr );

requirejs( [ 'jquery', 'modernizr', 'app/Form' ],
  function( $, modernizr, Form ) {
    var loadErrors, form;

    //if querystring touch=true is added, override Modernizr
    if ( window.location.search.indexOf( 'touch=true' ) > 0 ) {
      modernizr.touch = true;
      $( 'html' ).addClass( 'touch' );
    }

    form = new Form( 'form.jr:eq(0)', dataStr );

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
      }
    } );
  } );