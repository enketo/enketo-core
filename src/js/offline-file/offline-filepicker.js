/**
 * Offline-file picker widget
 */
( function( $ ) {

  "use strict";
  /**
   * File picker Class
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{btnStyle: string, noneSelectedText: string, maxlength:number})} options options
   * @param {*=} e     event
   */
  var OfflineFilepicker = function( element, options, e ) {
    if ( e ) {
      e.stopPropagation();
      e.preventDefault();
    }
    this.$fileInput = $( element );
    this.nameAttr = this.$fileInput.attr( 'name' );
    this.$fileNameInput = null;
    this.init();
  };

  OfflineFilepicker.prototype = {

    constructor: OfflineFilepicker,

    init: function() {
      this.$fileInput.addClass( 'ignore' );
      this.$fileNameInput = $( '<input type="hidden" />' ).attr( 'name', this.nameAttr ).after( this.$fileInput );
      this.changeListener();
    },

    changeListener: function() {
      var that = this;

      this.$fileInput.on( 'change', function( e ) {
        e.stopImmediatePropagation();

      } );
    },

    getPersistentName: function() {

    }
  };

  /**
   *
   * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
   * @param {*=} event       [description]
   */
  $.fn.offlineFilepicker = function( option, event ) {
    return this.each( function() {
      var $this = $( this ),
        data = $this.data( 'offlinefilepicker' ),
        options = typeof option == 'object' && option;

      if ( !data ) {
        $this.data( 'offlinefilepicker', ( data = new OfflineFilepicker( this, options, event ) ) );
      }
      if ( typeof option == 'string' ) {
        data[ option ]();
      }
    } );
  };

  $.fn.offlineFilepicker.Constructor = OfflineFilepicker;

} )( window.jQuery );