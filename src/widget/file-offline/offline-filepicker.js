/**
 * Offline-file picker widget
 */
( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( [ 'jquery' ], factory );
  } else {
    // Browser globals
    factory( jQuery );
  }
}( function( $ ) {
  "use strict";

  var pluginName = 'geopointpicker';
  /**
   * File picker Class
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{btnStyle: string, noneSelectedText: string, maxlength:number})} options options
   * @param {*=} e     event
   */
  var OfflineFilepicker = function( element, options, e ) {
    if ( e ) {
      e.stopPropagation( );
      e.preventDefault( );
    }
    this.$fileInput = $( element );
    this.nameAttr = this.$fileInput.attr( 'name' );
    this.$fileNameInput = null;
    this.init( );
  };

  OfflineFilepicker.prototype = {

    constructor: OfflineFilepicker,

    init: function( ) {
      this.$fileInput.addClass( 'ignore' );
      this.$fileNameInput = $( '<input type="hidden" />' ).attr( 'name', this.nameAttr ).after( this.$fileInput );
      this.changeListener( );
    },

    changeListener: function( ) {
      var that = this;

      this.$fileInput.on( 'change', function( e ) {
        e.stopImmediatePropagation( );

      } );
    },

    getPersistentName: function( ) {

    }
  };

  /**
   *
   * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
   * @param {*=} event       [description]
   */
  $.fn[ pluginName ] = function( option, event ) {

    return this.each( function( ) {
      var $this = $( this ),
        data = $this.data( pluginName );

      options = options || {};

      if ( !data ) {
        $this.data( pluginName, ( data = new OfflineFilepicker( this, options, event ) ) );
      }
      if ( typeof options == 'string' ) {
        data[ options ]( );
      }
    } );
  };

} ) );