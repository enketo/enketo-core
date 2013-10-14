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

  var pluginName = 'tablewidget';

  function Tablewidget( element, options ) {
    this.element = element;
    this.options = options;
    this.name = pluginName;
    this.init( );
  }

  Tablewidget.prototype = {

    init: function( ) {
      var that = this;
      $( this.element ).parent( ).parent( ).find( '.jr-appearance-field-list .jr-appearance-list-nolabel, .jr-appearance-field-list .jr-appearance-label' )
        .parent( ).parent( '.jr-appearance-field-list' ).each( function( ) {
          // remove the odd input element that XLSForm adds for the 'easier table method'
          // see https://github.com/modilabs/pyxform/issues/72
          $( this ).find( 'input[readonly]' ).remove( );
          // fix the column widths, after any ongoing animations have finished
          $( this ).promise( ).done( function( ) {
            $( this ).find( '.jr-appearance-label label>img' ).parent( ).css( 'width', 'auto' ).toSmallestWidth( );
            $( this ).find( '.jr-appearance-label label, .jr-appearance-list-nolabel label' ).css( 'width', 'auto' ).toLargestWidth( );
            $( this ).find( 'legend' ).css( 'width', 'auto' ).toLargestWidth( 35 );

          } );
        } );
    },

    destroy: function( ) {
      console.debug( pluginName, 'destroy called' );
    },

    enable: function( ) {
      console.debug( pluginName, 'enable called' );
      this.init( );
    },

    disable: function( ) {
      console.debug( pluginame, 'disable called' );
    },

    update: function( ) {
      console.debug( pluginName, 'update called' );
    }
  };


  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function( ) {
      var $this = $( this ),
        data = $this.data( pluginName );

      options = options || {};

      if ( !data ) {
        $this.data( pluginName, ( data = new Tablewidget( this, options, event ) ) );
      }
      if ( typeof options == 'string' ) {
        data[ options ]( );
      }
    } );
  };

  $.fn[ pluginName ].Constructor = Tablewidget;

} ) );