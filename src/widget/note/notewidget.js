/**
 * Note widget (turns notes into triggers)
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

  $.fn.notewidget = function( ) {

    return this.each( function( ) {
      $( this ).parent( 'label' ).each( function( ) {
        console.log( 'converting readonly to trigger', $( this ) );
        var relevant = $( this ).find( 'input' ).attr( 'data-relevant' ),
          branch = ( relevant ) ? ' jr-branch pre-init' : '',
          name = 'name="' + $( this ).find( 'input' ).attr( 'name' ) + '"',
          attributes = ( typeof relevant !== 'undefined' ) ? 'data-relevant="' + relevant + '" ' + name : name,
          value = $( this ).find( 'input, select, textarea' ).val( ),
          html = $( this ).markdownToHtml( ).html( );
        $( '<fieldset class="trigger alert alert-block' + branch + '" ' + attributes + '></fieldset>' )
          .insertBefore( $( this ) ).append( html ).append( '<div class="note-value">' + value + '</div>' ).find( 'input' ).remove( );
        $( this ).remove( );
      } );
    } );
  };
} ) );