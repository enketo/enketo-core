/**
 * Table widget
 */

( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( [ 'jquery', 'js/plugins' ], factory );
  } else {
    // Browser globals
    factory( jQuery );
  }
}( function( $ ) {
  "use strict";

  $.fn.tablewidget = function( ) {

    return this.each( function( ) {
      var that = this;
      setTimeout( function( ) {
        // When loading a form dynamically the DOM elements don't have a width yet (width = 0), 
        // so we call this with a bit of a delay.
        $( that ).parent( ).parent( ).find( '.jr-appearance-field-list .jr-appearance-list-nolabel, .jr-appearance-field-list .jr-appearance-label' )
          .parent( ).parent( '.jr-appearance-field-list' ).each( function( ) {
            console.log( 'found this table', $( this ) );
            // remove the odd input element that XLSForm adds for the 'easier method'
            // see https://github.com/modilabs/pyxform/issues/72
            console.log( 'removing weird readonly input', $( this ).find( 'input[readonly]' ) );
            //$( this ).find( 'input[readonly]' ).remove( );
            // fix the column widths
            $( this ).find( '.jr-appearance-label label>img' ).parent( ).css( 'width', 'auto' ).toSmallestWidth( );
            $( this ).find( 'label' ).css( 'width', 'auto' ).toLargestWidth( );
            $( this ).find( 'legend' ).css( 'width', 'auto' ).toLargestWidth( 35 );
          } );
      }, 50 );
    } );
  };
} ) );