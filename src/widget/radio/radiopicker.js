/**
 * Radio button picker
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

  var pluginName = 'radiopicker';

  /**
   * Enhances radio buttons
   * @constructor
   * @param {Element} element Element to apply widget to.
   * @param {(boolean|{touch: boolean})} options options
   * @param {*=} e     event
   */

  function Radiopicker( element, options, e ) {
    this.element = element;
    this.options = options;
    this.name = pluginName;
    this.init( );
  }

  Radiopicker.prototype = {

    init: function( ) {
      this.setDelegatedHandlers( );
      if ( this.options.touch ) {
        this.setMobileClass( );
      }
    },

    setDelegatedHandlers: function( ) {
      var $label,
        $form = $( this.element );
      console.log( 'form', $form );
      //applies a data-checked attribute to the parent label of a checked checkbox and radio button
      $form.on( 'click', 'input[type="radio"]:checked', function( event ) {
        $( this ).parent( 'label' ).siblings( ).removeAttr( 'data-checked' ).end( ).attr( 'data-checked', 'true' );
      } );

      $form.on( 'click', 'input[type="checkbox"]', function( event ) {
        $label = $( this ).parent( 'label' );
        if ( $( this ).is( ':checked' ) ) $label.attr( 'data-checked', 'true' );
        else $label.removeAttr( 'data-checked' );
      } );

      //defaults
      $form.find( 'input[type="radio"]:checked, input[type="checkbox"]:checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

      //add unselect functionality
      $form.on( 'click', '[data-checked]>input[type="radio"]', function( event ) {
        $( this ).prop( 'checked', false ).trigger( 'change' ).parent( ).removeAttr( 'data-checked' );
      } );
    },

    //TODO: check performance difference
    //if this is done in pure CSS instead of with the help of javascript.
    setMobileClass: function( ) {
      var $form = $( this.element );

      $form.find( 'fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact, .jr-appearance-label, .jr-appearance-list-nolabel )' )
        .children( 'label' )
        .children( 'input[type="radio"], input[type="checkbox"]' )
        .parent( 'label' )
        .addClass( 'btn-radiocheck' );
    },

    destroy: function( ) {
      //all handlers are global and deep copies of repeats should keep funtcionality intact
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
    //this widget works globally, and only needs to be instantiated once per form
    var $this = $( this ),
      data = $this.data( pluginName );

    options = options || {};

    if ( !data ) {
      $this.data( pluginName, ( data = new Radiopicker( $this[ 0 ], options, event ) ) );
    }
    if ( typeof options == 'string' ) {
      data[ options ]( );
    }

    return this;
  };

  $.fn[ pluginName ].Constructor = Radiopicker;

} ) );