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

  var pluginName = 'notewidget';

  /**
   * [Notewidget description]
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{touch: boolean, repeat: boolean})} options options
   * @param {*=} e     event
   */

  function Notewidget( element, options ) {
    this.element = element;
    this.options = options;
    this.name = pluginName;
    this.init( );
  }

  Notewidget.prototype = {

    init: function( ) {
      $( this.element ).parent( 'label' ).each( function( ) {
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
    },

    destroy: function( ) {
      console.debug( pluginName, 'destroy called' );
    },

    enable: function( ) {
      console.debug( pluginName, 'enable called' );
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
        data = $this.data( pluginName ),
        options = options || {};

      if ( !data ) {
        $this.data( pluginName, ( data = new Notewidget( this, options, event ) ) );
      }
      if ( typeof options == 'string' ) {
        data[ options ]( );
      }
    } );
  };

  $.fn[ pluginName ].Constructor = Notewidget;

} ) );