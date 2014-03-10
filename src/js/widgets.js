define( [ 'text!enketo-config', 'Modernizr', 'jquery' ], function( configStr, Modernizr, $ ) {
    "use strict";

    var $form,
        widgetConfig = [],
        loaded = false,
        globalConfig = JSON.parse( configStr );

    /**
     * Initializes widgets
     *
     * @param  {jQuery} $group The element inside which the widgets have to be initialized.
     */

    function init( $group ) {
        $form = $( 'form.or' );
        $group = $group || $form;

        if ( !loaded ) {
            load( function() {
                create( $group );
            } );
        } else {
            create( $group );
        }
    }

    /**
     * load the widget modules (asynchronously)
     *
     * @param  {Function} callback
     */

    function load( callback ) {
        require( globalConfig.widgets, function() {
            var id,
                widgetConfigFiles = [];

            //console.log( 'widget modules loaded', arguments.length );

            //add widget configuration to config object
            for ( var i = 0; i < globalConfig.widgets.length; i++ ) {
                id = 'text!' + globalConfig.widgets[ i ].substr( 0, globalConfig.widgets[ i ].lastIndexOf( '/' ) + 1 ) + 'config.json';
                widgetConfigFiles.push( id );
            }

            //load widget config files
            require( widgetConfigFiles, function() {
                for ( var i = 0; i < arguments.length; i++ ) {
                    widgetConfig.push( JSON.parse( arguments[ i ] ) );
                }
                //console.log( 'widget config files loaded', widgetConfig.length );
                loaded = true;
                callback();
            } );
        } );
    }

    /**
     * Returns the elements on which to apply the widget
     *
     * @param  {jQuery} $group   a jQuery-wrapped element
     * @param  {string} selector if the selector is null, the form element will be returned
     * @return {jQuery}          a jQuery collection
     */

    function getElements( $group, selector ) {
        return ( selector ) ? $group.find( selector ) : $form;
    }

    /**
     * Enables widgets if they weren't enabled already when the branch was enabled by the controller.
     * In most widgets, this function will do nothing because the disabled attribute was automatically removed from all
     * fieldsets, inputs, textareas and selects inside the branch element provided as parameter.
     * Note that this function can be called before the widgets have been initialized and will in that case do nothing. This is
     * actually preferable than waiting for create() to complete, because enable() will never do anything that isn't
     * done during create().
     *
     * @param  {jQuery} $group [description]
     */

    function enable( $group ) {
        var widget, $els;

        //console.debug( 'enabling widgets in ', $group );

        for ( var i = 0; i < widgetConfig.length; i++ ) {
            widget = widgetConfig[ i ];
            if ( widget.name ) {
                $els = getElements( $group, widget.selector );
                $els[ widget.name ]( 'enable' );
            }
        }
    }

    /**
     * Disables  widgets, if they aren't disabled already when the branch was disabled by the controller.
     * In most widgets, this function will do nothing because all fieldsets, inputs, textareas and selects will get
     * the disabled attribute automatically when the branch element provided as parameter becomes irrelevant.
     *
     * @param  { jQuery } $group The element inside which all widgets need to be disabled.
     */

    function disable( $group ) {
        var widget, $els;

        //console.debug( 'disabling widgets in ', $group );

        for ( var i = 0; i < widgetConfig.length; i++ ) {

            widget = widgetConfig[ i ];
            if ( widget.name ) {
                $els = getElements( $group, widget.selector );
                $els[ widget.name ]( 'disable' );
            }

        }
    }

    /**
     * Fixes deeply cloned widgets, if necessary. This function is only called with the repeat clone as a parameter.
     * Many eventhandlers inside widgets get messed up when they are cloned. If so this function will have to fix
     * that. The init function is called programmatically immediately afterwards.
     *
     * @param  {jQuery} $group The element inside which all widgets need to be fixed.
     */

    function destroy( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgetConfig.length; i++ ) {
            widget = widgetConfig[ i ];
            if ( widget.name ) {
                $els = getElements( $group, widget.selector );
                $els[ widget.name ]( 'destroy' );
            }
        }
    }

    /**
     * Creates widgets upon initialization of the form or on a cloned element after having called 'destroy' first
     *
     * @param  {jQuery} $group The elements inside which widgets need to be created.
     */

    function create( $group ) {
        var widget, $els;

        //console.log( 'widgets', widgetConfig );
        for ( var i = 0; i < widgetConfig.length; i++ ) {
            widget = widgetConfig[ i ];
            widget.options = widget.options || {};
            widget.options.touch = Modernizr.touch;

            // if the widget is a css-only widget
            if ( !widget.name ) {
                //console.log( 'CSS-only widget', widgetConfig[ i ] );
            } else if ( !widget.selector && widget.selector !== null ) {
                console.error( 'widget configuration has no acceptable selector property', widget );
            } else {
                $els = getElements( $group, widget.selector );

                $els[ widget.name ]( widget.options );

                setLangChangeHandler( widget, $els );
                setOptionChangeHandler( widget, $els );
            }
        }
    }

    /**
     * Calls widget('update') when the language changes. This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */

    function setLangChangeHandler( widget, $els ) {
        //call update for all widgets when language changes 
        if ( $els.length > 0 ) {
            $form.on( 'changelanguage', function() {
                //console.debug( 'change language event detected, going to update', widget.name );
                $els[ widget.name ]( 'update' );
            } );
        }
    }

    /**
     * Calls widget('update') on select-type widgets when the options change.This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */

    function setOptionChangeHandler( widget, $els ) {
        if ( $els.length > 0 && $els.prop( 'nodeName' ).toLowerCase() === 'select' ) {
            $form.on( 'changeoption', 'select', function() {
                //console.debug( 'option change detected, going to update', widget.name, 'for', $( this ) );
                //update (itemselect) picker on which event was triggered because the options changed
                $( this )[ widget.name ]( 'update' );
            } );
        }
    }

    return {
        init: init,
        enable: enable,
        disable: disable,
        destroy: destroy
    };

} );
