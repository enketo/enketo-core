define( [ 'text!config', 'modernizr', 'jquery' ], function( config, modernizr, $ ) {
  "use strict";

  var $form = $( 'form.jr' ),
    loaded = false,
    globalConfig = JSON.parse( config ),
    widgetConfig = [ ];

  /**
   * load the widget modules (asynchronously)
   * @param  {Function} callback
   */

  function load( callback ) {
    require( globalConfig.widgets, function( ) {
      var id, widgetConfigFiles = [ ];

      console.log( 'widget modules loaded', arguments );
      //add widget configuration to config object
      for ( var i = 0; i < globalConfig.widgets.length; i++ ) {
        id = 'text!' + globalConfig.widgets[ i ].substr( 0, globalConfig.widgets[ i ].lastIndexOf( '/' ) + 1 ) + 'config.json';
        widgetConfigFiles.push( id );
      }
      require( widgetConfigFiles, function( ) {
        for ( var i = 0; i < arguments.length; i++ ) {
          widgetConfig.push( JSON.parse( arguments[ i ] ) );
        }
        console.log( 'widget config files loaded', widgetConfig[ 0 ] );
        loaded = true;
        callback( );
      } );
    } );
  }

  function init( $group ) {
    $group = $group || $form;
    console.log( 'init called with loaded: ', loaded );
    if ( !loaded ) {
      load( function( ) {
        create( $group );
      } );
    } else {
      create( $group );
    }
  }

  function destroy( $group ) {
    $group = $group || $form;
  }

  function create( $group ) {
    var widget,
      repeat = $group.hasClass( 'jr-repeat' );

    for ( var i = 0; i < widgetConfig.length; i++ ) {
      var $els;
      widget = widgetConfig[ i ];
      widget.options = widget.options || {};
      if ( !widget.name || !widget.selector ) {
        return console.error( 'widget configuration has no name and/or selector property', widget );
      }
      $els = $group.find( widget.selector );
      $els[ widget.name ]( widget.options );

      //call update for all widgets when language changes 
      $form.on( 'changelanguage', function( ) {
        console.debug( 'change language event detected, going to update', widget.name )
        //update all pickers in form
        $els[ widget.name ]( 'update' );
      } );

      //call update for select widgets if options change
      if ( $els.length > 0 && $els.prop( 'nodeName' ).toLowerCase( ) === 'select' ) {
        $form.on( 'changeoption', 'select', function( ) {
          console.debug( 'option change detected, going to update', widget.name, 'for', $( this ) );
          //update (itemselect) picker on which event was triggered because the options changed
          $( this )[ widget.name ]( 'update' );
        } );
      }
    }
  }

  return {
    init: init,
    destroy: destroy
  };

} );