if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function( require, exports, module ) {
    'use strict';
    var FormModel = require( './Form-model' );
    var widgets = require( './widgets-controller' );
    var $ = require( 'jquery' );
    var Promise = require( 'lie' );
    var utils = require( './utils' );
    var t = require( 'translator' ).t;
    var pkg = require( '../../package' );
    var config = require( 'text!enketo-config' );
    require( './plugins' );
    require( './extend' );
    require( 'jquery-touchswipe' );

    /**
     * Class: Form
     *
     * This class provides the JavaRosa form functionality by manipulating the survey form DOM object and
     * continuously updating the data XML Document. All methods are placed inside the constructor (so privileged
     * or private) because only one instance will be created at a time.
     *
     * @param {string} formSelector  jquery selector for the form
     * @param {{modelStr: string, ?instanceStr: string, ?submitted: boolean, ?external: <{id: string, xmlStr: string }> }} data data object containing XML model, (partial) XML instance-to-load, external data and flag about whether instance-to-load has already been submitted before.
     * @param { {?webMapId: string}} options form options
     * 
     * @constructor
     */

    function Form( formSelector, data, options ) {
        var model;
        var cookies;
        var form;
        var $form;
        var $formClone;
        var repeatsPresent;
        var replaceChoiceNameFn;
        var loadErrors = [];

        /**
         * Function: init
         *
         * Initializes the Form instance (XML Model and HTML View).
         *
         */
        this.init = function() {
            // cloning children to keep any delegated event handlers on 'form.or' intact upon resetting
            $formClone = $( formSelector ).clone().appendTo( '<original></original>' );

            model = new FormModel( data );

            // Before initializing form view, passthrough dataupdate event externally
            model.$events.on( 'dataupdate', function( event, updated ) {
                $( formSelector ).trigger( 'dataupdate.enketo', updated );
            } );
            model.$events.on( 'validated', function( event, updated ) {
                $( formSelector ).trigger( 'validated.enketo', updated );
            } );
            model.$events.on( 'removed', function( event, updated ) {
                $( formSelector ).trigger( 'removed.enketo', updated );
            } );

            loadErrors = loadErrors.concat( model.init() );

            form = new FormView( formSelector, options );

            repeatsPresent = ( $( formSelector ).find( '.or-repeat' ).length > 0 );

            loadErrors = loadErrors.concat( form.init() );

            document.querySelector( 'body' ).scrollIntoView();

            return loadErrors;
        };

        this.ex = function( expr, type, selector, index, tryNative ) {
            return model.evaluate( expr, type, selector, index, tryNative );
        };
        this.getModel = function() {
            return model;
        };
        this.getInstanceID = function() {
            return model.getInstanceID();
        };
        this.getDeprecatedID = function() {
            return model.getDeprecatedID();
        };
        this.getInstanceName = function() {
            return model.getInstanceName();
        };
        this.getView = function() {
            return form;
        };
        this.getEncryptionKey = function() {
            return form.$.data( 'base64rsapublickey' );
        };
        this.getAction = function() {
            return form.$.attr( 'action' );
        };
        this.getMethod = function() {
            return form.$.attr( 'method' );
        };
        this.getVersion = function() {
            return model.getVersion();
        };

        /**
         * Obtains a string of primary instance.
         * 
         * @param  {!{include: boolean}=} include optional object items to exclude if false
         * @return {string}        XML string of primary instance
         */
        this.getDataStr = function( include ) {
            include = ( typeof include !== 'object' || include === null ) ? {} : include;
            // By default everything is included
            if ( include.irrelevant === false ) {
                return form.getDataStrWithoutIrrelevantNodes();
            }
            return model.getStr();
        };

        this.getRecordName = function() {
            return form.recordName.get();
        };
        /**
         * @param {string} name
         */
        this.setRecordName = function( name ) {
            return form.recordName.set( name );
        };
        /**
         * @param { boolean } status [description]
         */
        this.setEditStatus = function( status ) {
            return form.editStatus.set( status );
        };
        this.getEditStatus = function() {
            return form.editStatus.get();
        };
        this.getSurveyName = function() {
            return $form.find( '#form-title' ).text();
        };
        /**
         * Clears the values of all irrelevant questions in the model (and view).
         */
        this.clearIrrelevant = function() {
            return form.clearIrrelevant();
        };

        /**
         * Restores HTML form to pre-initialized state. It is meant to be called before re-initializing with
         * new Form ( .....) and form.init()
         * For this reason, it does not fix event handler, $form, formView.$ etc.!
         * It also does not affect the XML instance!
         */
        this.resetView = function() {
            //form language selector was moved outside of <form> so has to be separately removed
            $( '#form-languages' ).remove();
            $form.replaceWith( $formClone );
        };
        /**
         * @deprecated
         * @type {Function}
         */
        this.resetHTML = this.resetView;

        /**
         * Validates the whole form and returns true or false
         *
         * @return {boolean}
         */
        this.validate = function() {
            return form.validateAll();
        };
        /**
         * Returns wether form has validated as true or false. Needs to be called AFTER calling validate()!
         *
         *  @return {!boolean}
         */
        this.isValid = function() {
            return form.isValid();
        };

        /**
         * Implements jr:choice-name
         * TODO: this needs to work for all expressions (relevants, constraints), now it only works for calculated items
         * Ideally this belongs in the form Model, but unfortunately it needs access to the view
         * 
         * @param  {[type]} expr       [description]
         * @param  {[type]} resTypeStr [description]
         * @param  {[type]} selector   [description]
         * @param  {[type]} index      [description]
         * @param  {[type]} tryNative  [description]
         * @return {[type]}            [description]
         */
        replaceChoiceNameFn = function( expr, resTypeStr, selector, index, tryNative ) {
            var value;
            var name;
            var $input;
            var label = '';
            var matches = expr.match( /jr:choice-name\(([^,]+),\s?'(.*?)'\)/ );

            if ( matches ) {
                value = model.evaluate( matches[ 1 ], resTypeStr, selector, index, tryNative );
                name = matches[ 2 ].trim();
                $input = $form.find( '[name="' + name + '"]' );

                if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                    label = $input.find( '[value="' + value + '"]' ).text();
                } else if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'input' ) {
                    label = $input.filter( function() {
                        return $( this ).attr( 'value' ) === value;
                    } ).siblings( '.option-label.active' ).text();
                }
                return expr.replace( matches[ 0 ], '"' + label + '"' );
            }
            return expr;
        };

        /**
         * Inner Class dealing with the HTML Form
         * @param {string} selector jQuery selector of form
         * @constructor
         * @extends Form
         */

        function FormView( selector, options ) {
            //there will be only one instance of FormView
            $form = $( selector );
            //used for testing
            this.$ = $form;
            this.$nonRepeats = {};
            this.options = typeof options !== 'object' ? {} : options;
            if ( typeof this.options.clearIrrelevantImmediately === 'undefined' ) {
                this.options.clearIrrelevantImmediately = true;
            }
        }

        FormView.prototype.init = function() {
            var that = this;

            if ( typeof model === 'undefined' || !( model instanceof FormModel ) ) {
                return console.error( 'variable data needs to be defined as instance of FormModel' );
            }

            try {
                this.preloads.init( this );

                // before widgets.init (as instanceID used in offlineFilepicker widget)
                // store the current instanceID as data on the form element so it can be easily accessed by e.g. widgets
                $form.data( {
                    instanceID: model.getInstanceID()
                } );

                // before calcUpdate!
                this.grosslyViolateStandardComplianceByIgnoringCertainCalcs();

                // before repeat.init to make sure the jr:repeat-count calculation has been evaluated
                this.calcUpdate();

                // before itemsetUpdate
                this.langs.init();

                // after radio button data-name setting
                this.repeat.init( this );

                // after repeat.init()
                this.itemsetUpdate();

                // after repeat.init()
                this.setAllVals();

                // after setAllVals(), after repeat.init()

                this.options.input = this.input;
                this.options.pathToAbsolute = this.pathToAbsolute;
                this.options.evaluate = model.evaluate.bind( model );
                this.options.formClasses = utils.toArray( $form.get( 0 ).classList );
                widgets.init( null, this.options );

                // after widgets.init(), and repeat.init()
                this.branchUpdate();

                // after branch.init();
                this.pages.init();

                // after repeat.init()
                this.outputUpdate();

                // after widgets init to make sure widget handlers are called before
                // after loading existing instance to not trigger an 'edit' event
                this.setEventHandlers();

                // update field calculations again to make sure that dependent
                // field values are calculated
                this.calcUpdate();

                this.editStatus.set( false );

                setTimeout( function() {
                    that.progress.update();
                }, 0 );

                return [];
            } catch ( e ) {
                return [ e.name + ': ' + e.message ];
            }
        };

        FormView.prototype.pages = {
            active: false,
            $current: [],
            $activePages: $(),
            init: function() {

                if ( $form.hasClass( 'pages' ) ) {
                    var $allPages = $form.find( ' .question:not([role="comment"]), .or-appearance-field-list' )
                        .filter( function() {
                            // something tells me there is a more efficient way to doing this
                            // e.g. by selecting the descendants of the .or-appearance-field-list and removing those
                            return $( this ).parent().closest( '.or-appearance-field-list' ).length === 0;
                        } )
                        .attr( 'role', 'page' );

                    if ( $allPages.length > 1 || $allPages.eq( 0 ).hasClass( 'or-repeat' ) ) {
                        this.$formFooter = $( '.form-footer' );
                        this.$btnFirst = this.$formFooter.find( '.first-page' );
                        this.$btnPrev = this.$formFooter.find( '.previous-page' );
                        this.$btnNext = this.$formFooter.find( '.next-page' );
                        this.$btnLast = this.$formFooter.find( '.last-page' );

                        this.updateAllActive( $allPages );
                        this.toggleButtons( 0 );
                        this.setButtonHandlers();
                        this.setRepeatHandlers();
                        this.setBranchHandlers();
                        this.setSwipeHandlers();
                        this.active = true;
                        this.flipToFirst();
                    } else {
                        $form.removeClass( 'pages' );
                    }
                }
            },
            setButtonHandlers: function() {
                var that = this;
                // Make sure eventhandlers are not duplicated after resetting form.
                this.$btnFirst.off( '.pagemode' ).on( 'click.pagemode', function() {
                    that.flipToFirst();
                    return false;
                } );
                this.$btnPrev.off( '.pagemode' ).on( 'click.pagemode', function() {
                    that.prev();
                    return false;
                } );
                this.$btnNext.off( '.pagemode' ).on( 'click.pagemode', function() {
                    that.next();
                    return false;
                } );
                this.$btnLast.off( '.pagemode' ).on( 'click.pagemode', function() {
                    that.flipToLast();
                    return false;
                } );
            },
            setSwipeHandlers: function() {
                var that = this;
                var $main = $( '.main' );

                $main.swipe( 'destroy' );
                $main.swipe( {
                    allowPageScroll: 'vertical',
                    threshold: 150,
                    swipeLeft: function() {
                        that.next();
                    },
                    swipeRight: function() {
                        that.prev();
                    }
                } );
            },
            setRepeatHandlers: function() {
                var that = this;
                // TODO: can be optimized by smartly updating the active pages
                $form
                    .off( 'addrepeat.pagemode' )
                    .on( 'addrepeat.pagemode', function( event, index, byCountUpdate ) {
                        that.updateAllActive();
                        // Removing the class in effect avoids the animation
                        // It also prevents multiple .or-repeat[role="page"] to be shown on the same page
                        $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                        // Don't flip if the user didn't create the repeat with the + button.
                        if ( !byCountUpdate ) {
                            that.flipToPageContaining( $( event.target ) );
                        }
                    } )
                    .off( 'removerepeat.pagemode' )
                    .on( 'removerepeat.pagemode', function( event ) {
                        // if the current page is removed
                        // note that that.$current will have length 1 even if it was removed from DOM!
                        if ( that.$current.closest( 'html' ).length === 0 ) {
                            that.updateAllActive();
                            // is it best to go to previous page always?
                            that.flipToPageContaining( $( event.target ) );
                        }
                    } );
            },
            setBranchHandlers: function() {
                var that = this;
                // TODO: can be optimized by smartly updating the active pages
                $form
                    .off( 'changebranch.pagemode' )
                    .on( 'changebranch.pagemode', function() {
                        that.updateAllActive();
                        that.toggleButtons();
                    } );
            },
            getCurrent: function() {
                return this.$current;
            },
            updateAllActive: function( $all ) {
                $all = $all || $( '.or [role="page"]' );
                this.$activePages = $all.filter( function() {
                    return $( this ).closest( '.disabled' ).length === 0 &&
                        ( $( this ).is( '.question' ) || $( this ).find( '.question:not(.disabled)' ).length > 0 );
                } );
            },
            getAllActive: function() {
                return this.$activePages;
            },
            getPrev: function( currentIndex ) {
                return this.$activePages[ currentIndex - 1 ];
            },
            getNext: function( currentIndex ) {
                return this.$activePages[ currentIndex + 1 ];
            },
            getCurrentIndex: function() {
                return this.$activePages.index( this.$current );
            },
            /**
             * Changes the `pages.next()` function to return a `Promise`, wrapping one of the following values:
             *
             * @return {Promise} wrapping {boolean} or {number}.  If a {number}, this is the index into
             *         `$activePages` of the new current page; if a {boolean}, {false} means that validation
             *         failed, and {true} that validation passed, but the page did not change.
             */
            next: function() {
                var that = this;
                var currentIndex;
                var validate;
                this.updateAllActive();
                currentIndex = this.getCurrentIndex();
                validate = ( config.validatePage === false ) ? Promise.resolve( true ) : form.validateContent( this.$current );

                return validate
                    .then( function( valid ) {
                        var next, newIndex;

                        if ( !valid ) {
                            return false;
                        }

                        next = that.getNext( currentIndex );

                        if ( next ) {
                            newIndex = currentIndex + 1;
                            that.flipTo( next, newIndex );
                            return newIndex;
                        }

                        return true;
                    } );
            },
            prev: function() {
                var prev;
                var currentIndex;
                this.updateAllActive();
                currentIndex = this.getCurrentIndex();
                prev = this.getPrev( currentIndex );

                if ( prev ) {
                    this.flipTo( prev, currentIndex - 1 );
                }
            },
            setToCurrent: function( pageEl ) {
                var $n = $( pageEl );
                $n.addClass( 'current hidden' );
                this.$current = $n.removeClass( 'hidden' )
                    .parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).addClass( 'contains-current' ).end();
            },
            flipTo: function( pageEl, newIndex ) {
                // if there is a current page
                if ( this.$current.length > 0 && this.$current.closest( 'html' ).length === 1 ) {
                    // if current page is not same as pageEl
                    if ( this.$current[ 0 ] !== pageEl ) {
                        this.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                        this.setToCurrent( pageEl );
                        this.focusOnFirstQuestion( pageEl );
                        this.toggleButtons( newIndex );
                        $( pageEl ).trigger( 'pageflip.enketo' );
                    }
                } else {
                    this.setToCurrent( pageEl );
                    this.focusOnFirstQuestion( pageEl );
                    this.toggleButtons( newIndex );
                    $( pageEl ).trigger( 'pageflip.enketo' );
                }
            },
            flipToFirst: function() {
                this.updateAllActive();
                this.flipTo( this.$activePages[ 0 ] );
            },
            flipToLast: function() {
                this.updateAllActive();
                this.flipTo( this.$activePages.last()[ 0 ] );
            },
            // flips to the page provided as jQueried parameter or the page containing
            // the jQueried element provided as parameter
            // alternatively, (e.g. if a top level repeat without field-list appearance is provided as parameter)
            // it flips to the page contained with the jQueried parameter;
            flipToPageContaining: function( $e ) {
                var $closest;
                $closest = $e.closest( '[role="page"]' );
                $closest = ( $closest.length === 0 ) ? $e.find( '[role="page"]' ) : $closest;

                //this.updateAllActive();
                this.flipTo( $closest[ 0 ] );
            },
            focusOnFirstQuestion: function( pageEl ) {
                //triggering fake focus in case element cannot be focused (if hidden by widget)
                $( pageEl )
                    .find( '.question:not(.disabled)' )
                    .addBack( '.question:not(.disabled)' )
                    .filter( function() {
                        return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
                    } )
                    .eq( 0 )
                    .find( 'input, select, textarea' )
                    .eq( 0 )
                    .trigger( 'fakefocus' );

                pageEl.scrollIntoView();
            },
            toggleButtons: function( index ) {
                var i = index || this.getCurrentIndex(),
                    next = this.getNext( i ),
                    prev = this.getPrev( i );
                this.$btnNext.add( this.$btnLast ).toggleClass( 'disabled', !next );
                this.$btnPrev.add( this.$btnFirst ).toggleClass( 'disabled', !prev );
                this.$formFooter.toggleClass( 'end', !next );
            }
        };

        // This may not be the most efficient. Could also be implemented like model.Nodeset.
        // Also used for fieldset nodes (to evaluate branch logic).
        FormView.prototype.input = {
            // Multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
            getWrapNodes: function( $inputNodes ) {
                var type = this.getInputType( $inputNodes.eq( 0 ) );
                return ( type === 'fieldset' ) ? $inputNodes : $inputNodes.closest( '.question' );
            },
            /** very inefficient, should actually not be used **/
            getProps: function( $node ) {
                if ( $node.length !== 1 ) {
                    return console.error( 'getProps(): no input node provided or multiple' );
                }
                return {
                    path: this.getName( $node ),
                    ind: this.getIndex( $node ),
                    inputType: this.getInputType( $node ),
                    xmlType: this.getXmlType( $node ),
                    constraint: this.getConstraint( $node ),
                    calculation: this.getCalculation( $node ),
                    relevant: this.getRelevant( $node ),
                    readonly: this.getReadonly( $node ),
                    val: this.getVal( $node ),
                    required: this.getRequired( $node ),
                    enabled: this.isEnabled( $node ),
                    multiple: this.isMultiple( $node )
                };
            },
            getInputType: function( $node ) {
                var nodeName;
                if ( $node.length !== 1 ) {
                    return ''; //console.error('getInputType(): no input node provided or multiple');
                }
                nodeName = $node.prop( 'nodeName' ).toLowerCase();
                if ( nodeName === 'input' ) {
                    if ( $node.attr( 'type' ).length > 0 ) {
                        return $node.attr( 'type' ).toLowerCase();
                    } else {
                        return console.error( '<input> node has no type' );
                    }
                } else if ( nodeName === 'select' ) {
                    return 'select';
                } else if ( nodeName === 'textarea' ) {
                    return 'textarea';
                } else if ( nodeName === 'fieldset' || nodeName === 'section' ) {
                    return 'fieldset';
                } else {
                    return console.error( 'unexpected input node type provided' );
                }
            },
            getConstraint: function( $node ) {
                return $node.attr( 'data-constraint' );
            },
            getRequired: function( $node ) {
                // only return value if input is not a table heading input
                if ( $node.parentsUntil( '.or', '.or-appearance-label' ).length === 0 ) {
                    return $node.attr( 'data-required' );
                }
            },
            getRelevant: function( $node ) {
                return $node.attr( 'data-relevant' );
            },
            getReadonly: function( $node ) {
                return $node.is( '[readonly]' );
            },
            getCalculation: function( $node ) {
                return $node.attr( 'data-calculate' );
            },
            getXmlType: function( $node ) {
                if ( $node.length !== 1 ) {
                    return console.error( 'getXMLType(): no input node provided or multiple' );
                }
                return $node.attr( 'data-type-xml' );
            },
            getName: function( $node ) {
                var name;
                if ( $node.length !== 1 ) {
                    return console.error( 'getName(): no input node provided or multiple' );
                }
                name = $node.attr( 'data-name' ) || $node.attr( 'name' );
                return name || console.error( 'input node has no name' );
            },
            /**
             * Used to retrieve the index of a question amidst all questions with the same name.
             * The index that can be used to find the corresponding node in the model.
             * NOTE: this function should be used sparingly, as it is CPU intensive!
             * TODO: simplify this function by looking for nodes with same CLASS on wrapNode
             *
             * @param  {jQuery} $node The jQuery-wrapped input element
             * @return {number}       The index
             */
            getIndex: function( $node ) {
                var inputType;
                var name;
                var $wrapNode;
                var $wrapNodesSameName;

                if ( $node.length !== 1 ) {
                    return console.error( 'getIndex(): no input node provided or multiple' );
                }

                inputType = this.getInputType( $node );
                name = this.getName( $node );
                $wrapNode = this.getWrapNodes( $node );

                if ( inputType === 'radio' && name !== $node.attr( 'name' ) ) {
                    $wrapNodesSameName = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) );
                }
                // fieldset.or-group wraps fieldset.or-repeat and can have same name attribute!)
                else if ( inputType === 'fieldset' && $node.hasClass( 'or-repeat' ) ) {
                    $wrapNodesSameName = this.getWrapNodes( $form.find( '.or-repeat[name="' + name + '"]' ) );
                } else if ( inputType === 'fieldset' && $node.hasClass( 'or-group' ) ) {
                    $wrapNodesSameName = this.getWrapNodes( $form.find( '.or-group[name="' + name + '"]' ) );
                } else {
                    $wrapNodesSameName = this.getWrapNodes( $form.find( '[name="' + name + '"]' ) );
                }

                return $wrapNodesSameName.index( $wrapNode );
            },
            isMultiple: function( $node ) {
                return ( this.getInputType( $node ) === 'checkbox' || $node.attr( 'multiple' ) !== undefined ) ? true : false;
            },
            isEnabled: function( $node ) {
                return !( $node.prop( 'disabled' ) || $node.parentsUntil( '.or', '.disabled' ).length > 0 );
            },
            getVal: function( $node ) {
                var inputType;
                var values = [];
                var name;

                if ( $node.length !== 1 ) {
                    return console.error( 'getVal(): no inputNode provided or multiple' );
                }
                inputType = this.getInputType( $node );
                name = this.getName( $node );

                if ( inputType === 'radio' ) {
                    return this.getWrapNodes( $node ).find( 'input:checked' ).val() || '';
                }
                // checkbox values bug in jQuery as (node.val() should work)
                if ( inputType === 'checkbox' ) {
                    this.getWrapNodes( $node ).find( 'input[name="' + name + '"]:checked' ).each( function() {
                        values.push( $( this ).val() );
                    } );
                    return values;
                }
                return ( !$node.val() ) ? '' : $node.val();
            },
            setVal: function( name, index, value ) {
                var $inputNodes;
                var type;
                var curVal;

                index = index || 0;

                if ( this.getInputType( $form.find( '[data-name="' + name + '"]' ).eq( 0 ) ) === 'radio' ) {
                    type = 'radio';
                    $inputNodes = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) ).eq( index ).find( '[data-name="' + name + '"]' );
                } else {
                    // why not use this.getIndex?
                    $inputNodes = this.getWrapNodes( $form.find( '[name="' + name + '"]' ) ).eq( index ).find( '[name="' + name + '"]' );
                    type = this.getInputType( $inputNodes.eq( 0 ) );

                    if ( type === 'file' ) {
                        $inputNodes.eq( 0 ).attr( 'data-loaded-file-name', value );
                        // console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
                        //  'this record for editing this file input field will remain unchanged.');
                        return false;
                    }

                    if ( type === 'date' || type === 'datetime' ) {
                        // convert current value (loaded from instance) to a value that a native datepicker understands
                        // TODO test for IE, FF, Safari when those browsers start including native datepickers
                        value = model.node( name, index ).convert( value, type );
                    }
                }

                if ( this.isMultiple( $inputNodes.eq( 0 ) ) === true ) {
                    value = value.split( ' ' );
                } else if ( type === 'radio' ) {
                    value = [ value ];
                }

                // Trigger an 'inputupdate' event which can be used in widgets to update the widget when the value of its 
                // original input element has changed **programmatically**.
                if ( $inputNodes.length ) {
                    curVal = $inputNodes.val();
                    if ( curVal === undefined || curVal.toString() !== value.toString() ) {
                        $inputNodes.val( value );
                        // don't trigger on all radiobuttons/checkboxes
                        $inputNodes.eq( 0 ).trigger( 'inputupdate.enketo' );
                    }
                }

                return;
            },
            validate: function( $input ) {
                return form.validateInput( $input );
            }
        };

        /**
         *  Uses current state of model to set all the values in the form.
         *  Since not all data nodes with a value have a corresponding input element, 
         *  we cycle through the HTML form elements and check for each form element whether data is available.
         */
        FormView.prototype.setAllVals = function( $group, groupIndex ) {
            var index;
            var name;
            var value;
            var that = this;
            var selector = ( $group && $group.attr( 'name' ) ) ? $group.attr( 'name' ) : null;

            groupIndex = ( typeof groupIndex !== 'undefined' ) ? groupIndex : null;

            model.node( selector, groupIndex ).get().find( '*' ).filter( function() {
                var $node = $( this );
                // only return non-empty leafnodes
                return $node.children().length === 0 && $node.text();
            } ).each( function() {
                var $node = $( this );

                try {
                    value = $node.text();
                    name = model.getXPath( $node.get( 0 ), 'instance' );
                    index = model.node( name ).get().index( this );
                    that.input.setVal( name, index, value );
                } catch ( e ) {
                    console.error( e );
                    loadErrors.push( 'Could not load input field value with name: ' + name + ' and value: ' + value );
                }
            } );
            return;
        };

        FormView.prototype.langs = {
            init: function() {
                var lang;
                var that = this;
                var $langSelector = $( '.form-language-selector' );
                var currentDirectionality;

                this.$formLanguages = $form.find( '#form-languages' );
                this.currentLang = this.$formLanguages.attr( 'data-default-lang' ) || this.$formLanguages.find( 'option' ).eq( 0 ).attr( 'value' );
                currentDirectionality = this.$formLanguages.find( '[value="' + this.currentLang + '"]' ).attr( 'data-dir' ) || 'ltr';


                this.$formLanguages
                    .detach()
                    .appendTo( $langSelector )
                    .val( this.currentLang );

                $form
                    .attr( 'dir', currentDirectionality );

                if ( this.$formLanguages.find( 'option' ).length < 2 ) {
                    return;
                }

                $langSelector.removeClass( 'hide' );

                this.$formLanguages.change( function( event ) {
                    event.preventDefault();
                    that.currentLang = $( this ).val();
                    that.setAll( that.currentLang );
                } );
            },
            getCurrentLang: function() {
                return this.currentLang;
            },
            getCurrentLangDesc: function() {
                return this.$formLanguages.find( '[value="' + this.currentLang + '"]' ).text();
            },
            setAll: function( lang ) {
                var that = this;
                var dir = this.$formLanguages.find( '[value="' + lang + '"]' ).attr( 'data-dir' ) || 'ltr';

                $form
                    .attr( 'dir', dir )
                    .find( '[lang]' )
                    .removeClass( 'active' )
                    .filter( '[lang="' + lang + '"], [lang=""]' )
                    .filter( function() {
                        var $this = $( this );
                        return !$this.hasClass( 'or-form-short' ) || ( $this.hasClass( 'or-form-short' ) && $this.siblings( '.or-form-long' ).length === 0 );
                    } )
                    .addClass( 'active' );

                $form.find( 'select, datalist' ).each( function() {
                    that.setSelect( $( this ) );
                } );

                $form.trigger( 'changelanguage' );
            },
            // swap language of <select> and <datalist> <option>s
            setSelect: function( $select ) {
                var value;
                var /** @type {string} */ curLabel;
                var /** @type {string} */ newLabel;
                $select.children( 'option' ).not( '[value=""], [data-value=""]' ).each( function() {
                    var $option = $( this );
                    curLabel = $option.text();
                    value = $option.attr( 'value' ) || $option[ 0 ].dataset.value;
                    newLabel = $option.closest( '.question' ).find( '.or-option-translations' )
                        .children( '.active[data-option-value="' + value + '"]' ).text().trim();
                    newLabel = ( typeof newLabel !== 'undefined' && newLabel.length > 0 ) ? newLabel : curLabel;
                    $option.text( newLabel );
                } );
            }
        };


        FormView.prototype.editStatus = {
            set: function( status ) {
                // only trigger edit event once
                if ( status && status !== $form.data( 'edited' ) ) {
                    $form.trigger( 'edited.enketo' );
                }
                $form.data( 'edited', status );
            },
            get: function() {
                return !!$form.data( 'edited' );
            }
        };

        FormView.prototype.recordName = {
            set: function( name ) {
                $form.attr( 'name', name );
            },
            get: function() {
                return $form.attr( 'name' );
            }
        };

        /**
         * Finds nodes that have attributes with XPath expressions that refer to particular XML elements.
         *
         * @param  {string} attribute The attribute name to search for
         * @param  {?string} filter   The optional filter to append to each selector
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         * @return {jQuery}           A jQuery collection of elements
         */
        FormView.prototype.getRelatedNodes = function( attr, filter, updated ) {
            var $collection;
            var $repeat = null;
            var selector = [];
            var that = this;

            updated = updated || {};
            filter = filter || '';

            // The collection of non-repeat inputs is cached (unchangeable)
            if ( !this.$nonRepeats[ attr ] ) {
                this.$nonRepeats[ attr ] = $form.find( filter + '[' + attr + ']' )
                    .parentsUntil( '.or', '.calculation, .question' ).filter( function() {
                        return $( this ).closest( '.or-repeat' ).length === 0;
                    } );
            }

            // If the updated node is inside a repeat (and there are multiple repeats present)
            if ( typeof updated.repeatPath !== 'undefined' && updated.repeatIndex >= 0 ) {
                $repeat = $form.find( '.or-repeat[name="' + updated.repeatPath + '"]' ).eq( updated.repeatIndex );
            }

            /**
             * If the update was triggered from a repeat, it improves performance (a lot)
             * to exclude all those repeats that did not trigger it...
             * However, this would break if people are referring to nodes in other
             * repeats such as with /path/to/repeat[3]/node, /path/to/repeat[position() = 3]/node or indexed-repeat(/path/to/repeat/node /path/to/repeat, 3)
             * so we add those (in a very inefficient way)
             **/
            if ( $repeat ) {
                // the non-repeat fields have to be added too, e.g. to update a calculated item with count(to/repeat/node) at the top level
                $collection = this.$nonRepeats[ attr ]
                    .add( $repeat );
            } else {
                $collection = $form;
            }

            // add selectors based on specific changed nodes
            if ( !updated.nodes || updated.nodes.length === 0 ) {
                selector = selector.concat( [ filter + '[' + attr + ']' ] );
            } else {
                updated.nodes.forEach( function( node ) {
                    selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, node ) );
                } );
                // add all the paths that use the /* selector at end of path
                selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, '*' ) );
            }

            // TODO: exclude descendents of disabled elements? .find( ':not(:disabled) span.active' )
            return $collection.find( selector.join() );
        };

        /**
         * Crafts an optimized jQuery selector for element attributes that contain an expression with a target node name.
         * 
         * @param  {string} filter   The filter to use
         * @param  {string} attr     The attribute to target
         * @param  {string} nodeName The XML nodeName to find
         * @return {string}          The selector
         */
        FormView.prototype.getQuerySelectorsForLogic = function( filter, attr, nodeName ) {
            return [
                // The target node name is ALWAYS at the END of a path inside the expression.
                // #1: followed by space
                filter + '[' + attr + '*="/' + nodeName + ' "]',
                // #2: followed by )
                filter + '[' + attr + '*="/' + nodeName + ')"]',
                // #3: followed by , if used as first parameter of multiple parameters
                filter + '[' + attr + '*="/' + nodeName + ',"]',
                // #4: at the end of an expression
                filter + '[' + attr + '$="/' + nodeName + '"]',
                // #5: followed by ] (used in itemset filters)
                filter + '[' + attr + '*="/' + nodeName + ']"]'
            ];
        };

        /**
         * Obtains the XML primary instance as string without nodes that have a relevant
         * that evaluates to false.
         *
         * Though this function may be slow it is slow when it doesn't matter much (upon saving). The
         * alternative is to add some logic to branchUpdate to mark irrelevant nodes in the model
         * but that would slow down form loading and form traversal when it does matter.
         * 
         * @return {string} [description]
         */
        FormView.prototype.getDataStrWithoutIrrelevantNodes = function() {
            var that = this;
            var modelClone = new FormModel( model.getStr() );
            modelClone.init();

            this.getRelatedNodes( 'data-relevant' ).each( function() {
                var $node = $( this );
                var relevant = that.input.getRelevant( $node );
                var index = that.input.getIndex( $node );
                var context = that.input.getName( $node );
                /*
                 * If performance becomes an issue, some opportunities are:
                 * - check if ancestor is relevant
                 * - use cache of branchUpdate
                 * - check for repeatClones to avoid calculating index (as in branchUpdate)
                 */
                if ( !model.evaluate( relevant, 'boolean', context, index ) ) {
                    modelClone.node( context, index ).remove();
                }
            } );

            return modelClone.getStr();
        };

        /**
         * Updates branches
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         */
        FormView.prototype.branchUpdate = function( updated, forceClearIrrelevant ) {
            var p;
            var $branchNode;
            var result;
            var insideRepeat;
            var insideRepeatClone;
            var cacheIndex;
            var $nodes;
            var relevantCache = {};
            var alreadyCovered = [];
            var branchChange = false;
            var that = this;
            var clonedRepeatsPresent;

            $nodes = this.getRelatedNodes( 'data-relevant', '', updated );

            clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

            $nodes.each( function() {
                var $node = $( this );

                //note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
                if ( $.inArray( $node.attr( 'name' ), alreadyCovered ) !== -1 ) {
                    return;
                }

                // since this result is almost certainly not empty, closest() is the most efficient
                $branchNode = $node.closest( '.or-branch' );

                p = {};
                cacheIndex = null;

                p.relevant = that.input.getRelevant( $node );
                p.path = that.input.getName( $node );

                if ( $branchNode.length !== 1 ) {
                    if ( $node.parentsUntil( '.or', '#or-calculated-items' ).length === 0 ) {
                        console.error( 'could not find branch node for ', $( this ) );
                    }
                    return;
                }
                /*
                 * Determining ancestry is expensive. Using the knowledge most forms don't use repeats and
                 * if they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
                 * The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
                 * (6-7 seconds of loading time on the bench6 form)
                 */
                insideRepeat = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
                insideRepeatClone = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;
                /*
                 * Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
                 * It can be safely set to 0 for other branches.
                 */
                p.ind = ( insideRepeatClone ) ? that.input.getIndex( $node ) : 0;
                /*
                 * Caching is only possible for expressions that do not contain relative paths to nodes.
                 * So, first do a *very* aggresive check to see if the expression contains a relative path.
                 * This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
                 * expression, which may prove to be incorrect.
                 */
                if ( p.relevant.indexOf( '..' ) === -1 ) {
                    if ( !insideRepeat ) {
                        cacheIndex = p.relevant;
                    } else {
                        // the path is stripped of the last nodeName to record the context.
                        cacheIndex = p.relevant + '__' + p.path.substring( 0, p.path.lastIndexOf( '/' ) ) + '__' + p.ind;
                    }
                }
                if ( cacheIndex && typeof relevantCache[ cacheIndex ] !== 'undefined' ) {
                    result = relevantCache[ cacheIndex ];
                } else {
                    result = evaluate( p.relevant, p.path, p.ind );
                    relevantCache[ cacheIndex ] = result;
                }

                if ( !insideRepeat ) {
                    alreadyCovered.push( $( this ).attr( 'name' ) );
                }

                process( $branchNode, result );
            } );

            if ( branchChange ) {
                this.$.trigger( 'changebranch' );
            }

            /**
             * Evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
             *
             * @param  {string} expr        [description]
             * @param  {string} contextPath [description]
             * @param  {number} index       [description]
             * @return {boolean}             [description]
             */
            function evaluate( expr, contextPath, index ) {
                var result = model.evaluate( expr, 'boolean', contextPath, index );
                return result;
            }

            /**
             * Processes the evaluation result for a branch
             *
             * @param  {jQuery} $branchNode [description]
             * @param  {boolean} result      [description]
             */
            function process( $branchNode, result ) {
                if ( result === true ) {
                    enable( $branchNode );
                } else {
                    disable( $branchNode );
                }
            }

            /**
             * Checks whether branch currently has 'relevant' state
             *
             * @param  {jQuery} $branchNode [description]
             * @return {boolean}             [description]
             */
            function selfRelevant( $branchNode ) {
                return !$branchNode.hasClass( 'disabled' ) && !$branchNode.hasClass( 'pre-init' );
            }

            /**
             * Enables and reveals a branch node/group
             *
             * @param  {jQuery} $branchNode The jQuery object to reveal and enable
             */
            function enable( $branchNode ) {
                var type;

                if ( !selfRelevant( $branchNode ) ) {
                    branchChange = true;
                    $branchNode.removeClass( 'disabled pre-init' );

                    widgets.enable( $branchNode );

                    type = $branchNode.prop( 'nodeName' ).toLowerCase();

                    if ( type === 'label' ) {
                        $branchNode.children( 'input, select, textarea' ).prop( 'disabled', false );
                    } else if ( type === 'fieldset' || type === 'section' ) {
                        $branchNode.prop( 'disabled', false );
                        /*
                         * A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503
                         * where the file inputs end up in a weird partially enabled state.
                         * Refresh the state by disabling and enabling the file inputs again.
                         */
                        $branchNode.find( '*:not(.or-branch) input[type="file"]:not([data-relevant])' )
                            .prop( 'disabled', true )
                            .prop( 'disabled', false );
                    } else {
                        $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', false );
                    }
                }
            }

            /**
             * Disables and hides a branch node/group
             *
             * @param  {jQuery} $branchNode The jQuery object to hide and disable
             */
            function disable( $branchNode ) {
                var type = $branchNode.prop( 'nodeName' ).toLowerCase();
                var virgin = $branchNode.hasClass( 'pre-init' );

                if ( virgin || selfRelevant( $branchNode ) || forceClearIrrelevant ) {
                    branchChange = true;
                    $branchNode.addClass( 'disabled' );
                    widgets.disable( $branchNode );
                    // if the branch was previously enabled
                    if ( !virgin ) {
                        if ( that.options.clearIrrelevantImmediately || forceClearIrrelevant ) {
                            // A change event ensures the model is updated
                            // An inputupdate event is required to update widgets
                            $branchNode.clearInputs( 'change', 'inputupdate.enketo' );
                        }
                        // all remaining fields marked as invalid can now be marked as valid
                        $branchNode.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                            that.setValid( $( this ) );
                        } );
                    } else {
                        $branchNode.removeClass( 'pre-init' );
                    }

                    if ( type === 'label' ) {
                        $branchNode.children( 'input, select, textarea' ).prop( 'disabled', true );
                    } else if ( type === 'fieldset' || type === 'section' ) {
                        // TODO: a <section> cannot be disabled like this
                        $branchNode.prop( 'disabled', true );
                    } else {
                        $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', true );
                    }
                }
            }
        };


        /**
         * Updates itemsets
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         */
        FormView.prototype.itemsetUpdate = function( updated ) {
            var clonedRepeatsPresent;
            var insideRepeat;
            var insideRepeatClone;
            var $nodes;
            var that = this;
            var itemsCache = {};

            $nodes = this.getRelatedNodes( 'data-items-path', '.itemset-template', updated );

            clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

            $nodes.each( function() {
                var $htmlItem, $htmlItemLabels, /**@type {string}*/ value, currentValue, $instanceItems, index, context, labelRefValue,
                    $template, newItems, prevItems, templateNodeName, $input, $labels, itemsXpath, labelType, labelRef, valueRef;
                var $list;

                $template = $( this );

                // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
                if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                    return;
                }

                newItems = {};
                prevItems = $template.data();
                templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
                $list = $template.parent( 'select, datalist' );

                if ( templateNodeName === 'label' ) {
                    $input = $template.children( 'input' ).eq( 0 );
                } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                    $input = $list;
                } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'datalist' ) {
                    $input = $list.siblings( 'input:not(.widget)' );
                }
                $labels = $template.closest( 'label, select, datalist' ).siblings( '.itemset-labels' );
                itemsXpath = $template.attr( 'data-items-path' );
                labelType = $labels.attr( 'data-label-type' );
                labelRef = $labels.attr( 'data-label-ref' );
                valueRef = $labels.attr( 'data-value-ref' );

                /**
                 * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
                 * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
                 * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
                 * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
                 * the nodeset retrieves, Enketo's aproach works well.
                 */
                context = that.input.getName( $input );

                /*
                 * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
                 * It can be safely set to 0 for other branches.
                 */
                insideRepeat = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
                insideRepeatClone = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;

                index = ( insideRepeatClone ) ? that.input.getIndex( $input ) : 0;

                if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                    $instanceItems = itemsCache[ itemsXpath ];
                } else {
                    var safeToTryNative = true;
                    $instanceItems = $( model.evaluate( itemsXpath, 'nodes', context, index, safeToTryNative ) );
                    if ( !insideRepeat ) {
                        itemsCache[ itemsXpath ] = $instanceItems;
                    }
                }

                // This property allows for more efficient 'itemschanged' detection
                newItems.length = $instanceItems.length;
                // This may cause problems for large itemsets. Use md5 instead?
                newItems.text = $instanceItems.text();

                if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                    return;
                }

                $template.data( newItems );

                /**
                 * Remove current items before rebuilding a new itemset from scratch.
                 */
                // the current <option> and <input> elements
                $template.closest( '.question' )
                    .find( templateNodeName ).not( $template ).remove();
                // labels for current <option> elements
                $template.parent( 'select' ).siblings( '.or-option-translations' ).empty();

                $instanceItems.each( function() {
                    var $item = $( this );
                    var $labelRefs;
                    var labelRefNodename;
                    var matches;

                    $htmlItem = $( '<root/>' );

                    // Create a single <option> or <input> element for the (single) instance item.
                    $template
                        .clone().appendTo( $htmlItem )
                        .removeClass( 'itemset-template' )
                        .addClass( 'itemset' )
                        .removeAttr( 'data-items-path' );

                    // Determine which labels belong to the <option> or <input> element.
                    matches = utils.parseFunctionFromExpression( labelRef, 'translate' );
                    labelRefNodename = matches.length ? matches[ 0 ][ 1 ][ 0 ] : labelRef + ':eq(0)';
                    $labelRefs = $item.children( labelRefNodename );
                    /** 
                     * Note: $labelRefs could either be
                     * - a single itext reference
                     * - a collection of labels with different lang attributes
                     * - a single label
                     */
                    if ( labelType !== 'itext' && $labelRefs.length > 0 ) {
                        // labels with different lang attributes
                        labelType = 'langs';
                    }
                    switch ( labelType ) {
                        case 'itext':
                            // Search in the special .itemset-labels created in enketo-transformer for labels with itext ref.
                            $htmlItemLabels = $labels.find( '[data-itext-id="' + $labelRefs.eq( 0 ).text() + '"]' ).clone();
                            break;
                        case 'langs':
                            $htmlItemLabels = $();
                            // Turn the item elements into label spans that <option> and <input> uses.
                            $labelRefs.each( function() {
                                var lang = this.getAttribute( 'lang' );
                                var langAttr = lang ? ' lang="' + this.getAttribute( 'lang' ) + '"' : '';
                                var active = !lang || lang === that.langs.getCurrentLang() ? ' active' : '';
                                var span = '<span class="option-label' + active + '"' + langAttr + '>' + this.textContent + '</span>';
                                $htmlItemLabels = $htmlItemLabels.add( span );
                            } );
                            break;
                        default:
                            // Create a single span without language.
                            $htmlItemLabels = $( '<span class="option-label active" lang="">' + $labelRefs.eq( 0 ).text() + '</span>' );
                    }

                    // Obtain the value of the secondary instance item found.
                    value = $item.children( valueRef ).text();

                    // Set the value of the new <option> or <input>.
                    $htmlItem.find( '[value]' ).attr( 'value', value );

                    if ( templateNodeName === 'label' ) {
                        $htmlItem.find( 'input' )
                            .after( $htmlItemLabels );
                        // Add the <input> (which is the first child of <root>).
                        $labels.before( $htmlItem.find( ':first' ) );
                    } else if ( templateNodeName === 'option' ) {
                        //if ( $htmlItemLabels.length === 1 ) {
                        $htmlItem.find( 'option' ).text( $htmlItemLabels.filter( '.active' ).eq( 0 ).text() );
                        //}
                        $htmlItemLabels
                            .attr( 'data-option-value', value )
                            .attr( 'data-itext-id', '' )
                            .appendTo( $labels.siblings( '.or-option-translations' ) );
                        // Add the <option> (which is the first child of <root>).
                        $template.siblings().addBack().last().after( $htmlItem.find( ':first' ) );
                    }
                } );

                /**
                 * Attempt to populate inputs with current value in model.
                 * Note that if the current value is not empty and the new itemset does not 
                 * include (an) item(s) with this/se value(s), this will clear/update the model and
                 * this will trigger a dataupdate event. This may call this update function again.
                 */
                currentValue = model.node( context, index ).getVal()[ 0 ];
                if ( currentValue !== '' ) {
                    that.input.setVal( context, index, currentValue );
                    $input.trigger( 'change' );
                }

                if ( $list.length > 0 ) {
                    // populate labels (with current language) 
                    // TODO: is this actually required?
                    // that.langs.setSelect( $list );
                    // update widget
                    $input.trigger( 'changeoption' );
                }

            } );
        };

        /**
         * Updates output values, optionally filtered by those values that contain a changed node name
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         */
        FormView.prototype.outputUpdate = function( updated ) {
            var expr;
            var clonedRepeatsPresent;
            var insideRepeat;
            var insideRepeatClone;
            var $context;
            var $output;
            var context;
            var index;
            var $nodes;
            var outputCache = {};
            var val = '';
            var that = this;

            $nodes = this.getRelatedNodes( 'data-value', '.or-output', updated );

            clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 );

            $nodes.each( function() {
                $output = $( this );

                // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
                if ( $output.closest( '.or-branch' ).parent().closest( '.disabled' ).length ) {
                    return;
                }

                expr = $output.attr( 'data-value' );
                /*
                 * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
                 * should look at the HTML input to determine the context.
                 * So, context is either the input name attribute (if output is inside input label),
                 * or the parent with a name attribute
                 * or the whole document
                 */
                $context = $output.closest( '.question, .note, .or-group' ).find( '[name]' ).eq( 0 );
                context = ( $context.length ) ? that.input.getName( $context ) : undefined;

                insideRepeat = ( clonedRepeatsPresent && $output.parentsUntil( '.or', '.or-repeat' ).length > 0 );
                insideRepeatClone = ( insideRepeat && $output.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 );
                index = ( insideRepeatClone ) ? that.input.getIndex( $context ) : 0;

                if ( typeof outputCache[ expr ] !== 'undefined' ) {
                    val = outputCache[ expr ];
                } else {
                    val = model.evaluate( expr, 'string', context, index, true );
                    if ( !insideRepeat ) {
                        outputCache[ expr ] = val;
                    }
                }
                if ( $output.text() !== val ) {
                    $output.text( val );
                }
            } );
        };

        /**
         * See https://groups.google.com/forum/?fromgroups=#!topic/opendatakit-developers/oBn7eQNQGTg
         * and http://code.google.com/p/opendatakit/issues/detail?id=706
         *
         * This is using an aggressive name attribute selector to also find e.g. name="/../orx:meta/orx:instanceID", with
         * *ANY* namespace prefix.
         *
         * Once the following is complete this function can and should be removed:
         *
         * 1. ODK Collect starts supporting an instanceID preload item (or automatic handling of meta->instanceID without binding)
         * 2. Pyxforms changes the instanceID binding from calculate to preload (or without binding)
         * 3. Formhub has re-generated all stored XML forms from the stored XLS forms with the updated pyxforms
         *
         */
        FormView.prototype.grosslyViolateStandardComplianceByIgnoringCertainCalcs = function() {
            var $culprit = $form.find( '[name$="instanceID"][data-calculate]' );
            if ( $culprit.length > 0 ) {
                $culprit.removeAttr( 'data-calculate' );
            }
        };

        /**
         * Updates calculated items
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         */
        FormView.prototype.calcUpdate = function( updated ) {
            var $nodes;
            var that = this;

            updated = updated || {};

            $nodes = this.getRelatedNodes( 'data-calculate', '', updated );

            // add relevant items that have a (any) calculation
            $nodes = $nodes.add( this.getRelatedNodes( 'data-relevant', '[data-calculate]', updated ) );

            $nodes.each( function() {
                var result;
                var dataNodesObj;
                var dataNodes;
                var $dataNode;
                var index;
                var name;
                var dataNodeName;
                var expr;
                var newExpr;
                var dataType;
                var constraintExpr;
                var relevantExpr;
                var relevant;
                var $this;

                $this = $( this );
                name = that.input.getName( $this );
                dataNodeName = ( name.lastIndexOf( '/' ) !== -1 ) ? name.substring( name.lastIndexOf( '/' ) + 1 ) : name;
                expr = that.input.getCalculation( $this );
                dataType = that.input.getXmlType( $this );
                // for inputs that have a calculation and need to be validated
                constraintExpr = that.input.getConstraint( $this );
                relevantExpr = that.input.getRelevant( $this );

                dataNodesObj = model.node( name );
                dataNodes = dataNodesObj.get();

                /*
                 * If the update was triggered by a datanode inside a repeat
                 * and the dependent node is inside the same repeat
                 */
                if ( dataNodes.length > 1 && updated.repeatPath && name.indexOf( updated.repeatPath ) !== -1 ) {
                    $dataNode = model.node( updated.repeatPath, updated.repeatIndex ).get().find( dataNodeName );
                    index = $( dataNodes ).index( $dataNode );
                    updateCalc( index );
                } else if ( dataNodes.length === 1 ) {
                    index = 0;
                    updateCalc( index );
                } else {
                    // This occurs when update is called with empty updated object and multiple repeats are present
                    dataNodes.each( function( index ) {
                        updateCalc( index );
                    } );
                }

                function updateCalc( index ) {
                    relevant = ( relevantExpr ) ? model.evaluate( relevantExpr, 'boolean', name, index ) : true;

                    // not sure if using 'string' is always correct
                    newExpr = replaceChoiceNameFn( expr, 'string', name, index );

                    // it is possible that the fixed expr is '' which causes an error in XPath
                    result = ( relevant && newExpr ) ? model.evaluate( newExpr, 'string', name, index ) : '';

                    // filter the result set to only include the target node
                    dataNodesObj.setIndex( index );

                    // set the value
                    dataNodesObj.setVal( result, constraintExpr, dataType );

                    // Not the most efficient to use input.setVal here as it will do another lookup
                    // of the node, that we already have...
                    // We should not use value "result" here because node.setVal() may have done a data type conversion
                    that.input.setVal( name, index, dataNodesObj.getVal()[ 0 ] );
                }
            } );
        };


        FormView.prototype.validationUpdate = function( updated ) {
            var $nodes;
            var that = this;

            updated = updated || {};

            $nodes = this.getRelatedNodes( 'data-constraint', '', updated )
                .add( this.getRelatedNodes( 'data-required', '', updated ) );

            $nodes.each( function() {
                that.validateInput( $( this ) );
            } );
        };

        /*
         * Note that preloaders may be deprecated in the future and be handled as metadata without bindings at all, in which
         * case all this stuff should perhaps move to FormModel
         *
         * functions are designed to fail silently if unknown preloaders are called
         */
        FormView.prototype.preloads = {
            init: function( parentO ) {
                var item;
                var param;
                var name;
                var curVal;
                var newVal;
                var meta;
                var dataNode;
                var props;
                var xmlType;
                var $preload;
                var that = this;

                //these initialize actual preload items
                $form.find( 'input[data-preload], select[data-preload], textarea[data-preload]' ).each( function() {
                    $preload = $( this );
                    props = parentO.input.getProps( $preload );
                    item = $preload.attr( 'data-preload' ).toLowerCase();
                    param = $preload.attr( 'data-preload-params' ).toLowerCase();

                    if ( typeof that[ item ] !== 'undefined' ) {
                        dataNode = model.node( props.path, props.index );
                        curVal = dataNode.getVal()[ 0 ];
                        newVal = that[ item ]( {
                            param: param,
                            curVal: curVal,
                            dataNode: dataNode
                        } );

                        dataNode.setVal( newVal, null, props.xmlType );
                    } else {
                        console.log( 'Preload "' + item + '" not supported. May or may not be a big deal.' );
                    }
                } );
            },
            'timestamp': function( o ) {
                var value;
                // when is 'start' or 'end'
                if ( o.param === 'start' ) {
                    return ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( 'now()', 'string' );
                }
                if ( o.param === 'end' ) {
                    //set event handler for each save event (needs to be triggered!)
                    $form.on( 'beforesave', function() {
                        value = model.evaluate( 'now()', 'string' );
                        o.dataNode.setVal( value, null, 'datetime' );
                    } );
                    //TODO: why populate this upon load?
                    return model.evaluate( 'now()', 'string' );
                }
                return 'error - unknown timestamp parameter';
            },
            'date': function( o ) {
                var today;
                var year;
                var month;
                var day;

                if ( o.curVal.length === 0 ) {
                    today = new Date( model.evaluate( 'today()', 'string' ) );
                    year = today.getFullYear().toString().pad( 4 );
                    month = ( today.getMonth() + 1 ).toString().pad( 2 );
                    day = today.getDate().toString().pad( 2 );

                    return year + '-' + month + '-' + day;
                }
                return o.curVal;
            },
            'property': function( o ) {
                var node;

                // 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
                if ( o.curVal.length === 0 ) {
                    node = model.node( 'instance("__session")/session/context/' + o.param );
                    if ( node.get().length ) {
                        return node.getVal()[ 0 ];
                    } else {
                        return 'no ' + o.param + ' property in enketo';
                    }
                }
                return o.curVal;
            },
            'context': function( o ) {
                // 'application', 'user'??
                if ( o.curVal.length === 0 ) {
                    return ( o.param === 'application' ) ? 'enketo' : o.param + ' not supported in enketo';
                }
                return o.curVal;
            },
            'patient': function( o ) {
                if ( o.curVal.length === 0 ) {
                    return 'patient preload item not supported in enketo';
                }
                return o.curVal;
            },
            'user': function( o ) {
                if ( o.curVal.length === 0 ) {
                    return 'user preload item not supported in enketo yet';
                }
                return o.curVal;
            },
            'uid': function( o ) {
                if ( o.curVal.length === 0 ) {
                    return model.evaluate( 'concat("uuid:", uuid())', 'string' );
                }
                return o.curVal;
            }
        };

        /**
         * Variable: repeat
         *
         * This can perhaps be simplified and improved by:
         * - adding a function repeat.update() that looks at the instance whether to add repeat form fields
         * - calling update from init() (model.init() is called before form.init() so the initial repeats have been added already)
         * - when button is clicked model.node().clone() or model.node().remove() is called first and then repeat.update()
         * - watch out though when repeats in the middle are removed... or just disable that possibility
         *
         */
        FormView.prototype.repeat = {
            /**
             * Initializes all Repeat Groups in form (only called once).
             * @param  {FormView} formO the parent form object
             */
            init: function( formO ) {
                var that = this;
                var $repeats = $form.find( '.or-repeat' );

                this.formO = formO;
                $repeats.prepend( '<span class="repeat-number"></span>' );
                $repeats.filter( '*:not([data-repeat-fixed]):not([data-repeat-count])' )
                    .append( '<div class="repeat-buttons"><button type="button" class="btn btn-default repeat"><i class="icon icon-plus"> </i></button>' +
                        '<button type="button" disabled class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>' );
                $repeats.filter( '*:not([data-repeat-count])' ).each( function() {
                    // If there is no repeat-count attribute, check how many repeat instances 
                    // are in the model, and update view if necessary.
                    that.updateViewInstancesFromModel( $( this ) );

                } );

                // delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
                $form.on( 'click', 'button.repeat:enabled', function() {
                    // Create a clone
                    that.clone( $( this ).closest( '.or-repeat' ) );
                    // Prevent default
                    return false;
                } );
                $form.on( 'click', 'button.remove:enabled', function() {
                    //remove clone
                    that.remove( $( this ).closest( '.or-repeat.clone' ) );
                    //prevent default
                    return false;
                } );

                this.countUpdate();
            },
            updateViewInstancesFromModel: function( $repeat ) {
                var that = this;
                var name = $repeat.attr( 'name' );
                var index = $form.find( '.or-repeat[name="' + name + '"]' ).index( $repeat );
                var repInModelSeries = model.node( name, index ).getRepeatSeries();
                // First rep is already included (by XSLT transformation)
                if ( repInModelSeries.length > 1 ) {
                    this.clone( $repeat, repInModelSeries.length - 1 );
                    // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
                    // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
                    $repeat.siblings( '.or-repeat' ).addBack()
                        .children( '.or-group, .or-group-data' )
                        .children( '.or-repeat:not([data-repeat-count])' )
                        .each( function() {
                            that.updateViewInstancesFromModel( $( this ) );
                        } );
                }
            },
            updateRepeatInstancesFromCount: function( $repeat ) {
                var that = this;
                var $last;
                var repCountPath = $repeat.attr( 'data-repeat-count' ) || '';
                var name = $repeat.attr( 'name' );
                var index = $form.find( '.or-repeat[name="' + name + '"]' ).index( $repeat );
                var numRepsInCount = ( repCountPath.length > 0 ) ? model.evaluate( repCountPath, 'number', name, index, true ) : 0;
                var numRepsInView = $repeat.siblings( '.or-repeat[name="' + name + '"]' ).length + 1;
                var toCreate = numRepsInCount - numRepsInView;

                // First rep is already included (by XSLT transformation)
                if ( toCreate > 0 ) {
                    $last = $repeat.siblings().addBack().last();
                    that.clone( $last, toCreate );
                } else if ( toCreate < 0 ) {
                    // We cannot remove the first repeat (yet)
                    toCreate = Math.abs( toCreate ) > ( numRepsInView - 1 ) ? -numRepsInView + 1 : toCreate;
                    for ( ; toCreate < 0; toCreate++ ) {
                        $last = $repeat.siblings( '.or-repeat[name="' + name + '"]' ).addBack().last();
                        this.remove( $last, 0 );
                    }
                }
                // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
                // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
                $repeat.siblings( '.or-repeat' ).addBack()
                    .children( '.or-group, .or-group-data' )
                    .children( '.or-repeat[data-repeat-count]' )
                    .each( function() {
                        that.updateRepeatInstancesFromCount( $( this ) );
                    } );
            },
            /**
             * Checks whether repeat count value has been updated and updates repeat instances
             * accordingly.
             * 
             * @param  {[type]} updated [description]
             * @return {[type]}         [description]
             */
            countUpdate: function( updated ) {
                var $nodes;
                var that = this;

                updated = updated || {};
                $nodes = this.formO.getRelatedNodes( 'data-repeat-count', '.or-repeat:not(.clone)', updated );

                $nodes.each( function() {
                    that.updateRepeatInstancesFromCount( $( this ) );
                } );
            },
            /**s
             * clone a repeat group/node
             * @param   {jQuery} $node node to clone
             * @param   {number=} count number of clones to create
             * @return  {boolean}       [description]
             */
            clone: function( $node, count ) {
                var $siblings;
                var $master;
                var $clone;
                var $repeatsToUpdate;
                var $radiocheckbox;
                var index;
                var total;
                var path;
                var that = this;
                var byCountUpdate = !!count;

                count = count || 1;

                if ( $node.length !== 1 ) {
                    console.error( 'Nothing to clone' );
                    return false;
                }

                $siblings = $node.siblings( '.or-repeat' );
                $master = ( $node.hasClass( 'clone' ) ) ? $siblings.not( '.clone' ).eq( 0 ) : $node;
                $clone = $master.clone( true, true );
                path = $master.attr( 'name' );

                // Add clone class and remove any child clones.. (cloned repeats within repeats..)
                $clone.addClass( 'clone' ).find( '.clone' ).remove();

                // Mark all cloned fields as valid
                $clone.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                    that.formO.setValid( $( this ) );
                } );

                // Note: in http://formhub.org/formhub_u/forms/hh_polio_survey_cloned/form.xml a parent group of a repeat
                // has the same ref attribute as the nodeset attribute of the repeat. This would cause a problem determining
                // the proper index if .or-repeat was not included in the selector
                index = $form.find( '.or-repeat[name="' + path + '"]' ).index( $node );

                // clear the inputs before adding clone
                $clone.clearInputs( '' );

                total = count + index;

                // Add required number of repeats
                for ( ; index < total; index++ ) {

                    // Fix names of radio button groups
                    $clone.find( '.option-wrapper' ).each( this.fixRadioNames );

                    // Destroy widgets before inserting the clone
                    if ( widgets.hasInitialized() ) {
                        widgets.destroy( $clone );
                    }

                    // Insert the clone after values and widgets have been reset
                    $clone.insertAfter( $node );

                    // Create a new data point in <instance> by cloning the template node
                    // and clone data node if it doesn't already exist
                    if ( path.length > 0 && index >= 0 ) {
                        model.cloneRepeat( path, index );
                    }

                    // This will trigger setting default values and automatic page flips.
                    $clone.trigger( 'addrepeat', [ index + 1, byCountUpdate ] );

                    // Remove data-checked attributes for non-checked radio buttons and checkboxes
                    // Add data-checked attributes for checked ones.
                    // This actually belongs in the radio widget
                    $radiocheckbox = $clone.find( '[type="radio"],[type="checkbox"]' );
                    $radiocheckbox.parent( 'label' ).removeAttr( 'data-checked' );
                    $radiocheckbox.filter( ':checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

                    // Re-initiatalize widgets in clone after default values have been set
                    if ( widgets.hasInitialized() ) {
                        widgets.init( $clone );
                    } else {
                        // Upon inital formload the eventhandlers for calculated items have not yet been set.
                        // Calculations have already been initialized before the repeat clone(s) were created.
                        // Therefore, we manually trigger a calculation update for the cloned repeat.
                        that.formO.calcUpdate( {
                            repeatPath: path,
                            repeatIndex: index + 1
                        } );
                    }

                    $siblings = $siblings.add( $clone );
                    $clone = $clone.clone();
                }

                $repeatsToUpdate = $siblings.add( $node ).add( $siblings.find( '.or-repeat' ) );

                // number the repeats
                this.numberRepeats( $repeatsToUpdate );
                // enable or disable + and - buttons
                this.toggleButtons( $repeatsToUpdate );

                return true;
            },
            remove: function( $repeat, delay ) {
                var that = this;
                var $prev = $repeat.prev( '.or-repeat' );
                var repeatPath = $repeat.attr( 'name' );
                var repeatIndex = $form.find( '.or-repeat[name="' + repeatPath + '"]' ).index( $repeat );
                var $siblings = $repeat.siblings( '.or-repeat' );

                delay = typeof delay !== 'undefined' ? delay : 600;

                $repeat.hide( delay, function() {
                    $repeat.remove();
                    that.numberRepeats( $siblings );
                    that.toggleButtons( $siblings );
                    // trigger the removerepeat on the previous repeat (always present)
                    // so that removerepeat handlers know where the repeat was removed
                    $prev.trigger( 'removerepeat' );
                    // now remove the data node
                    model.node( repeatPath, repeatIndex ).remove();
                } );
            },
            fixRadioNames: function( index, element ) {
                $( element ).find( 'input[type="radio"]' )
                    .attr( 'name', Math.floor( ( Math.random() * 10000000 ) + 1 ) );
            },
            toggleButtons: function( $repeats ) {
                var $repeat;
                var $repSiblingsAndSelf;

                $repeats = ( !$repeats || $repeats.length === 0 ) ? $form : $repeats;

                $repeats.each( function() {
                    $repeat = $( this );
                    $repSiblingsAndSelf = $repeat.siblings( '.or-repeat' ).addBack();
                    //first switch everything off and remove hover state
                    $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.repeat, button.remove' ).prop( 'disabled', true );

                    //then enable the appropriate ones
                    $repSiblingsAndSelf.last().children( '.repeat-buttons' ).find( 'button.repeat' ).prop( 'disabled', false );
                    $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.remove' ).not( ':first' ).prop( 'disabled', false );
                } );
            },
            numberRepeats: function( $repeats ) {
                $repeats.each( function() {
                    var $repSiblings;
                    var qtyRepeats;
                    var i;
                    var $repeat = $( this );
                    // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
                    if ( $repeat.prev( '.or-repeat' ).length === 0 ) {
                        $repSiblings = $( this ).siblings( '.or-repeat' );
                        qtyRepeats = $repSiblings.length + 1;
                        if ( qtyRepeats > 1 ) {
                            $repeat.find( '.repeat-number' ).text( '1' );
                            i = 2;
                            $repSiblings.each( function() {
                                $( this ).find( '.repeat-number' ).eq( 0 ).text( i );
                                i++;
                            } );
                        } else {
                            $repeat.find( '.repeat-number' ).eq( 0 ).empty();
                        }
                    }
                } );
            }
        };

        FormView.prototype.setEventHandlers = function() {
            var that = this;

            //first prevent default submission, e.g. when text field is filled in and Enter key is pressed
            $form.attr( 'onsubmit', 'return false;' );

            /*
             * workaround for Chrome to clear invalid values right away
             * issue: https://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&groupby=&sort=&id=178437)
             * a workaround was chosen instead of replacing the change event listener to a blur event listener
             * because I'm guessing that Google will bring back the old behaviour.
             */
            $form.on( 'blur', 'input:not([type="text"], [type="radio"], [type="checkbox"])', function() {
                var $input = $( this );
                if ( typeof $input.prop( 'validity' ).badInput !== 'undefined' && $input.prop( 'validity' ).badInput ) {
                    $input.val( '' );
                }
            } );

            /*
             * The .file namespace is used in the filepicker to avoid an infinite loop. 
             * The listener below catches both change and change.file events.
             */
            $form.on( 'change.file',
                'input:not([readonly]):not(.ignore), select:not([readonly]):not(.ignore), textarea:not([readonly]):not(.ignore)',
                function( event ) {
                    var updated;
                    var requiredExpr;
                    var $input = $( this );
                    var n = {
                        path: that.input.getName( $input ),
                        inputType: that.input.getInputType( $input ),
                        xmlType: that.input.getXmlType( $input ),
                        enabled: that.input.isEnabled( $input ),
                        constraint: that.input.getConstraint( $input ),
                        val: that.input.getVal( $input ),
                        required: that.input.getRequired( $input ),
                        index: that.input.getIndex( $input )
                    };

                    // determine 'required' check if applicable
                    if ( n.enabled && n.inputType !== 'hidden' && n.required ) {
                        requiredExpr = n.required;
                    }
                    // set file input values to the actual name of file (without c://fakepath or anything like that)
                    if ( n.val.length > 0 && n.inputType === 'file' && $input[ 0 ].files[ 0 ] && $input[ 0 ].files[ 0 ].size > 0 ) {
                        n.val = utils.getFilename( $input[ 0 ].files[ 0 ], $input[ 0 ].dataset.filenamePostfix );
                    }

                    updated = model.node( n.path, n.index ).setVal( n.val, n.constraint, n.xmlType, requiredExpr, true );

                    that.validateInput( $input )
                        .then( function( valid ) {
                            // propagate event externally after internal processing is completed
                            $input.trigger( 'valuechange.enketo', valid );
                        } );
                } );

            // doing this on the focus event may have little effect on performance, because nothing else is happening :)
            $form.on( 'focus fakefocus', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                // update the form progress status
                that.progress.update( event.target );
            } );

            //using fakefocus because hidden (by widget) elements won't get focus
            $form.on( 'focus blur fakefocus fakeblur', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                var $input = $( this );
                var props = {
                    path: that.input.getName( $input ),
                    val: that.input.getVal( $input ),
                    required: that.input.getRequired( $input ),
                    index: that.input.getIndex( $input )
                };
                var $question = $input.closest( '.question' );
                var $legend = $question.find( 'legend' ).eq( 0 );
                var loudErrorShown = $question.hasClass( 'invalid-required' ) || $question.hasClass( 'invalid-constraint' );
                var insideTable = ( $input.parentsUntil( '.or', '.or-appearance-list-nolabel' ).length > 0 );
                var $reqSubtle = $question.find( '.required-subtle' );
                var reqSubtleTxt = t( 'form.required' );
                var requiredCheck = ( props.required ) ? model.node( props.path, props.index ).validateRequired( props.required ) : null;

                if ( event.type === 'focusin' || event.type === 'fakefocus' ) {
                    $question.addClass( 'focus' );
                    if ( requiredCheck && $reqSubtle.length === 0 && !insideTable ) {
                        $reqSubtle = $( '<span class="required-subtle" style="color: transparent;">' + reqSubtleTxt + '</span>' );
                        requiredCheck.then( function( passed ) {
                            if ( passed === false ) {
                                if ( $legend.length > 0 ) {
                                    $legend.append( $reqSubtle );
                                } else {
                                    $reqSubtle.insertBefore( $input );
                                }

                                if ( !loudErrorShown ) {
                                    $reqSubtle.show( function() {
                                        $( this ).removeAttr( 'style' );
                                    } );
                                }
                            }
                        } );
                    } else if ( !loudErrorShown ) {
                        //$question.addClass( 'focus' );
                    }
                } else if ( event.type === 'focusout' || event.type === 'fakeblur' ) {
                    $question.removeClass( 'focus' );
                    if ( requiredCheck ) {
                        requiredCheck.then( function( passed ) {
                            if ( passed === true ) {
                                $reqSubtle.remove();
                            }
                        } );
                    } else if ( !loudErrorShown ) {
                        $reqSubtle.removeAttr( 'style' );
                    }
                }
            } );

            model.$events.on( 'dataupdate', function( event, updated ) {
                that.calcUpdate( updated ); //EACH CALCUPDATE THAT CHANGES A VALUE TRIGGERS ANOTHER CALCUPDATE => INEFFICIENT
                that.repeat.countUpdate( updated );
                that.branchUpdate( updated );
                that.outputUpdate( updated );
                that.itemsetUpdate( updated );
                if ( config.validateContinuously === true ) {
                    that.validationUpdate( updated );
                }
                // edit is fired when the model changes after the form has been initialized
                that.editStatus.set( true );
            } );

            $form.on( 'addrepeat', function( event, index ) {
                var $clone = $( event.target );
                // Set defaults of added repeats in FormView, setAllVals does not trigger change event
                that.setAllVals( $clone, index );
                // for a NEW repeat ALL calculations inside that repeat have to be initialized
                that.calcUpdate( {
                    repeatPath: $clone.attr( 'name' ),
                    repeatIndex: index
                } );
                that.progress.update();
            } );

            $form.on( 'removerepeat', function() {
                that.progress.update();
            } );

            $form.on( 'changelanguage', function() {
                that.outputUpdate();
            } );
        };

        FormView.prototype.setValid = function( $node, type ) {
            var classes = ( type ) ? 'invalid-' + type : 'invalid-constraint invalid-required';
            this.input.getWrapNodes( $node ).removeClass( classes ).find( '.required-subtle' ).remove();
        };

        FormView.prototype.setInvalid = function( $node, type ) {
            type = type || 'constraint';
            this.input.getWrapNodes( $node ).addClass( 'invalid-' + type ).find( '.required-subtle' ).attr( 'style', 'color: transparent;' );
        };

        FormView.prototype.clearIrrelevant = function() {
            this.branchUpdate( null, true );
        };

        /**
         * Clears all irrelevant question values if necessary and then 
         * validates all enabled input fields after first resetting everything as valid.
         * 
         * @return {Promise} wrapping {boolean} whether the form contains any errors
         */
        FormView.prototype.validateAll = function() {
            // to not delay validation unneccessarily we only clear irrelevants if necessary
            if ( this.options.clearIrrelevantImmediately === false ) {
                this.clearIrrelevant();
            }

            return this.validateContent( $form )
                .then( function( valid ) {
                    $form.trigger( 'validationcomplete.enketo' );
                    return valid;
                } );
        };

        /**
         * Validates all enabled input fields in the supplied container, after first resetting everything as valid.
         * @return {Promise} wrapping {boolean} whether the container contains any errors
         */
        FormView.prototype.validateContent = function( $container ) {
            var $firstError;
            var that = this;

            //can't fire custom events on disabled elements therefore we set them all as valid
            $container.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, ' +
                'input:disabled, select:disabled, textarea:disabled' ).each( function() {
                that.setValid( $( this ) );
            } );

            var validations = $container.find( '.question' ).addBack( '.question' ).map( function() {
                // only trigger validate on first input and use a **pure CSS** selector (huge performance impact)
                var $elem = $( this )
                    .find( 'input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)' );
                if ( $elem.length === 0 ) {
                    return Promise.resolve();
                }
                return that.validateInput( $elem.eq( 0 ) );
            } ).toArray();

            return Promise.all( validations )
                .then( function() {
                    $firstError = $container
                        .find( '.invalid-required, .invalid-constraint' )
                        .addBack( '.invalid-required, .invalid-constraint' )
                        .eq( 0 );

                    if ( $firstError.length > 0 ) {
                        if ( that.pages.active ) {
                            // move to the first page with an error
                            that.pages.flipToPageContaining( $firstError );
                        }

                        $firstError[ 0 ].scrollIntoView();
                    }
                    return $firstError.length === 0;
                } )
                .catch( function( e ) {
                    // fail whole-form validation if any of the question
                    // validations threw.
                    return false;
                } );
        };

        /**
         * Maintains progress state of user traversing through form, using
         * currently focused input || last changed input as current location.
         */
        FormView.prototype.progress = {
            status: 0,
            lastChanged: null,
            $all: null,
            updateTotal: function() {
                this.$all = $form.find( '.question' ).not( '.disabled' ).filter( function() {
                    return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
                } );
            },
            // updates rounded % value of progress and triggers event if changed
            update: function( el ) {
                var status;

                if ( !this.$all || !el ) {
                    this.updateTotal();
                }

                this.lastChanged = el || this.lastChanged;
                status = Math.round( ( ( this.$all.index( $( this.lastChanged ).closest( '.question' ) ) + 1 ) * 100 ) / this.$all.length );

                // if the current el was removed (inside removed repeat), the status will be 0 - leave unchanged
                if ( status > 0 && status !== this.status ) {
                    this.status = status;
                    $form.trigger( 'progressupdate.enketo', status );
                }
            },
            get: function() {
                return this.status;
            }
        };

        /**
         * Returns true is form is valid and false if not. Needs to be called AFTER (or by) validateAll()
         * @return {!boolean} whether the form is valid
         */
        FormView.prototype.isValid = function() {
            return ( $form.find( '.invalid-required, .invalid-constraint' ).length > 0 ) ? false : true;
        };

        /**
         * Adds <hr class="page-break"> to prevent cutting off questions with page-breaks
         */
        FormView.prototype.addPageBreaks = function() {

        };

        FormView.prototype.pathToAbsolute = function( targetPath, contextPath ) {
            var target;

            if ( targetPath.indexOf( '/' ) === 0 ) {
                return targetPath;
            }

            // index is irrelevant (no positions in returned path)
            target = model.evaluate( targetPath, 'node', contextPath, 0, true );

            return model.getXPath( target, 'instance', false );
        };

        /**
         * Validates question values.
         * 
         * @param  {jQuery} $input    [description]
         * @return {Promise}           [description]
         */
        FormView.prototype.validateInput = function( $input ) {
            var that = this;
            var getValidationResult;
            // All relevant properties, except for the **very expensive** index property
            // There is some scope for performance improvement by determining other properties when they 
            // are needed, but that may not be so significant.
            var n = {
                path: that.input.getName( $input ),
                inputType: that.input.getInputType( $input ),
                xmlType: that.input.getXmlType( $input ),
                enabled: that.input.isEnabled( $input ),
                constraint: that.input.getConstraint( $input ),
                calculation: that.input.getCalculation( $input ),
                required: that.input.getRequired( $input ),
                readonly: that.input.getReadonly( $input ),
                val: that.input.getVal( $input )
            };
            // No need to validate, **nor send validation events**. Meant for simple empty "notes" only.
            if ( n.readonly && !n.val && !n.required && !n.constraint && !n.calculation ) {
                return Promise.resolve();
            }

            // The enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not.
            // If an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid).
            if ( n.enabled && n.inputType !== 'hidden' ) {
                // Only now, will we determine the index.
                n.ind = that.input.getIndex( $input );
                getValidationResult = model.node( n.path, n.ind ).validate( n.constraint, n.required, n.xmlType );
            } else {
                // The purpose of this is to send validated.enketo events for these fields (OC).
                getValidationResult = Promise.resolve( {
                    requiredValid: true,
                    constraintValid: true
                } );
            }

            return getValidationResult
                .then( function( result ) {
                    var previouslyInvalid = false;
                    var passed = result.requiredValid !== false && result.constraintValid !== false;
                    // Check current UI state
                    if ( n.inputType !== 'hidden' ) {
                        n.$q = that.input.getWrapNodes( $input );
                        previouslyInvalid = n.$q.hasClass( 'invalid-required' ) || n.$q.hasClass( 'invalid-constraint' );
                    }
                    // Update UI
                    if ( n.inputType !== 'hidden' ) {
                        if ( result.requiredValid === false ) {
                            that.setValid( $input, 'constraint' );
                            that.setInvalid( $input, 'required' );
                        } else if ( result.constraintValid === false ) {
                            that.setValid( $input, 'required' );
                            that.setInvalid( $input, 'constraint' );
                        } else {
                            that.setValid( $input, 'constraint' );
                            that.setValid( $input, 'required' );
                        }
                    }
                    // Send invalidated event
                    if ( !passed && !previouslyInvalid ) {
                        $input.trigger( 'invalidated.enketo' );
                    }
                    return passed;
                } )
                .catch( function( e ) {
                    console.error( 'validation error', e );
                    that.setInvalid( $input, 'constraint' );
                    throw e;
                } );
        };
    }

    /** 
     * Static method to obtain required enketo-transform version direct from class.
     */
    Form.getRequiredTransformerVersion = function() {
        return pkg.devDependencies ? pkg.devDependencies[ 'enketo-transformer' ] : '';
    };

    module.exports = Form;
} );
