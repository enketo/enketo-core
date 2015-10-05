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
     *
     * @constructor
     */

    function Form( formSelector, data ) {
        var model, cookies, form, $form, $formClone, repeatsPresent, fixExpr,
            loadErrors = [];

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
            loadErrors = loadErrors.concat( model.init() );

            form = new FormView( formSelector );

            repeatsPresent = ( $( formSelector ).find( '.or-repeat' ).length > 0 );

            loadErrors = loadErrors.concat( form.init() );

            if ( window.scrollTo ) {
                window.scrollTo( 0, 0 );
            }

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
        this.getInstanceName = function() {
            return model.getInstanceName();
        };
        this.getView = function() {
            return form;
        };
        this.getEncryptionKey = function() {
            return form.$.data( 'base64rsapublickey' );
        };

        /**
         * @param {boolean=} incTempl
         * @param {boolean=} incNs
         * @param {boolean=} all
         */
        this.getDataStr = function() {
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
         * TODO: this needs to work for all expressions (relevants, constraints), now it only works for calulated items
         * Ideally this belongs in the form Model, but unfortunately it needs access to the view
         * 
         * @param  {[type]} expr       [description]
         * @param  {[type]} resTypeStr [description]
         * @param  {[type]} selector   [description]
         * @param  {[type]} index      [description]
         * @param  {[type]} tryNative  [description]
         * @return {[type]}            [description]
         */
        fixExpr = function( expr, resTypeStr, selector, index, tryNative ) {
            var value, name, $input, label = '',
                matches = expr.match( /jr:choice-name\(([^,]+),\s?'(.*?)'\)/ );

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

        function FormView( selector ) {
            //there will be only one instance of FormView
            $form = $( selector );
            //used for testing
            this.$ = $form;
            this.$nonRepeats = {};
        }

        FormView.prototype.init = function() {
            var that = this;

            if ( typeof model === 'undefined' || !( model instanceof FormModel ) ) {
                return console.error( 'variable data needs to be defined as instance of FormModel' );
            }

            try {
                // before widgets.init (as instanceID used in offlineFilepicker widget)
                this.preloads.init( this );

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
                widgets.init();

                // after widgets.init(), and repeat.init()
                this.branchUpdate();

                // after branch.init();
                this.pages.init();

                // after repeat.init()
                this.outputUpdate();

                // after widgets init to make sure widget handlers are called before
                // after loading existing instance to not trigger an 'edit' event
                this.setEventHandlers();

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
                    var $allPages = $form.find( '.note, .question, .trigger, .or-appearance-field-list' )
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
                    }

                    this.flipToFirst();

                    $form.removeClass( 'hide' );
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
                var that = this,
                    $main = $( '.main' );

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
                    .on( 'addrepeat.pagemode', function( event ) {
                        that.updateAllActive();
                        // removing the class in effect avoids the animation
                        $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                        that.flipToPageContaining( $( event.target ) );
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
                    return $( this ).closest( '.disabled' ).length === 0;
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
            next: function() {
                var next, currentIndex;
                this.updateAllActive();
                currentIndex = this.getCurrentIndex();
                next = this.getNext( currentIndex );

                if ( next ) {
                    this.flipTo( next, currentIndex + 1 );
                }
            },
            prev: function() {
                var prev, currentIndex;
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
                    }
                } else {
                    this.setToCurrent( pageEl );
                    this.focusOnFirstQuestion( pageEl );
                    this.toggleButtons( newIndex );
                }

                if ( window.scrollTo ) {
                    window.scrollTo( 0, 0 );
                }

                $( pageEl ).trigger( 'pageflip.enketo' );
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
                $( pageEl ).find( '.question:not(.disabled)' ).filter( function() {
                    return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
                } ).eq( 0 ).find( 'input, select, textarea' ).eq( 0 ).trigger( 'fakefocus' );
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

        //this may not be the most efficient. Could also be implemented like model.Nodeset;
        //also use for fieldset nodes (to evaluate branch logic) and also used to get and set form data of the app settings
        FormView.prototype.input = {
            //multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
            getWrapNodes: function( $inputNodes ) {
                var type = this.getInputType( $inputNodes.eq( 0 ) );
                return ( type === 'fieldset' ) ? $inputNodes : $inputNodes.closest( '.question, .note' );
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
                    val: this.getVal( $node ),
                    required: this.isRequired( $node ),
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
            getRelevant: function( $node ) {
                return $node.attr( 'data-relevant' );
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
                var inputType, name, $wrapNode, $wrapNodesSameName;
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
            isRequired: function( $node ) {
                return ( $node.attr( 'required' ) !== undefined && $node.parentsUntil( '.or', '.or-appearance-label' ).length === 0 );
            },
            getVal: function( $node ) {
                var inputType, values = [],
                    name;
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
                return ( !$node.val() ) ? '' : ( $.isArray( $node.val() ) ) ? $node.val().join( ' ' ).trim() : $node.val().trim();
            },
            setVal: function( name, index, value ) {
                var $inputNodes, type;

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

                // the has-value class enables hiding empty readonly inputs for prettier notes
                if ( $inputNodes.is( '[readonly]' ) ) {
                    $inputNodes.toggleClass( 'has-value', !!value );
                }

                $inputNodes.val( value );

                return;
            }
        };

        /**
         *  Uses current content of $data to set all the values in the form.
         *  Since not all data nodes with a value have a corresponding input element, it could be considered to turn this
         *  around and cycle through the HTML form elements and check for each form element whether data is available.
         */
        FormView.prototype.setAllVals = function( $group, groupIndex ) {
            var index, name, value,
                that = this,
                selector = ( $group && $group.attr( 'name' ) ) ? $group.attr( 'name' ) : null;

            groupIndex = ( typeof groupIndex !== 'undefined' ) ? groupIndex : null;

            model.node( selector, groupIndex ).get().find( '*' ).filter( function() {
                var $node = $( this );
                // only return non-empty leafnodes
                return $node.children().length === 0 && $node.text();
            } ).each( function() {
                var $node = $( this );

                try {
                    value = $node.text();
                    name = $node.getXPath( 'instance' );
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
                var lang,
                    that = this,
                    $formLanguages = $form.find( '#form-languages' ),
                    $langSelector = $( '.form-language-selector' ),
                    defaultLang = $formLanguages.attr( 'data-default-lang' ) || $formLanguages.find( 'option' ).eq( 0 ).attr( 'value' ),
                    defaultDirectionality = $formLanguages.find( '[value="' + defaultLang + '"]' ).attr( 'data-dir' ) || 'ltr';

                $formLanguages
                    .detach()
                    .appendTo( $langSelector )
                    .val( defaultLang );

                $form
                    .attr( 'dir', defaultDirectionality );

                if ( $formLanguages.find( 'option' ).length < 2 ) {
                    return;
                }

                $langSelector.removeClass( 'hide' );

                $formLanguages.change( function( event ) {
                    event.preventDefault();
                    lang = $( this ).val();
                    that.setAll( lang );
                } );
            },
            setAll: function( lang ) {
                var that = this,
                    dir = $( '#form-languages' ).find( '[value="' + lang + '"]' ).attr( 'data-dir' ) || 'ltr';

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

                $form.find( 'select' ).each( function() {
                    that.setSelect( $( this ) );
                } );

                $form.trigger( 'changelanguage' );
            },
            // swap language of <select> <option>s
            setSelect: function( $select ) {
                var value, /** @type {string} */ curLabel, /** @type {string} */ newLabel;
                $select.children( 'option' ).not( '[value=""]' ).each( function() {
                    var $option = $( this );
                    curLabel = $option.text();
                    value = $option.attr( 'value' );
                    newLabel = $option.parent( 'select' ).siblings( '.or-option-translations' )
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
         * Crafts an optimized jQuery selector for element attributes that contain an expression with a target node name.
         *
         * @param  {string} attribute The attribute name to search for
         * @param  {?string} filter   The optional filter to append to each selector
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         * @return {jQuery}           A jQuery collection of elements
         */
        FormView.prototype.getNodesToUpdate = function( attr, filter, updated ) {
            var $collection,
                $repeat = null,
                selector = [],
                that = this;

            updated = updated || {};
            filter = filter || '';

            // The collection of non-repeat inputs is cached (unchangeable)
            if ( !this.$nonRepeats[ attr ] ) {
                this.$nonRepeats[ attr ] = $form.find( filter + '[' + attr + ']' )
                    .parentsUntil( '.or', '.calculation, .question, .note, .trigger' ).filter( function() {
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
         * Updates branches
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         */
        FormView.prototype.branchUpdate = function( updated ) {
            var p, $branchNode, result, insideRepeat, insideRepeatClone, cacheIndex, $nodes,
                relevantCache = {},
                alreadyCovered = [],
                branchChange = false,
                that = this,
                clonedRepeatsPresent;

            $nodes = this.getNodesToUpdate( 'data-relevant', '', updated );

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
                    /*
                     * For now, let's just not cache relevants inside a repeat.
                     */
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
                // for mysterious reasons '===' operator fails after Advanced Compilation even though result has value true
                // and type boolean
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
                    } else if ( type === 'fieldset' ) {
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
                var type = $branchNode.prop( 'nodeName' ).toLowerCase(),
                    virgin = $branchNode.hasClass( 'pre-init' );
                if ( virgin || selfRelevant( $branchNode ) ) {
                    branchChange = true;
                    $branchNode.addClass( 'disabled' );

                    // if the branch was previously enabled
                    if ( !virgin ) {
                        $branchNode.clearInputs( 'change' );
                        widgets.disable( $branchNode );
                        // all remaining fields marked as invalid can now be marked as valid
                        $branchNode.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                            that.setValid( $( this ) );
                        } );
                    } else {
                        $branchNode.removeClass( 'pre-init' );
                    }

                    if ( type === 'label' ) {
                        $branchNode.children( 'input, select, textarea' ).prop( 'disabled', true );
                    } else if ( type === 'fieldset' ) {
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
            var clonedRepeatsPresent, insideRepeat, insideRepeatClone, $nodes,
                that = this,
                itemsCache = {};

            $nodes = this.getNodesToUpdate( 'data-items-path', '.itemset-template', updated );

            clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

            $nodes.each( function() {
                var $htmlItem, $htmlItemLabels, /**@type {string}*/ value, $instanceItems, index, context, labelRefValue,
                    $template, newItems, prevItems, templateNodeName, $input, $labels, itemsXpath, labelType, labelRef, valueRef;

                $template = $( this );

                // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
                if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                    return;
                }

                newItems = {};
                prevItems = $template.data();
                templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
                $input = ( templateNodeName === 'label' ) ? $template.children( 'input' ).eq( 0 ) : $template.parent( 'select' );
                $labels = $template.closest( 'label, select' ).siblings( '.itemset-labels' );
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

                // this property allows for more efficient 'itemschanged' detection
                newItems.length = $instanceItems.length;
                //this may cause problems for large itemsets. Use md5 instead?
                newItems.text = $instanceItems.text();

                if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                    return;
                }

                $template.data( newItems );

                // clear data values through inputs. Note: if a value exists,
                // this will trigger a dataupdate event which may call this update function again
                $template.closest( '.question' )
                    .clearInputs( 'change' )
                    .find( templateNodeName ).not( $template ).remove();
                $template.parent( 'select' ).siblings( '.or-option-translations' ).empty();

                $instanceItems.each( function() {
                    var $item = $( this );
                    labelRefValue = $item.children( labelRef ).text();
                    $htmlItem = $( '<root/>' );
                    $template
                        .clone().appendTo( $htmlItem )
                        .removeClass( 'itemset-template' )
                        .addClass( 'itemset' )
                        .removeAttr( 'data-items-path' );

                    $htmlItemLabels = ( labelType === 'itext' && $labels.find( '[data-itext-id="' + labelRefValue + '"]' ).length > 0 ) ?
                        $labels.find( '[data-itext-id="' + labelRefValue + '"]' ).clone() :
                        $( '<span class="option-label active" lang="">' + labelRefValue + '</span>' );

                    value = $item.children( valueRef ).text();
                    $htmlItem.find( '[value]' ).attr( 'value', value );

                    if ( templateNodeName === 'label' ) {
                        $htmlItem.find( 'input' )
                            .after( $htmlItemLabels );
                        $labels.before( $htmlItem.find( ':first' ) );
                    } else if ( templateNodeName === 'option' ) {
                        if ( $htmlItemLabels.length === 1 ) {
                            $htmlItem.find( 'option' ).text( $htmlItemLabels.text() );
                        }
                        $htmlItemLabels
                            .attr( 'data-option-value', value )
                            .attr( 'data-itext-id', '' )
                            .appendTo( $labels.siblings( '.or-option-translations' ) );
                        $template.siblings().addBack().last().after( $htmlItem.find( ':first' ) );
                    }
                } );

                if ( $input.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                    //populate labels (with current language)
                    that.langs.setSelect( $input );
                    //update widget
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
            var expr, clonedRepeatsPresent, insideRepeat, insideRepeatClone, $context, $output, context, index, $nodes,
                outputCache = {},
                val = '',
                that = this;

            $nodes = this.getNodesToUpdate( 'data-value', '.or-output', updated );

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
                if ( $output.text !== val ) {
                    $output.text( val );
                }
            } );
        };

        /**
         * See https://groups.google.com/forum/?fromgroups=#!topic/opendatakit-developers/oBn7eQNQGTg
         * and http://code.google.com/p/opendatakit/issues/detail?id=706
         *
         * Once the following is complete this function can and should be removed:
         *
         * 1. ODK Collect starts supporting an instanceID preload item (or automatic handling of meta->instanceID without binding)
         * 2. Pyxforms changes the instanceID binding from calculate to preload (or without binding)
         * 3. Formhub has re-generated all stored XML forms from the stored XLS forms with the updated pyxforms
         *
         */
        FormView.prototype.grosslyViolateStandardComplianceByIgnoringCertainCalcs = function() {
            var $culprit = $form.find( '[name$="/meta/instanceID"][data-calculate]' );
            if ( $culprit.length > 0 ) {
                $culprit.removeAttr( 'data-calculate' );
            }
        };

        /**
         * Updates calculated items
         *
         * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
         * @param { jQuery=}         $repeat        The repeat that triggered the update
         * @param {Array<string>=}  updatedNodes    Array of updated nodes
         */
        FormView.prototype.calcUpdate = function( updated ) {
            var $nodes,
                that = this;

            updated = updated || {};

            $nodes = this.getNodesToUpdate( 'data-calculate', '', updated );

            // add relevant items that have a (any) calculation
            $nodes = $nodes.add( this.getNodesToUpdate( 'data-relevant', '[data-calculate]', updated ) );

            $nodes.each( function() {
                var result, dataNodesObj, dataNodes, $dataNode, index, name, dataNodeName, expr, dataType, constraint, relevantExpr, relevant, $this;

                $this = $( this );
                name = that.input.getName( $this );
                dataNodeName = ( name.lastIndexOf( '/' ) !== -1 ) ? name.substring( name.lastIndexOf( '/' ) + 1 ) : name;
                expr = that.input.getCalculation( $this );
                dataType = that.input.getXmlType( $this );
                // for inputs that have a calculation and need to be validated
                constraint = that.input.getConstraint( $this );
                relevantExpr = that.input.getRelevant( $this );
                relevant = ( relevantExpr ) ? model.evaluate( relevantExpr, 'boolean', name ) : true;

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

                    //not sure if using 'string' is always correct
                    expr = fixExpr( expr, 'string', name, index );

                    // it is possible that the fixed expr is '' which causes an error in XPath
                    result = ( relevant && expr ) ? model.evaluate( expr, 'string', name, index ) : '';

                    // filter the result set to only include the target node
                    dataNodesObj.setIndex( index );

                    // set the value
                    dataNodesObj.setVal( result, constraint, dataType );

                    // not the most efficient to use input.setVal here as it will do another lookup
                    // of the node, that we already have...
                    that.input.setVal( name, index, result );
                }
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
                var item, param, name, curVal, newVal, meta, dataNode, props, xmlType, $preload,
                    that = this;
                //these initialize actual preload items
                $form.find( '#or-preload-items input' ).each( function() {
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
                // In addition the presence of certain meta data in the instance may automatically trigger a preload function
                // even if the binding is not present. Note, that this actually does not deal with HTML elements at all.
                meta = model.node( '/*/meta/*' );
                meta.get().each( function() {
                    item = null;
                    name = $( this ).prop( 'nodeName' );
                    dataNode = model.node( '/*/meta/' + name );
                    curVal = dataNode.getVal()[ 0 ];
                    //first check if there isn't a binding with a preloader that already took care of this
                    if ( $form.find( '#or-preload-items input[name$="/meta/' + name + '"][data-preload]' ).length === 0 ) {
                        switch ( name ) {
                            case 'instanceID':
                                item = 'instance';
                                xmlType = 'string';
                                param = '';
                                break;
                            case 'timeStart':
                                item = 'timestamp';
                                xmlType = 'datetime';
                                param = 'start';
                                break;
                            case 'timeEnd':
                                item = 'timestamp';
                                xmlType = 'datetime';
                                param = 'end';
                                break;
                            case 'deviceID':
                                item = 'property';
                                xmlType = 'string';
                                param = 'deviceid';
                                break;
                            case 'userID':
                                item = 'property';
                                xmlType = 'string';
                                param = 'username';
                                break;
                        }
                    }
                    if ( item ) {
                        dataNode.setVal( that[ item ]( {
                            param: param,
                            curVal: curVal,
                            dataNode: dataNode
                        } ), null, xmlType );
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
                    return model.evaluate( 'now()', 'string' );
                }
                return 'error - unknown timestamp parameter';
            },
            'date': function( o ) {
                var today, year, month, day;

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
                var readCookie, noSupportMsg, response;

                readCookie = function( name, c, C, i ) {
                    if ( cookies ) {
                        return cookies[ name ];
                    }

                    c = document.cookie.split( '; ' );
                    cookies = {};

                    for ( i = c.length - 1; i >= 0; i-- ) {
                        C = c[ i ].split( '=' );
                        // decode URI
                        C[ 1 ] = decodeURIComponent( C[ 1 ] );
                        // if cookie is signed (using expressjs/cookie-parser/), extract value
                        if ( C[ 1 ].substr( 0, 2 ) === 's:' ) {
                            C[ 1 ] = C[ 1 ].slice( 2 );
                            C[ 1 ] = C[ 1 ].slice( 0, C[ 1 ].lastIndexOf( '.' ) );
                        }
                        cookies[ C[ 0 ] ] = decodeURIComponent( C[ 1 ] );
                    }

                    return cookies[ name ];
                };

                // 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
                if ( o.curVal.length === 0 ) {
                    noSupportMsg = 'no ' + o.param + ' property in enketo';
                    switch ( o.param ) {
                        case 'deviceid':
                            response = readCookie( '__enketo_meta_deviceid' ) || 'Error: could not determine deviceID';
                            break;
                        case 'username':
                            response = readCookie( '__enketo_meta_uid' );
                            break;
                        default:
                            response = noSupportMsg;
                            break;
                    }
                    return response;
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
                    return 'patient preload not supported in enketo';
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
                //general
                if ( o.curVal.length === 0 ) {
                    return 'no uid yet in enketo';
                }
                return o.curVal;
            },
            //Not according to spec yet, this will be added to spec but name may change
            'instance': function( o ) {
                var id = ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( 'concat("uuid:", uuid())', 'string' );
                //store the current instanceID as data on the form element so it can be easily accessed by e.g. widgets
                $form.data( {
                    instanceID: id
                } );
                return id;
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
                var numRepsInCount, repCountPath, numRepsInInstance, numRepsDefault, cloneDefaultReps, $dataRepeat, index,
                    that = this;

                this.formO = formO;
                $form.find( '.or-repeat' ).prepend( '<span class="repeat-number"></span>' );
                $form.find( '.or-repeat:not([data-repeat-fixed])' )
                    .append( '<div class="repeat-buttons"><button type="button" class="btn btn-default repeat"><i class="icon icon-plus"> </i></button>' +
                        '<button type="button" disabled class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>' );

                //delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
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

                cloneDefaultReps = function( $repeat, repLevel ) {
                    repCountPath = $repeat.attr( 'data-repeat-count' ) || '';
                    numRepsInCount = ( repCountPath.length > 0 ) ? parseInt( model.node( repCountPath ).getVal()[ 0 ], 10 ) : 0;
                    index = $form.find( '.or-repeat[name="' + $repeat.attr( 'name' ) + '"]' ).index( $repeat );
                    $dataRepeat = model.node( $repeat.attr( 'name' ), index ).get();
                    numRepsInInstance = $dataRepeat.siblings( $dataRepeat.prop( 'nodeName' ) ).addBack().length;
                    numRepsDefault = ( numRepsInCount > numRepsInInstance ) ? numRepsInCount : numRepsInInstance;
                    // First rep is already included (by XSLT transformation)
                    if ( numRepsDefault > 1 ) {
                        that.clone( $repeat.siblings().addBack().last(), numRepsDefault - 1, true );
                    }
                    // Now check the defaults of all the descendants of this repeat and its new siblings, level-by-level.
                    $repeat.siblings( '.or-repeat' ).addBack().find( '.or-repeat' )
                        .filter( function() {
                            return $( this ).parentsUntil( '.or', '.or-repeat' ).length === repLevel;
                        } ).each( function() {
                            cloneDefaultReps( $( this ), repLevel + 1 );
                        } );
                };

                // Clone form fields to create the default number
                // Note: this assumes that the repeat count is static not dynamic/
                $form.find( '.or-repeat' ).filter( function() {
                    return $( this ).parentsUntil( '.or', '.or-repeat' ).length === 0;
                } ).each( function() {
                    cloneDefaultReps( $( this ), 1 );
                } );
            },
            /**
             * clone a repeat group/node
             * @param   {jQuery} $node node to clone
             * @param   {number=} count number of clones to create
             * @param   {boolean=} initialFormLoad Whether this cloning is part of the initial form load
             * @return  {boolean}       [description]
             */
            clone: function( $node, count, initialFormLoad ) {
                var $siblings, $master, $clone, $repeatsToUpdate, $radiocheckbox, index, total, path,
                    that = this;

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
                    if ( !initialFormLoad ) {
                        widgets.destroy( $clone );
                    }

                    // Insert the clone after values and widgets have been reset
                    $clone.insertAfter( $node );

                    // Create a new data point in <instance> by cloning the template node
                    // and clone data node if it doesn't already exist
                    if ( path.length > 0 && index >= 0 ) {
                        model.cloneRepeat( path, index );
                    }

                    // This will trigger setting default values and other stuff
                    $clone.trigger( 'addrepeat', index + 1 );

                    // Remove data-checked attributes for non-checked radio buttons and checkboxes
                    // Add data-checked attributes for checked ones.
                    // This actually belongs in the radio widget
                    $radiocheckbox = $clone.find( '[type="radio"],[type="checkbox"]' );
                    $radiocheckbox.parent( 'label' ).removeAttr( 'data-checked' );
                    $radiocheckbox.filter( ':checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

                    // Re-initiate widgets in clone after default values have been set
                    if ( !initialFormLoad ) {
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
            remove: function( $repeat ) {
                var delay = 600,
                    that = this,
                    $prev = $repeat.prev( '.or-repeat' ),
                    repeatPath = $repeat.attr( 'name' ),
                    repeatIndex = $form.find( '.or-repeat[name="' + repeatPath + '"]' ).index( $repeat ),
                    $siblings = $repeat.siblings( '.or-repeat' );

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
                var $repeat, $repSiblingsAndSelf;

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
                    var $repSiblings, qtyRepeats, i,
                        $repeat = $( this );
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

            // Why is the file namespace added?
            $form.on( 'change.file validate', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                var validCons, validReq, _dataNodeObj,
                    $input = $( this ),
                    // all relevant properties, except for the **very expensive** index property
                    n = {
                        path: that.input.getName( $input ),
                        inputType: that.input.getInputType( $input ),
                        xmlType: that.input.getXmlType( $input ),
                        enabled: that.input.isEnabled( $input ),
                        constraint: that.input.getConstraint( $input ),
                        val: that.input.getVal( $input ),
                        required: that.input.isRequired( $input )
                    },
                    getDataNodeObj = function() {
                        if ( !_dataNodeObj ) {
                            // Only now, will we determine the index.
                            n.ind = that.input.getIndex( $input );
                            _dataNodeObj = model.node( n.path, n.ind );
                        }
                        return _dataNodeObj;
                    };


                // set file input values to the actual name of file (without c://fakepath or anything like that)
                if ( n.val.length > 0 && n.inputType === 'file' && $input[ 0 ].files[ 0 ] && $input[ 0 ].files[ 0 ].size > 0 ) {
                    n.val = $input[ 0 ].files[ 0 ].name;
                }

                if ( event.type === 'validate' ) {
                    // The enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not.
                    // If an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid).
                    if ( !n.enabled || n.inputType === 'hidden' ) {
                        validCons = true;
                    } else
                    // Use a dirty trick to not have to determine the index with the following insider knowledge.
                    // It could potentially be sped up more by excluding n.val === "", but this would not be safe, in case the view is not in sync with the model.
                    if ( !n.constraint && ( n.xmlType === 'string' || n.xmlType === 'select' || n.xmlType === 'select1' || n.xmlType === 'binary' ) ) {
                        validCons = true;
                    } else {
                        validCons = getDataNodeObj().validate( n.constraint, n.xmlType );
                    }
                } else {
                    validCons = getDataNodeObj().setVal( n.val, n.constraint, n.xmlType );
                    // geotrace and geoshape are very complex data types that require various change events
                    // to avoid annoying users, we ignore the INVALID onchange validation result
                    validCons = ( validCons === false && ( n.xmlType === 'geotrace' || n.xmlType === 'geoshape' ) ) ? null : validCons;
                }

                // validate 'required', checking value in Model (not View)
                validReq = !( n.enabled && n.inputType !== 'hidden' && n.required && getDataNodeObj().getVal()[ 0 ].length === 0 );

                if ( validReq === false ) {
                    that.setValid( $input, 'constraint' );
                    if ( event.type === 'validate' ) {
                        that.setInvalid( $input, 'required' );
                    }
                } else {
                    that.setValid( $input, 'required' );
                    if ( typeof validCons !== 'undefined' && validCons === false ) {
                        that.setInvalid( $input, 'constraint' );
                    } else if ( validCons !== null ) {
                        that.setValid( $input, 'constraint' );
                    }
                }

                // propagate event externally after internal processing is completed
                if ( event.type === 'change' ) {
                    $form.trigger( 'valuechange.enketo' );
                }
            } );

            // doing this on the focus event may have little effect on performance, because nothing else is happening :)
            $form.on( 'focus fakefocus', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                // update the form progress status
                that.progress.update( event.target );
            } );

            //using fakefocus because hidden (by widget) elements won't get focus
            $form.on( 'focus blur fakefocus fakeblur', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                var $input = $( this ),
                    props = that.input.getProps( $input ),
                    $question = $input.closest( '.question' ),
                    $legend = $question.find( 'legend' ).eq( 0 ),
                    loudErrorShown = $question.hasClass( 'invalid-required' ) || $question.hasClass( 'invalid-constraint' ),
                    insideTable = ( $input.parentsUntil( '.or', '.or-appearance-list-nolabel' ).length > 0 ),
                    $reqSubtle = $question.find( '.required-subtle' ),
                    reqSubtle = $( '<span class="required-subtle" style="color: transparent;">Required</span>' );

                if ( event.type === 'focusin' || event.type === 'fakefocus' ) {
                    $question.addClass( 'focus' );
                    if ( props.required && $reqSubtle.length === 0 && !insideTable ) {
                        $reqSubtle = $( reqSubtle );

                        if ( $legend.length > 0 ) {
                            $legend.append( $reqSubtle );
                        } else {
                            $reqSubtle.insertBefore( this );
                        }

                        if ( !loudErrorShown ) {
                            $reqSubtle.show( function() {
                                $( this ).removeAttr( 'style' );
                            } );
                        }
                    } else if ( !loudErrorShown ) {
                        //$question.addClass( 'focus' );
                    }
                } else if ( event.type === 'focusout' || event.type === 'fakeblur' ) {
                    $question.removeClass( 'focus' );
                    if ( props.required && props.val.length > 0 ) {
                        $reqSubtle.remove();
                    } else if ( !loudErrorShown ) {
                        $reqSubtle.removeAttr( 'style' );
                    }
                }
            } );

            model.$.on( 'dataupdate', function( event, updated ) {
                that.calcUpdate( updated ); //EACH CALCUPDATE THAT CHANGES A VALUE TRIGGERS ANOTHER CALCUPDATE => INEFFICIENT
                that.branchUpdate( updated );
                that.outputUpdate( updated );
                that.itemsetUpdate( updated );
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
            this.input.getWrapNodes( $node ).removeClass( classes );
        };

        FormView.prototype.setInvalid = function( $node, type ) {
            type = type || 'constraint';
            this.input.getWrapNodes( $node ).addClass( 'invalid-' + type ).find( '.required-subtle' ).attr( 'style', 'color: transparent;' );
        };

        /**
         * Validates all enabled input fields after first resetting everything as valid.
         * @return {boolean} whether the form contains any errors
         */
        FormView.prototype.validateAll = function() {
            var $firstError,
                that = this;

            //can't fire custom events on disabled elements therefore we set them all as valid
            $form.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, ' +
                'input:disabled, select:disabled, textarea:disabled' ).each( function() {
                that.setValid( $( this ) );
            } );

            $form.find( '.question' ).each( function() {
                // only trigger validate on first input and use a **pure CSS** selector (huge performance impact)
                $( this )
                    .find( 'input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)' )
                    .eq( 0 )
                    .trigger( 'validate' );
            } );

            $firstError = $form.find( '.invalid-required, .invalid-constraint' ).eq( 0 );

            if ( $firstError.length > 0 && window.scrollTo ) {
                if ( this.pages.active ) {
                    // move to the first page with an error
                    this.pages.flipToPageContaining( $firstError );
                }
                window.scrollTo( 0, $firstError.offset().top - 50 );
            }
            return $firstError.length === 0;
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
    }

    module.exports = Form;
} );
