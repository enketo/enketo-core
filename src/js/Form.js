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

define( [ 'enketo-js/FormModel', 'enketo-js/widgets', 'jquery', 'enketo-js/plugins', 'enketo-js/extend', 'jquery.touchswipe' ],
    function( FormModel, widgets, $ ) {
        "use strict";

        /**
         * Class: Form
         *
         * This class provides the JavaRosa form functionality by manipulating the survey form DOM object and
         * continuously updating the data XML Document. All methods are placed inside the constructor (so privileged
         * or private) because only one instance will be created at a time.
         *
         * @param {string} formSelector  jquery selector for the form
         * @param {string} dataStr       <instance> as XML string
         * @param {?string=} dataStrToEdit <instance> as XML string that is to be edit. This may not be a complete instance (empty nodes could be missing) and may have additional nodes.
         * @param { ?boolean= } unsubmitted    whether the dataStrToEdit has been submitted to the OpenRosa server before
         *
         * @constructor
         */

        function Form( formSelector, dataStr, dataStrToEdit, unsubmitted ) {
            var model, dataToEdit, cookies, form, $form, $formClone, repeatsPresent, fixExpr,
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

                model = new FormModel( dataStr );
                form = new FormView( formSelector );

                //var profiler = new Profiler('model.init()');
                loadErrors = loadErrors.concat( model.init() );

                //profiler.report();

                if ( typeof dataStrToEdit !== 'undefined' && dataStrToEdit && dataStrToEdit.length > 0 ) {
                    dataToEdit = new FormModel( dataStrToEdit );
                    loadErrors = loadErrors.concat( dataToEdit.init() );
                    this.load( dataToEdit );
                }
                repeatsPresent = ( $( formSelector ).find( '.or-repeat' ).length > 0 );

                //profiler = new Profiler('html form.init()');
                form.init();
                //profiler.report();

                if ( loadErrors.length > 0 ) {
                    console.error( 'loadErrors: ', loadErrors );
                }

                if ( window.scrollTo ) {
                    window.scrollTo( 0, 0 );
                }

                return loadErrors;
            };

            this.ex = function( expr, type, selector, index ) {
                return model.evaluate( expr, type, selector, index );
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
            this.getDataStr = function( incTempl, incNs, all ) {
                return model.getStr( incTempl, incNs, all );
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
             * Function to load an (possibly incomplete) instance so that it can be edited.
             *
             * @param  {Object} instanceOfFormModel [description]
             *
             */
            this.load = function( instanceOfFormModel ) {
                var nodesToLoad, index, xmlDataType, path, value, target, $input, $target, $template, instanceID, error,
                    filter = {
                        noTemplate: true,
                        noEmpty: true
                    };

                nodesToLoad = instanceOfFormModel.node( null, null, filter ).get();
                // first empty all form data nodes, to clear any default values except those inside templates
                model.node( null, null, filter ).get().each( function() {
                    // something seems fishy about doing it this way instead of using node.setVal('');
                    $( this ).text( '' );
                } );

                nodesToLoad.each( function() {
                    var errMsg,
                        name = $( this ).prop( 'nodeName' );
                    path = $( this ).getXPath( 'instance' );
                    index = instanceOfFormModel.node( path ).get().index( $( this ) );
                    value = $( this ).text();

                    //input is not populated in this function, so we take index 0 to get the XML data type
                    $input = $form.find( '[name="' + path + '"]' ).eq( 0 );

                    xmlDataType = ( $input.length > 0 ) ? form.input.getXmlType( $input ) : 'string';

                    // If XML type is binary, the XML node will get the file attribute.
                    // If a record is loaded for editing via API (without media files)
                    // this will trigger an error message upon submission, because the 
                    // file cannot be found in the local filesystem.
                    // To avoid showing this error message in that particular case, 
                    // we cheat and pretend the XML data type is the plain old 'string'
                    if ( !unsubmitted ) {
                        xmlDataType = ( xmlDataType === 'binary' ) ? 'string' : xmlDataType;
                    }

                    target = model.node( path, index );

                    /*
                     *  Proper error handling on xfind with .error(function(){}) doesn't seem to work
                     *  this catch block is created to catch namespace prefix errors.
                     *  When we have WGXP, it would be better to remove this and
                     *  replace xfind with the proper XPath evaluator and pass a namespace handler
                     *  currently namespace prefix errors show up as 'unsupported psuedo selector' in JQuery
                     *  Note that this is just additional security because known namespaces will be removed in PHP.
                     */
                    try {
                        $target = target.get();
                    } catch ( error ) {
                        console.error( error );
                        errMsg = error.message || 'unknown error';
                        loadErrors.push( errMsg + ' when retrieving ' + path );
                        return;
                    }

                    //if there are multiple nodes with that name and index (actually impossible)
                    if ( $target.length > 1 ) {
                        console.error( 'Found multiple nodes with path: ' + path + ' and index: ' + index );
                    }
                    //if there is a corresponding node in the form's original instance
                    else if ( $target.length === 1 ) {
                        //set the value
                        target.setVal( value, null, xmlDataType );
                    }
                    //if there is no corresponding data node but there is a corresponding template node (=> <repeat>)
                    //this use of node(path,index,file).get() is a bit of a trick that is difficult to wrap one's head around
                    else if ( model.node( path, 0, {
                            noTemplate: false
                        } ).get().closest( '[template]' ).length > 0 ) {
                        //clone the template node 
                        //TODO add support for repeated nodes in forms that do not use template="" (not possible in formhub)
                        $template = model.node( path, 0, {
                            noTemplate: false
                        } ).get().closest( '[template]' );
                        //TODO: test this for nested repeats
                        //if a preceding repeat with that path was empty this repeat may not have been created yet,
                        //so we need to make sure all preceding repeats are created
                        for ( var p = 0; p < index; p++ ) {
                            model.cloneTemplate( $template.getXPath( 'instance' ), p );
                        }
                        //try setting the value again
                        target = model.node( path, index );
                        if ( target.get().length === 1 ) {
                            target.setVal( value, null, xmlDataType );
                        } else {
                            error = 'Error occured trying to clone template node to set the repeat value of the instance to be edited.';
                            console.error( error );
                            loadErrors.push( error );
                        }
                    }
                    //as an exception, missing meta nodes will be quietly added if a meta node exists at that path
                    //the latter requires e.g the root node to have the correct name
                    else if ( $( this ).parent( 'meta' ).length === 1 && model.node( $( this ).parent( 'meta' ).getXPath( 'instance' ), 0 ).get().length === 1 ) {
                        //if there is no existing meta node with that node as child
                        if ( model.node( ':first > meta > ' + name, 0 ).get().length === 0 ) {
                            $( this ).clone().appendTo( model.node( ':first > meta' ).get() );
                        } else {
                            error = 'Found duplicate meta node (' + name + ')!';
                            console.error( error );
                            loadErrors.push( error );
                        }
                    } else {
                        error = 'Did not find form element with path: ' + path + ' and index: ' + index + ' so failed to load model.';
                        console.error( error );
                        loadErrors.push( error );
                    }
                } );

                instanceID = model.node( '*>meta>instanceID' );
                if ( instanceID.get().length !== 1 ) {
                    error = 'InstanceID node in default instance error (found ' + instanceID.get().length + ' instanceID nodes)';
                    console.error( error );
                    loadErrors.push( error );
                    return;
                }

                // if record is not local, copy instanceID value to deprecatedID and empty instanceID
                if ( !unsubmitted ) {
                    // add deprecatedID node
                    if ( model.node( '*>meta>deprecatedID' ).get().length !== 1 ) {
                        var deprecatedIDXMLNode = $.parseXML( "<deprecatedID/>" ).documentElement;
                        document.adoptNode( deprecatedIDXMLNode );
                        $( deprecatedIDXMLNode ).appendTo( model.node( '*>meta' ).get() );
                    }

                    model.node( '*>meta>deprecatedID' ).setVal( instanceID.getVal()[ 0 ], null, 'string' );
                    instanceID.setVal( '', null, 'string' );
                }
            };

            // Implements jr:choice-name
            // TODO: this needs to work for all expressions (relevants, constraints), now it only works for calulated items
            // Ideally this belongs in the form Model, but unfortunately it needs access to the view
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
                    return expr.replace( matches[ 0 ], "'" + label + "'" );
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
                var name, $required, $hint;

                if ( typeof model == 'undefined' || !( model instanceof FormModel ) ) {
                    return console.error( 'variable data needs to be defined as instance of FormModel' );
                }

                //var profiler = new Profiler('preloads.init()');
                // before widgets.init (as instanceID used in offlineFilepicker widget)
                this.preloads.init( this );
                //profiler.report();

                this.grosslyViolateStandardComplianceByIgnoringCertainCalcs(); //before calcUpdate!

                //profiler = new Profiler('calcupdate');
                // before repeat.init as repeat count may use a calculated item
                this.calcUpdate();
                //profiler.report();

                //profiler = new Profiler('setLangs()');
                // test: before itemsetUpdate
                this.langs.init();
                //profiler.report();

                //profiler = new Profiler('repeat.init()');
                // after radio button data-name setting
                this.repeat.init( this );
                //profiler.report();

                //profiler = new Profiler('itemsets initialization');
                this.itemsetUpdate();
                //profiler.report();

                //profiler = new Profiler('setting default values in form inputs');
                this.setAllVals();
                //profiler.report();

                //profiler = new Profiler('widgets initialization');
                // after setAllVals()
                widgets.init();
                //profiler.report();

                //profiler = new Profiler('bootstrapify');
                this.bootstrapify();
                //profiler.report();

                //profiler = new Profiler('branch.init()');
                // after widgets.init()
                this.branchUpdate();
                //profiler.report();

                this.pages.init(); // after branch.init();

                //profiler = new Profiler('outputUpdate initial');
                this.outputUpdate();
                //profiler.report();

                // after widgets init to make sure widget handlers are called before
                // after loading existing instance to not trigger an 'edit' event
                this.setEventHandlers();

                this.editStatus.set( false );
                //profiler.report('time taken across all functions to evaluate '+xpathEvalNum+' XPath expressions: '+xpathEvalTime);
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

                        this.setToCurrent( $allPages.first( ':not(.disabled)' ) );

                        //console.log( 'all pages', $allPages );

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

                        $form.show();
                    }
                },
                setButtonHandlers: function() {
                    var that = this;
                    this.$btnFirst.click( function() {
                        that.flipToFirst();
                        return false;
                    } );
                    this.$btnPrev.click( function() {
                        that.prev();
                        return false;
                    } );
                    this.$btnNext.click( function() {
                        console.log( 'next!' );
                        that.next();
                        return false;
                    } );
                    this.$btnLast.click( function() {
                        that.flipToLast();
                        return false;
                    } );
                },
                setSwipeHandlers: function() {
                    var that = this;
                    $( document ).swipe( {
                        allowPageScroll: "vertical",
                        threshold: 50,
                        swipeLeft: function( ev ) {
                            that.next();
                        },
                        swipeRight: function( ev ) {
                            console.log( 'swipe left!' );
                            that.prev();
                        }
                    } );
                },
                setRepeatHandlers: function() {
                    var that = this;
                    // TODO: can be optimized by smartly updating the active pages
                    $form.on( 'addrepeat', function( event ) {
                        that.updateAllActive();
                        //removing the class in effect avoids the animation
                        $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                        that.flipToPageContaining( $( event.target ) );
                    } );
                    $form.on( 'removerepeat', function( event ) {
                        console.log( 'handling repeat removal in page object', event.target );
                        // if the current page is removed
                        // note that that.$current will have length 1 even if it was removed from DOM!!
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
                    $form.on( 'showbranch hidebranch', function( event ) {
                        that.updateAllActive();
                        that.toggleButtons();
                    } );
                },
                getCurrent: function() {
                    return this.$current;
                },
                updateAllActive: function( $all ) {
                    //console.log( 'refreshing collection of active pages' );
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
                    } else {
                        console.log( 'no page present to flip forward to!' );
                    }
                },
                prev: function() {
                    var prev, currentIndex;
                    this.updateAllActive();
                    currentIndex = this.getCurrentIndex();
                    prev = this.getPrev( currentIndex );

                    if ( prev ) {
                        this.flipTo( prev, currentIndex - 1 );
                    } else {
                        console.log( 'no page present to flip backward to' );
                    }
                },
                setToCurrent: function( pageEl ) {
                    var $n = $( pageEl );
                    $n.addClass( 'current hidden' );
                    this.$current = $n.removeClass( 'hidden' )
                        .parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).addClass( 'contains-current' ).end();
                },
                flipTo: function( pageEl, newIndex ) {
                    var that = this;

                    // if there is a current page
                    if ( this.$current.length > 0 && this.$current.closest( 'html' ).length === 1 ) {
                        // if current page is not same as pageEl
                        if ( this.$current[ 0 ] !== pageEl ) {
                            this.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                            this.setToCurrent( pageEl );
                            this.focusOnFirstQuestion( pageEl );
                            this.toggleButtons( newIndex );
                        }

                        // this.$current.addClass( 'fade-out' )
                        //     .one( 'transitionend', function() {
                        //         that.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                        //         that.setToCurrent( pageEl );
                        //         that.focusOnFirstQuestion( pageEl );
                        //         that.toggleButtons( newIndex );
                        //     } );
                        // }
                    } else {
                        this.setToCurrent( pageEl );
                        this.focusOnFirstQuestion( pageEl );
                        this.toggleButtons( newIndex );
                    }


                    if ( window.scrollTo ) {
                        window.scrollTo( 0, 0 );
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
                    $( pageEl ).find( '.question:not(.disabled)' ).filter( function() {
                        return $( this ).parents( '.disabled' ).length === 0;
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
                    return ( type == 'fieldset' ) ? $inputNodes : $inputNodes.closest( '.question, .note' );
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
                        constraint: $node.attr( 'data-constraint' ),
                        relevant: $node.attr( 'data-relevant' ),
                        val: this.getVal( $node ),
                        required: ( $node.attr( 'required' ) !== undefined && $node.parents( '.or-appearance-label' ).length === 0 ) ? true : false,
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
                    if ( nodeName == 'input' ) {
                        if ( $node.attr( 'type' ).length > 0 ) {
                            return $node.attr( 'type' ).toLowerCase();
                        } else {
                            return console.error( '<input> node has no type' );
                        }
                    } else if ( nodeName == 'select' ) {
                        return 'select';
                    } else if ( nodeName == 'textarea' ) {
                        return 'textarea';
                    } else if ( nodeName == 'fieldset' || nodeName == 'section' ) {
                        return 'fieldset';
                    } else return console.error( 'unexpected input node type provided' );
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
                    return ( this.getInputType( $node ) == 'checkbox' || $node.attr( 'multiple' ) !== undefined ) ? true : false;
                },
                isEnabled: function( $node ) {
                    return !( $node.prop( 'disabled' ) || $node.parents( '.disabled' ).length > 0 );
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
                    var $inputNodes, type, date, $target;
                    // values = value.split(' ');
                    index = index || 0;

                    if ( this.getInputType( $form.find( '[data-name="' + name + '"]' ).eq( 0 ) ) == 'radio' ) {
                        $target = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) ).eq( index ).find( 'input[value="' + value + '"]' );
                        // why not use this.getIndex?
                        $target.prop( 'checked', true );
                        return;
                    } else {
                        // why not use this.getIndex?
                        $inputNodes = this.getWrapNodes( $form.find( '[name="' + name + '"]' ).eq( index ) ).find( '[name="' + name + '"]' );
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
                            value = model.node().convert( value, type );
                        }
                    }

                    if ( this.isMultiple( $inputNodes.eq( 0 ) ) === true ) {
                        value = value.split( ' ' );
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

                model.node( selector, groupIndex, {
                    noEmpty: true
                } ).get().each( function() {
                    try {
                        value = $( this ).text();
                        name = $( this ).getXPath( 'instance' );
                        index = model.node( name ).get().index( $( this ) );
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
                        setOptionLangs,
                        defaultLang = $form.find( '#form-languages' ).attr( 'data-default-lang' ),
                        $langSelector = $( '.form-language-selector' );

                    $( '#form-languages' ).detach().appendTo( $langSelector );

                    if ( !defaultLang || defaultLang === '' ) {
                        defaultLang = $( '#form-languages option' ).eq( 0 ).attr( 'value' );
                    }
                    $( '#form-languages' ).val( defaultLang );

                    if ( $( '#form-languages option' ).length < 2 ) {
                        return;
                    }

                    $langSelector.removeClass( 'hide' );

                    $( '#form-languages' ).change( function( event ) {
                        lang = $( this ).val();
                        event.preventDefault();
                        that.setAll( lang );
                    } );
                },
                setAll: function( lang ) {
                    var that = this;
                    $( '#form-languages option' ).removeClass( 'active' );
                    $( this ).addClass( 'active' );

                    $form.find( '[lang]' )
                        .removeClass( 'active' )
                        .filter( '[lang="' + lang + '"], [lang=""]' )
                        .filter( function( index ) {
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
                        curLabel = $( this ).text();
                        value = $( this ).attr( 'value' );
                        newLabel = $( this ).parent( 'select' ).siblings( '.or-option-translations' )
                            .children( '.active[data-option-value="' + value + '"]' ).text().trim();
                        newLabel = ( typeof newLabel !== 'undefined' && newLabel.length > 0 ) ? newLabel : curLabel;
                        $( this ).text( newLabel );
                    } );
                }
            };


            FormView.prototype.editStatus = {
                set: function( status ) {
                    // only trigger edit event once
                    if ( status && status !== $form.data( 'edited' ) ) {
                        $form.trigger( 'edited' );
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
                        .closest( '.calculation, .question, .note, .trigger' ).filter( function( index ) {
                            return $( this ).closest( '.or-repeat' ).length === 0;
                        } );
                }

                // If the updated node is inside a repeat (and there are multiple repeats present)
                if ( typeof updated.repeatPath !== 'undefined' && updated.repeatIndex >= 0 ) {
                    $repeat = $form.find( '.or-repeat[name="' + updated.repeatPath + '"]' ).eq( updated.repeatIndex );
                }

                // If the update was triggered from a repeat, it improves performance (a lot)
                // to exclude all those repeats that did not trigger it...
                $collection = ( $repeat ) ? this.$nonRepeats[ attr ].add( $repeat ) : $form;

                if ( !updated.nodes || updated.nodes.length === 0 ) {
                    selector = [ filter + '[' + attr + ']' ];
                } else {
                    updated.nodes.forEach( function( node ) {
                        selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, node ) );
                    } );
                    // add all the paths that use the /* selector at end of path
                    selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, '*' ) );
                }

                //TODO: exclude descendents of disabled elements? .find( ':not(:disabled) span.active' )
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
                    that = this,
                    evaluations = 0,
                    clonedRepeatsPresent;

                // console.log( 'branchUpdate', updated );

                $nodes = this.getNodesToUpdate( 'data-relevant', '', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $nodes.each( function() {
                    //note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
                    if ( $.inArray( $( this ).attr( 'name' ), alreadyCovered ) !== -1 ) {
                        return;
                    }
                    p = {};
                    cacheIndex = null;

                    p.relevant = $( this ).attr( 'data-relevant' );
                    p.path = that.input.getName( $( this ) );

                    $branchNode = $( this ).closest( '.or-branch' );

                    if ( $branchNode.length !== 1 ) {
                        if ( $( this ).parents( '#or-calculated-items' ).length === 0 ) {
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
                    insideRepeat = ( clonedRepeatsPresent && $branchNode.closest( '.or-repeat' ).length > 0 ) ? true : false;
                    insideRepeatClone = ( clonedRepeatsPresent && $branchNode.closest( '.or-repeat.clone' ).length > 0 ) ? true : false;
                    /*
                     * Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
                     * It can be safely set to 0 for other branches.
                     */
                    p.ind = ( insideRepeatClone ) ? that.input.getIndex( $( this ) ) : 0;
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
                        evaluations++;
                        relevantCache[ cacheIndex ] = result;
                    }

                    if ( !insideRepeat ) {
                        alreadyCovered.push( $( this ).attr( 'name' ) );
                    }

                    process( $branchNode, result );
                } );

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
                        $branchNode.removeClass( 'disabled pre-init' ).trigger( 'showbranch' );
                        widgets.enable( $branchNode );

                        type = $branchNode.prop( 'nodeName' ).toLowerCase();

                        if ( type === 'label' ) {
                            $branchNode.children( 'input:not(.force-disabled), select, textarea' ).prop( 'disabled', false );
                        } else if ( type === 'fieldset' ) {
                            $branchNode.prop( 'disabled', false );
                            /*
                             * A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503
                             * where the file inputs end up in a weird partially enabled state.
                             * Refresh the state by disabling and enabling the file inputs again.
                             */
                            $branchNode.find( '*:not(.or-branch) input[type="file"]:not(.force-disabled, [data-relevant])' )
                                .prop( 'disabled', true ).prop( 'disabled', false );
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
                    if ( selfRelevant( $branchNode ) || virgin ) {
                        $branchNode.addClass( 'disabled' ).trigger( 'hidebranch' );

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
                var clonedRepeatsPresent, insideRepeat, insideRepeatClone, $repeat, $nodes,
                    that = this,
                    cleverSelector = [],
                    needToUpdateLangs = false,
                    itemsCache = {};

                // console.log( 'itemsetUpdate', updated );

                $nodes = this.getNodesToUpdate( 'data-items-path', '.itemset-template', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $nodes.each( function() {
                    var $htmlItem, $htmlItemLabels, /**@type {string}*/ value, $instanceItems, index, context,
                        $template = $( this ),
                        newItems = {},
                        prevItems = $template.data(),
                        templateNodeName = $( this ).prop( 'nodeName' ).toLowerCase(),
                        $input = ( templateNodeName === 'label' ) ? $( this ).children( 'input' ).eq( 0 ) : $( this ).parent( 'select' ),
                        $labels = $template.closest( 'label, select' ).siblings( '.itemset-labels' ),
                        itemsXpath = $template.attr( 'data-items-path' ),
                        labelType = $labels.attr( 'data-label-type' ),
                        labelRef = $labels.attr( 'data-label-ref' ),
                        valueRef = $labels.attr( 'data-value-ref' );

                    context = that.input.getName( $input );

                    /*
                     * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
                     * It can be safely set to 0 for other branches.
                     */
                    insideRepeat = ( clonedRepeatsPresent && $input.closest( '.or-repeat' ).length > 0 ) ? true : false;
                    insideRepeatClone = ( clonedRepeatsPresent && $input.closest( '.or-repeat.clone' ).length > 0 ) ? true : false;

                    index = ( insideRepeatClone ) ? that.input.getIndex( $input ) : 0;

                    if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                        $instanceItems = itemsCache[ itemsXpath ];
                    } else {
                        var safeToTryNative = true; // temporary until WGXP
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

                    // console.log( 'template node name:', templateNodeName, '$template', $template );

                    // clear data values through inputs. Note: if a value exists, 
                    // this will trigger a dataupdate event which may call this update function again
                    $( this ).closest( '.question' )
                        .clearInputs( 'change' )
                        .find( templateNodeName ).not( $template ).remove();
                    $( this ).parent( 'select' ).siblings( '.or-option-translations' ).empty();

                    $instanceItems.each( function() {
                        $htmlItem = $( '<root/>' );
                        $template
                            .clone().appendTo( $htmlItem )
                            .removeClass( 'itemset-template' )
                            .addClass( 'itemset' )
                            .removeAttr( 'data-items-path' );

                        $htmlItemLabels = ( labelType === 'itext' ) ?
                            $labels.find( '[data-itext-id="' + $( this ).children( labelRef ).text() + '"]' ).clone() :
                            $( '<span class="active" lang="">' + $( this ).children( labelRef ).text() + '</span>' );

                        value = $( this ).children( valueRef ).text();
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
                var expr, clonedRepeatsPresent, insideRepeat, insideRepeatClone, $context, context, index, $nodes,
                    outputCache = {},
                    val = '',
                    that = this;

                // console.log( 'outputUpdate', updated );

                $nodes = this.getNodesToUpdate( 'data-value', '.or-output', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $nodes.each( function() {
                    expr = $( this ).attr( 'data-value' );
                    /*
                     * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
                     * should look at the HTML input to determine the context.
                     * So, context is either the input name attribute (if output is inside input label),
                     * or the parent with a name attribute
                     * or the whole document
                     */
                    $context = ( $( this ).parent( 'span' ).parent( 'label' ).find( '[name]' ).eq( 0 ).length === 1 ) ?
                        $( this ).parent().parent().find( '[name]' ).eq( 0 ) :
                        $( this ).parent( 'span' ).parent( 'legend' ).parent( 'fieldset' ).find( '[name]' ).eq( 0 ).length === 1 ?
                        $( this ).parent().parent().parent().find( '[name]' ).eq( 0 ) : $( this ).closest( '[name]' );
                    context = that.input.getName( $context );
                    insideRepeat = ( clonedRepeatsPresent && $( this ).closest( '.or-repeat' ).length > 0 );
                    insideRepeatClone = ( clonedRepeatsPresent && $( this ).closest( '.or-repeat.clone' ).length > 0 );
                    index = ( insideRepeatClone ) ? that.input.getIndex( $context ) : 0;

                    if ( typeof outputCache[ expr ] !== 'undefined' ) {
                        val = outputCache[ expr ];
                    } else {
                        val = model.evaluate( expr, 'string', context, index );
                        if ( !insideRepeat ) {
                            outputCache[ expr ] = val;
                        }
                    }
                    if ( $( this ).text !== val ) {
                        $( this ).text( val );
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
                    //console.log( "Found meta/instanceID with binding that has a calculate attribute and removed this calculation. It ain't right!" );
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

                // console.log( 'calcUpdate', updated );

                $nodes = this.getNodesToUpdate( 'data-calculate', '', updated );

                // add relevant items that have a (any) calculation
                $nodes = $nodes.add( this.getNodesToUpdate( 'data-relevant', '[data-calculate]', updated ) );

                $nodes.each( function() {
                    var result, valid, $dataNodes, $dataNode, index,
                        $this = $( this ),
                        name = $this.attr( 'name' ),
                        dataNodeName = ( name.lastIndexOf( '/' ) !== -1 ) ? name.substring( name.lastIndexOf( '/' ) + 1 ) : name,
                        expr = $this.attr( 'data-calculate' ),
                        dataType = $this.attr( 'data-type-xml' ),
                        // for inputs that have a calculation and need to be validated
                        constraint = $this.attr( 'data-constraint' ),
                        relevantExpr = $this.attr( 'data-relevant' ),
                        relevant = ( relevantExpr ) ? model.evaluate( relevantExpr, 'boolean', name ) : true;

                    /*
                     * If the update was triggered by a datanode inside a repeat
                     * and the dependent node is inside the same repeat
                     */
                    $dataNodes = model.node( name ).get();

                    if ( $dataNodes.length > 1 && updated.repeatPath && name.indexOf( updated.repeatPath ) !== -1 ) {
                        $dataNode = model.node( updated.repeatPath, updated.repeatIndex ).get().find( dataNodeName );
                        index = $dataNodes.index( $dataNode );
                    } else if ( $dataNodes.length === 1 ) {
                        index = 0;
                    } else {
                        console.error( 'Potential issue: Multiple data nodes with same path found. Cannot deal with this and will just ignore them. ', $dataNodes );
                        return;
                    }

                    //not sure if using 'string' is always correct
                    expr = fixExpr( expr, 'string', name, index );

                    // it is possible that the fixed expr is '' which causes an error in XPath
                    result = ( relevant && expr ) ? model.evaluate( expr, 'string', name, index ) : '';
                    valid = model.node( name, index ).setVal( result, constraint, dataType );

                    // not the most efficient to use input.setVal here as it will do another lookup
                    // of the node, that we already have...
                    that.input.setVal( name, index, result );
                } );
            };

            FormView.prototype.bootstrapify = function() {
                //if no constraintmessage use a default
                //TODO: move to XSLT
                $form.addClass( 'clearfix' )
                    .find( 'label, legend' ).each( function() {
                        var $label = $( this );
                        if ( $label.parent( '.option-wrapper' ).length === 0 &&
                            $label.parent( '#or-calculated-items, #or-preload-items' ).length === 0 &&
                            $label.find( '.or-constraint-msg' ).length === 0 &&
                            ( $label.prop( 'nodeName' ).toLowerCase() == 'legend' ||
                                $label.children( 'input.ignore' ).length !== $label.children( 'input' ).length ||
                                $label.children( 'select.ignore' ).length !== $label.children( 'select' ).length ||
                                $label.children( 'textarea.ignore' ).length !== $label.children( 'textarea' ).length ) ) {
                            $label.prepend( '<span class="or-constraint-msg active" lang="">Value not allowed</span>' );
                        }
                    } );

                //move constraint message to bottom of question and add message for required (could also be done in XSLT)
                //TODO: move to XSLT
                $form.find( '.or-constraint-msg' ).each( function() {
                    var $question = $( this ).closest( '.question' ).not( '.or-appearance-label' ),
                        $constraintMsg = $( this ).detach(),
                        isRequired = $question.find( '[required]' ).length > 0,
                        hasRequiredMsg = $question.find( '.or-required-msg' ).length > 0;

                    $question.append( $constraintMsg );
                    if ( !hasRequiredMsg && isRequired ) {
                        $constraintMsg.after( '<span class="or-required-msg active" lang="">This field is required</span>' );
                    }
                } );

                // took a shortcut, but this should actually move to its own 'horizontal-choices-widget'
                // even better to move to XSLT
                $form.find( '.or-appearance-horizontal .option-wrapper' ).each( function() {
                    var $wrapper = $( this ),
                        $options = $wrapper.find( 'label' );

                    if ( ( $options.length % 3 ) === 2 ) {
                        $wrapper.append( '<label class="filler"></label>' );
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
                    var item, param, name, curVal, newVal, meta, dataNode, props, xmlType,
                        that = this;
                    //these initialize actual preload items
                    $form.find( '#or-preload-items input' ).each( function() {
                        props = parentO.input.getProps( $( this ) );
                        item = $( this ).attr( 'data-preload' ).toLowerCase();
                        param = $( this ).attr( 'data-preload-params' ).toLowerCase();

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
                    meta = model.node( '*>meta>*' );
                    meta.get().each( function() {
                        item = null;
                        name = $( this ).prop( 'nodeName' );
                        dataNode = model.node( '*>meta>' + name );
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
                    var value,
                        that = this;
                    // when is 'start' or 'end'
                    if ( o.param == 'start' ) {
                        return ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( 'now()', 'string' );
                    }
                    if ( o.param == 'end' ) {
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
                        return ( o.param == 'application' ) ? 'enketo' : o.param + ' not supported in enketo';
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
                    //uuid, user_id, user_type
                    //if (o.param == 'uuid'){
                    //  return (o.curVal.length > 1) ? o.curVal : model.evaluate('uuid()', 'string');
                    //}
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
                'browser': function( o ) {
                    /*if (o.curVal.length === 0){
                    if (o.param == 'name'){ 
                    var a = ($.browser.webkit) ? 'webkit' : ($.browser.mozilla) ? 'mozilla' : ($.browser.opera) ? 'opera' : ($.browser.msie) ? 'msie' : 'unknown';
                    //console.debug(a);
                    return a;
                    }
                    if (o.param == 'version'){
                    return $.browser.version;
                    }
                    return o.param+' not supported in enketo';
                    }
                    return o.curVal;*/
                },
                'os': function( o ) {
                    if ( o.curVal.length === 0 ) {
                        return 'not known';
                    }
                    return o.curVal;
                },
                //Not according to spec yet, this will be added to spec but name may change
                'instance': function( o ) {
                    var id = ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( "concat('uuid:', uuid())", 'string' );
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
                    var i, numRepsInCount, repCountPath, numRepsInInstance, numRepsDefault, cloneDefaultReps, repLevel, $dataRepeat, index,
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

                    cloneDefaultReps = function( $repeat ) {
                        repLevel++;
                        repCountPath = $repeat.attr( 'data-repeat-count' ) || "";
                        numRepsInCount = ( repCountPath.length > 0 ) ? parseInt( model.node( repCountPath ).getVal()[ 0 ], 10 ) : 0;
                        // console.debug('number of reps in count attribute: ' +numRepsInCount);
                        index = $form.find( '.or-repeat[name="' + $repeat.attr( 'name' ) + '"]' ).index( $repeat );
                        $dataRepeat = model.node( $repeat.attr( 'name' ), index ).get();
                        numRepsInInstance = $dataRepeat.siblings( $dataRepeat.prop( 'nodeName' ) + ':not([template])' ).addBack().length;
                        numRepsDefault = ( numRepsInCount > numRepsInInstance ) ? numRepsInCount : numRepsInInstance;
                        // console.debug('default number of repeats for '+$repeat.attr('name')+' is '+numRepsDefault);
                        // First rep is already included (by XSLT transformation)
                        for ( i = 1; i < numRepsDefault; i++ ) {
                            that.clone( $repeat.siblings().addBack().last(), false );
                        }
                        //now check the defaults of all the descendants of this repeat and its new siblings, level-by-level
                        $repeat.siblings( '.or-repeat' ).addBack().find( '.or-repeat' )
                            .filter( function( i ) {
                                return $( this ).parents( '.or-repeat' ).length === repLevel;
                            } ).each( function() {
                                cloneDefaultReps( $( this ) );
                            } );
                    };

                    //clone form fields to create the default number 
                    //NOTE THIS ASSUMES THE DEFAULT NUMBER IS STATIC, NOT DYNAMIC
                    $form.find( '.or-repeat' ).filter( function( i ) {
                        return $( this ).parents( '.or-repeat' ).length === 0;
                    } ).each( function() {
                        repLevel = 0;
                        cloneDefaultReps( $( this ) );
                    } );
                },
                /**
                 * clone a repeat group/node
                 * @param   {jQuery} $node node to clone
                 * @param   {boolean=} animate whether to animate the cloning
                 * @return  {boolean}       [description]
                 */
                clone: function( $node, animate ) {
                    //var p = new Profiler('repeat cloning');
                    var $siblings, $master, $clone, index, radioNames, i, path, timestamp,
                        that = this;

                    if ( $node.length !== 1 ) {
                        console.error( 'Nothing to clone' );
                        return false;
                    }
                    $siblings = $node.siblings( '.or-repeat' );
                    $master = ( $node.hasClass( 'clone' ) ) ? $siblings.not( '.clone' ).eq( 0 ) : $node;
                    $clone = $master.clone( true, true );

                    // Add clone class and remove any child clones.. (cloned repeats within repeats..)
                    $clone.addClass( 'clone' ).find( '.clone' ).remove();

                    // Mark all cloned fields as valid
                    $clone.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                        that.formO.setValid( $( this ) );
                    } );

                    // Note: in http://formhub.org/formhub_u/forms/hh_polio_survey_cloned/form.xml a parent group of a repeat
                    // has the same ref attribute as the nodeset attribute of the repeat. This would cause a problem determining 
                    // the proper index if .or-repeat was not included in the selector
                    index = $form.find( '.or-repeat[name="' + $node.attr( 'name' ) + '"]' ).index( $node );
                    // add ____x to names of radio buttons where x is the index
                    radioNames = [];

                    $clone.find( 'input[type="radio"]' ).each( function() {
                        if ( $.inArray( $( this ).attr( 'data-name' ), radioNames ) === -1 ) {
                            radioNames.push( $( this ).attr( 'data-name' ) );
                        }
                    } );

                    for ( i = 0; i < radioNames.length; i++ ) {
                        // Amazingly, this executes so fast when compiled that the timestamp in milliseconds is
                        // not sufficient guarantee of uniqueness (??)
                        timestamp = new Date().getTime().toString() + '_' + Math.floor( ( Math.random() * 10000 ) + 1 );
                        $clone.find( 'input[type="radio"][data-name="' + radioNames[ i ] + '"]' ).attr( 'name', timestamp );
                    }

                    // remove the widgets before adding clone
                    widgets.destroy( $clone );
                    // clear the inputs before adding clone
                    $clone.clearInputs( '' );
                    // insert the clone after values and widgets have been reset
                    $clone.insertAfter( $node );
                    // number the repeats
                    this.numberRepeats( $siblings.add( $node ).add( $clone ) );
                    // enable or disable + and - buttons
                    this.toggleButtons( $siblings.add( $node ).add( $clone ) );

                    // Create a new data point in <instance> by cloning the template node
                    // and clone data node if it doesn't already exist
                    path = $master.attr( 'name' );
                    if ( path.length > 0 && index >= 0 ) {
                        model.cloneTemplate( path, index );
                    }

                    // this will trigger setting default values and other stuff
                    $clone.trigger( 'addrepeat', index + 1 );

                    // Re-initiate widgets in clone after default values have been set
                    widgets.init( $clone );

                    //p.report();
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
                        //now remove the data node
                        model.node( repeatPath, repeatIndex ).remove();
                    } );
                },
                toggleButtons: function( $repeats ) {
                    $repeats = ( !$repeats || $repeats.length === 0 ) ? $form : $repeats;

                    //first switch everything off and remove hover state
                    $repeats.find( 'button.repeat, button.remove' ).prop( 'disabled', true );

                    //then enable the appropriate ones
                    $repeats.last().find( 'button.repeat' ).prop( 'disabled', false );
                    $repeats.find( 'button.remove' ).not( ':first' ).prop( 'disabled', false );
                },
                numberRepeats: function( $repeats ) {
                    $repeats.each( function() {
                        var repSiblings, qtyRepeats, i;
                        // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
                        if ( $( this ).prev( '.or-repeat' ).length === 0 ) {
                            repSiblings = $( this ).siblings( '.or-repeat' );
                            qtyRepeats = repSiblings.length + 1;
                            if ( qtyRepeats > 1 ) {
                                $( this ).find( '.repeat-number' ).text( '1' );
                                i = 2;
                                repSiblings.each( function() {
                                    $( this ).find( '.repeat-number' ).text( i );
                                    i++;
                                } );
                            } else {
                                $( this ).find( '.repeat-number' ).empty();
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
                $form.on( 'blur', 'input:not([type="text"], [type="radio"], [type="checkbox"])', function( event ) {
                    if ( typeof $( this ).prop( 'validity' ).badInput !== 'undefined' && $( this ).prop( 'validity' ).badInput ) {
                        $( this ).val( '' );
                    }
                } );

                // why is the file namespace added
                $form.on( 'change.file validate', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    var validCons, validReq,
                        n = that.input.getProps( $( this ) );

                    // why is this called? add explanation when figured out that it is necessary!
                    // event.stopImmediatePropagation();

                    // set file input values to the actual name of file (without c://fakepath or anything like that)
                    if ( n.val.length > 0 && n.inputType === 'file' && $( this )[ 0 ].files[ 0 ] && $( this )[ 0 ].files[ 0 ].size > 0 ) {
                        n.val = $( this )[ 0 ].files[ 0 ].name;
                    }

                    if ( event.type === 'validate' ) {
                        // the enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not
                        // if an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid)
                        validCons = ( n.enabled && n.inputType !== 'hidden' ) ? model.node( n.path, n.ind ).validate( n.constraint, n.xmlType ) : true;
                    } else {
                        validCons = model.node( n.path, n.ind ).setVal( n.val, n.constraint, n.xmlType );
                        // geotrace and geoshape are very complex data types that require various change events
                        // to avoid annoying users, we ignore the INVALID onchange validation result
                        validCons = ( validCons === false && ( n.xmlType === 'geotrace' || n.xmlType === 'geoshape' ) ) ? null : validCons;
                    }

                    // validate 'required', checking value in Model (not View)
                    validReq = ( n.enabled && n.inputType !== 'hidden' && n.required && model.node( n.path, n.ind ).getVal()[ 0 ].length < 1 ) ? false : true;

                    if ( validReq === false ) {
                        that.setValid( $( this ), 'constraint' );
                        if ( event.type === 'validate' ) {
                            that.setInvalid( $( this ), 'required' );
                        }
                    } else {
                        that.setValid( $( this ), 'required' );
                        if ( typeof validCons !== 'undefined' && validCons === false ) {
                            that.setInvalid( $( this ), 'constraint' );
                        } else if ( validCons !== null ) {
                            that.setValid( $( this ), 'constraint' );
                        }
                    }
                } );

                // doing this on the focus event may have little effect on performance, because nothing else is happening :)
                $form.on( 'focus fakefocus', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    // update the form progress status
                    that.progress.update( event.target );
                } );

                //using fakefocus because hidden (by widget) elements won't get focus
                $form.on( 'focus blur fakefocus fakeblur', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    var props = that.input.getProps( $( this ) ),
                        required = $( this ).attr( 'required' ),
                        $question = $( this ).closest( '.question' ),
                        $legend = $question.find( 'legend' ).eq( 0 ),
                        loudErrorShown = $question.hasClass( 'invalid-required' ) || $question.hasClass( 'invalid-constraint' ),
                        insideTable = ( $( this ).closest( '.or-appearance-list-nolabel' ).length > 0 ),
                        $reqSubtle = $question.find( '.required-subtle' ),
                        reqSubtle = $( '<span class="required-subtle" style="color: transparent;">Required</span>' );

                    if ( event.type === 'focusin' || event.type === "fakefocus" ) {
                        $question.addClass( 'focus' );
                        if ( required && $reqSubtle.length === 0 && !insideTable ) {
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
                        if ( required && props.val.length > 0 ) {
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
                var that = this,
                    $firstError;

                //can't fire custom events on disabled elements therefore we set them all as valid
                $form.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, ' +
                    'input:disabled, select:disabled, textarea:disabled' ).each( function() {
                    that.setValid( $( this ) );
                } );
                $form.find( 'input, select, textarea' ).not( '.ignore' ).trigger( 'validate' );
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
                // updates rounded % value of progress and triggers event if changed
                update: function( el ) {
                    var status,
                        $all = $form.find( '.question' ).not( '.disabled' ).filter( function() {
                            return $( this ).closest( '.disabled' ).length === 0;
                        } );
                    this.lastChanged = el || this.lastChanged;
                    status = Math.round( ( ( $all.index( $( this.lastChanged ).closest( '.question' ) ) + 1 ) * 100 ) / $all.length );

                    if ( status !== this.status ) {
                        this.status = status;
                        $form.trigger( 'progressupdate', status );
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

        return Form;
    } );
