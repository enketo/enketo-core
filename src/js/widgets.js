define( [ 'text!enketo-config', 'enketo-js/support', 'q', 'jquery' ], function( configStr, support, Q, $ ) {
    'use strict';

    var $form, init, enable, disable, destroy,
        _getWidgetConfigs, _getElements, _instantiate, _load, _setLangChangeHandler, _setOptionChangeHandler,
        widgets = [];

    /**
     * Initializes widgets
     *
     * @param  {jQuery} $group The element inside which the widgets have to be initialized.
     */

    init = function( $group ) {
        $form = $( 'form.or' );
        $group = $group || $form;

        _getWidgetConfigs( JSON.parse( configStr ) )
            .then( function( widgets ) {
                _instantiate( $group );
            } );
    };

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
    enable = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {
            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'enable' );
            }
        }
    };

    /**
     * Disables  widgets, if they aren't disabled already when the branch was disabled by the controller.
     * In most widgets, this function will do nothing because all fieldsets, inputs, textareas and selects will get
     * the disabled attribute automatically when the branch element provided as parameter becomes irrelevant.
     *
     * @param  { jQuery } $group The element inside which all widgets need to be disabled.
     */
    disable = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {

            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'disable' );
            }
        }
    };

    /**
     * Fixes deeply cloned widgets, if necessary. This function is only called with the repeat clone as a parameter.
     * Many eventhandlers inside widgets get messed up when they are cloned. If so this function will have to fix
     * that. The init function is called programmatically immediately afterwards.
     *
     * @param  {jQuery} $group The element inside which all widgets need to be fixed.
     */
    destroy = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {

            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'destroy' );
            }
        }
    };

    /**
     * Loads the widget configuration files (asynchronously)
     *
     * @param { {widgets:<string> }} config client configuration object
     * @param  {Function} callback
     */
    _getWidgetConfigs = function( config ) {
        var id, widget,
            deferred = Q.defer(),
            widgetConfigFiles = [];

        //add widget configuration to config object
        for ( var i = 0; i < config.widgets.length; i++ ) {
            id = 'text!' + config.widgets[ i ].substr( 0, config.widgets[ i ].lastIndexOf( '/' ) + 1 ) + 'config.json';
            widgetConfigFiles.push( id );
        }

        //load widget config files
        require( widgetConfigFiles, function() {

            for ( var i = 0; i < arguments.length; i++ ) {
                widget = JSON.parse( arguments[ i ] );
                widget.path = config.widgets[ i ];
                widgets.push( widget );
            }

            deferred.resolve( widgets );
        } );

        return deferred.promise;
    };

    /**
     * Returns the elements on which to apply the widget
     *
     * @param  {jQuery} $group   a jQuery-wrapped element
     * @param  {string} selector if the selector is null, the form element will be returned
     * @return {jQuery}          a jQuery collection
     */
    _getElements = function( $group, selector ) {
        return ( selector ) ? ( selector === 'form' ? $form : $group.find( selector ) ) : $();
    };

    /**
     * Instantiate widgets on a group (whole form or newly cloned repeat)
     *
     * @param  {jQuery} $group The elements inside which widgets need to be created.
     */
    _instantiate = function( $group ) {

        widgets.forEach( function( widget ) {
            var $elements;
            widget.options = widget.options || {};
            widget.options.touch = support.touch;

            if ( !widget.selector && widget.selector !== null ) {
                return console.error( 'widget configuration has no acceptable selector property', widget );
            }

            $elements = _getElements( $group, widget.selector );

            if ( !$elements.length ) {
                return;
            }

            if ( !widget.load ) {
                widget.load = _load( widget );
            }

            widget.load
                .then( function( widget ) {
                    // if the widget is not a css-only widget
                    if ( widget.name ) {
                        $elements[ widget.name ]( widget.options );
                        _setLangChangeHandler( widget, $elements );
                        _setOptionChangeHandler( widget, $elements );
                    }
                } );
        } );
    };

    /**
     * Loads a widget module.
     *
     * @param  {[type]} widget [description]
     * @return {[type]}        [description]
     */
    _load = function( widget ) {
        var deferred = Q.defer();
        require( [ widget.path ], function( widgetName ) {
            widget.name = widgetName;
            deferred.resolve( widget );
        } );

        return deferred.promise;
    };

    /**
     * Calls widget('update') when the language changes. This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */
    _setLangChangeHandler = function( widget, $els ) {
        // call update for all widgets when language changes 
        if ( $els.length > 0 ) {
            $form.on( 'changelanguage', function() {
                $els[ widget.name ]( 'update' );
            } );
        }
    };

    /**
     * Calls widget('update') on select-type widgets when the options change.This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */

    _setOptionChangeHandler = function( widget, $els ) {
        if ( $els.length > 0 && $els.prop( 'nodeName' ).toLowerCase() === 'select' ) {
            $form.on( 'changeoption', 'select', function() {
                // update (itemselect) picker on which event was triggered because the options changed
                $( this )[ widget.name ]( 'update' );
            } );
        }
    };

    return {
        init: init,
        enable: enable,
        disable: disable,
        destroy: destroy
    };

} );
