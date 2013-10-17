/**
 * Widget super Class. Extend this class to get some of the basic functionality out of the box!
 *
 * pattern: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
 */

define( [ 'jquery' ], function( $ ) {

  /**
   * A Widget class that can be extended to provide some of the basic widget functionality out of the box.
   * pattern: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
   *
   * @constructor
   * @param {Element} element The DOM element the widget is applied on
   * @param {(boolean|{touch: boolean})} options Options passed to the widget during instantiation
   * @param {[type]} event Not sure, this may not be necessary but the desktopSelectpicker does something with it
   */
  var Widget = function( element, options, event ) {
    this.element = element;
    this.options = options || {};
    this.options.touch = ( typeof this.options.touch !== 'undefined' ) ? this.options.touch : false;
    this.event = event || null;
    this.namespace = this.constructor.toString( ).match( /function (\w*)/ )[ 1 ].toLowerCase( );
  };

  Widget.prototype = {
    /**
     * Destroys (a deeply cloned) widget (inside a repeat)
     * The sole purpose of this function in Enketo is to ensure a widget inside a cloned repeat stays
     * fully functional. The most robust way of doing this is to destroy the copy and then reinitialize it.
     * This is what the repeat controller does. It calls $input.mywidget('destroy') and $input.mywidget({}) in succession.
     * In some rare cases, this may simply be an empty function (e.g. see note widget).
     *
     * @param  {Element} element The element the widget is applied on
     */
    destroy: function( element ) {
      $( element )
      //data is not used elsewhere by enketo
      .removeData( this.namespace )
      //remove all the event handlers that used this.namespace as the namespace
      .off( '.' + this.namespace )
      //show the original element
      .show( )
      //remove elements after the target that have the widget class
      .next( '.widget' ).remove( );
      console.debug( this.namespace, 'destroyed data and handlers with namespace: ' + this.namespace );
    },
    /**
     * Do whatever necessary to ensure that the widget does not allow user input if its parent branch is disabled.
     * Most of the times this branch can remain empty.
     * Check with $('.jr-branch').show() whether input is disabled in a disabled branch.
     */
    disable: function( ) {
      console.debug( this.namespace, 'disable' );
    },
    /**
     * Does whatever necessary to enable the widget if its parent branch is enabled.
     * Most of the times this function can remain empty.
     */
    enable: function( ) {
      console.debug( this.namespace, 'enable' );
    },
    /**
     * Updates languages and <option>s (cascading selects.
     * Most of the times this function can remain empty
     */
    update: function( ) {
      console.debug( this.namespace, 'update' );
    }

  };

  return Widget;
} );