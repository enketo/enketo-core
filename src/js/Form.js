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

define( [ 'modernizr', 'js/FormModel', 'js/widgets', 'jquery', 'js/plugins', 'js/extend', 'bootstrap' ],
    function( modernizr, FormModel, widgets, $ ) {
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
         *
         * @constructor
         */

        function Form( formSelector, dataStr, dataStrToEdit ) {
            var model, dataToEdit, form, $form, $formClone, repeatsPresent,
                loadErrors = [];

            /**
             * Function: init
             *
             * Initializes the Form instance (XML Model and HTML View).
             *
             */
            this.init = function() {
                //cloning children to keep any event handlers on 'form.or' intact upon resetting
                $formClone = $( formSelector ).clone().appendTo( '<original></original>' );

                model = new FormModel( dataStr );
                form = new FormView( formSelector );

                //var profiler = new Profiler('model.init()');
                model.init();
                //profiler.report();

                if ( typeof dataStrToEdit !== 'undefined' && dataStrToEdit && dataStrToEdit.length > 0 ) {
                    dataToEdit = new FormModel( dataStrToEdit );
                    dataToEdit.init();
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
            this.getView = function() {
                return form;
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
            this.getRecordStatus = function() {
                return form.recordStatus.get();
            };
            /**
             * @param {(boolean|string)=} markedFinal
             */
            this.setRecordStatus = function( markedFinal ) {
                return form.recordStatus.set( markedFinal );
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
            this.getName = function() {
                return $form.find( '#form-title' ).text();
            };

            //restores html form to pre-initialized state
            //does not affect data instance!
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
             * @return {boolean}
             */
            this.validateForm = function() {
                return form.validateAll();
            };
            /**
             * Returns wether form has validated as true or false. Needs to be called AFTER calling validate()!
             * @return {!boolean}
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
                //first empty all form data nodes, to clear any default values except those inside templates
                model.node( null, null, filter ).get().each( function() {
                    //something seems fishy about doing it this way instead of using node.setVal('');
                    $( this ).text( '' );
                } );

                nodesToLoad.each( function() {
                    var name = $( this ).prop( 'nodeName' );
                    path = $( this ).getXPath( 'instance' );
                    index = instanceOfFormModel.node( path ).get().index( $( this ) );
                    value = $( this ).text();

                    //input is not populated in this function, so we take index 0 to get the XML data type
                    $input = $form.find( '[name="' + path + '"]' ).eq( 0 );

                    xmlDataType = ( $input.length > 0 ) ? form.input.getXmlType( $input ) : 'string';
                    target = model.node( path, index );
                    $target = target.get();

                    //if there are multiple nodes with that name and index (actually impossible)
                    if ( $target.length > 1 ) {
                        console.error( 'Found multiple nodes with path: ' + path + ' and index: ' + index );
                    }
                    //if there is a corresponding node in the form's original instances
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
                        error = 'Did not find form node with path: ' + path + ' and index: ' + index + ' so failed to load model.';
                        console.error( error );
                        loadErrors.push( error );
                    }
                } );
                //add deprecatedID node, copy instanceID value to deprecatedID and empty deprecatedID
                instanceID = model.node( '*>meta>instanceID' );
                if ( instanceID.get().length !== 1 ) {
                    error = 'InstanceID node in default instance error (found ' + instanceID.get().length + ' instanceID nodes)';
                    console.error( error );
                    loadErrors.push( error );
                    return;
                }
                if ( model.node( '*>meta>deprecatedID' ).get().length !== 1 ) {
                    var deprecatedIDXMLNode = $.parseXML( "<deprecatedID/>" ).documentElement;
                    document.adoptNode( deprecatedIDXMLNode );
                    $( deprecatedIDXMLNode ).appendTo( model.node( '*>meta' ).get() );
                }
                model.node( '*>meta>deprecatedID' ).setVal( instanceID.getVal()[ 0 ], null, 'string' );
                instanceID.setVal( '', null, 'string' );
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
                this.branch = new this.Branch( this );
            }

            FormView.prototype.init = function() {
                var name, $required, $hint;

                if ( typeof model == 'undefined' || !( model instanceof FormModel ) ) {
                    return console.error( 'variable data needs to be defined as instance of FormModel' );
                }

                //var profiler = new Profiler('preloads.init()');
                this.preloads.init( this ); //before widgets.init (as instanceID used in offlineFilepicker widget)
                //profiler.report();

                this.grosslyViolateStandardComplianceByIgnoringCertainCalcs(); //before calcUpdate!

                //profiler = new Profiler('calcupdate');
                this.calcUpdate(); //before repeat.init as repeat count may use a calculated item
                //profiler.report();

                //profiler = new Profiler('setLangs()');
                this.langs.init(); //test: before itemsetUpdate
                //profiler.report();

                //profiler = new Profiler('repeat.init()');
                this.repeat.init( this ); //after radio button data-name setting
                //profiler.report();

                //profiler = new Profiler('itemsets initialization');
                this.itemsetUpdate();
                //profiler.report();

                //profiler = new Profiler('setting default values in form inputs');
                this.setAllVals();
                //profiler.report();

                //profiler = new Profiler('widgets initialization');
                widgets.init(); //after setAllVals()
                //profiler.report();

                //profiler = new Profiler('bootstrapify');
                this.bootstrapify();
                //profiler.report();

                //profiler = new Profiler('branch.init()');
                this.branch.init(); //after widgets.init()
                //profiler.report();

                //profiler = new Profiler('outputUpdate initial');
                this.outputUpdate();
                //profiler.report();

                this.setEventHandlers(); //after widgets init to make sure widget handlers are called before

                this.editStatus.set( false );
                //profiler.report('time taken across all functions to evaluate '+xpathEvalNum+' XPath expressions: '+xpathEvalTime);
            };

            //this may not be the most efficient. Could also be implemented like model.Nodeset;
            //also use for fieldset nodes (to evaluate branch logic) and also used to get and set form data of the app settings
            FormView.prototype.input = {
                //multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
                getWrapNodes: function( $inputNodes ) {
                    var type = this.getInputType( $inputNodes.eq( 0 ) );
                    return ( type == 'radio' || type == 'checkbox' ) ? $inputNodes.closest( '.restoring-sanity-to-legends' ) :
                        ( type == 'fieldset' ) ? $inputNodes : $inputNodes.parent( 'label' );
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
                        } else return console.error( '<input> node has no type' );
                    } else if ( nodeName == 'select' ) {
                        return 'select';
                    } else if ( nodeName == 'textarea' ) {
                        return 'textarea';
                    } else if ( nodeName == 'fieldset' ) {
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
                    /*
                    if (this.getInputType($node) == 'radio'){
                    //indexSuffix = $node.attr('name').lastIndexOf('____');
                    //if (indexSuffix > 0){
                    return $node.attr('data-name');//.substr(0, indexSuffix);
                    //}
                    }
                    if ($node.attr('name') && $node.attr('name').length > 0){
                    return $node.attr('name');
                    }
                    else return console.error('input node has no name');*/
                },
                //the index that can be used to find the node in $data
                //NOTE: this function should be used sparingly, as it is CPU intensive!
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
                    //fieldset.or-group wraps fieldset.or-repeat and can have same name attribute!)
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
                    return !( $node.prop( 'disabled' ) || $node.parents( 'fieldset:disabled' ).length > 0 );
                },
                getVal: function( $node ) {
                    var inputType, values = [],
                        name;
                    if ( $node.length !== 1 ) {
                        return console.error( 'getVal(): no inputNode provided or multiple' );
                    }
                    inputType = this.getInputType( $node );
                    name = this.getName( $node );

                    if ( inputType == 'radio' ) {
                        return this.getWrapNodes( $node ).find( 'input:checked' ).val() || '';
                    }
                    //checkbox values bug in jQuery as (node.val() should work)
                    if ( inputType == 'checkbox' ) {
                        this.getWrapNodes( $node ).find( 'input[name="' + name + '"]:checked' ).each( function() {
                            values.push( $( this ).val() );
                        } );
                        return values;
                    }
                    return ( !$node.val() ) ? '' : ( $.isArray( $node.val() ) ) ? $node.val().join( ' ' ).trim() : $node.val().trim();
                },
                setVal: function( name, index, value ) {
                    var $inputNodes, type, date, $target; //, 
                    //values = value.split(' ');
                    index = index || 0;

                    if ( this.getInputType( $form.find( '[data-name="' + name + '"]' ).eq( 0 ) ) == 'radio' ) {
                        $target = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) ).eq( index ).find( 'input[value="' + value + '"]' );
                        //why not use this.getIndex?
                        $target.prop( 'checked', true );
                        return;
                    } else {
                        //why not use this.getIndex?
                        $inputNodes = this.getWrapNodes( $form.find( '[name="' + name + '"]' ) ).eq( index ).find( 'input, select, textarea' );

                        type = this.getInputType( $inputNodes.eq( 0 ) );

                        if ( type === 'file' ) {
                            $inputNodes.eq( 0 ).attr( 'data-loaded-file-name', value );
                            //console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
                            //  'this record for editing this file input field will remain unchanged.');
                            return false;
                        }

                        if ( type === 'date' || type === 'datetime' ) {
                            //convert current value (loaded from instance) to a value that a native datepicker understands
                            //TODO test for IE, FF, Safari when those browsers start including native datepickers
                            value = model.node().convert( value, type );
                        }
                    }

                    if ( this.isMultiple( $inputNodes.eq( 0 ) ) === true ) {
                        value = value.split( ' ' );
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
            FormView.prototype.setAllVals = function() {
                var index, name, value,
                    that = this;
                model.node( null, null, {
                    noEmpty: true
                } ).get().each( function() {
                    try {
                        value = $( this ).text();
                        name = $( this ).getXPath( 'instance' );
                        index = model.node( name ).get().index( $( this ) );
                        that.input.setVal( name, index, value );
                    } catch ( e ) {
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

                    $( '#form-languages' ).detach().appendTo( $langSelector ); //insertBefore($('form.jr').parent());

                    if ( !defaultLang || defaultLang === '' ) {
                        defaultLang = $( '#form-languages option:eq(0)' ).attr( 'value' );
                    }
                    $( '#form-languages' ).val( defaultLang );

                    if ( $( '#form-languages option' ).length < 2 ) {
                        $langSelector.addClass( 'hide' );
                        return;
                    }
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

                    $form.find( '[lang]' ).removeClass( 'active' ).filter( '[lang="' + lang + '"], [lang=""]' ).addClass( 'active' );

                    $form.find( 'select' ).each( function() {
                        that.setSelect( $( this ) );
                    } );
                    //quickfix for labels and legends that do not contain a span.active without other class
                    $form.find( 'legend span.active:not(.or-hint, .or-constraint-msg), label span.active:not(.or-hint, .or-constraint-msg)' ).each( function() {
                        if ( $( this ).text().trim().length === 0 ) {
                            $( this ).text( '[MISSING TRANSLATION]' );
                        }
                    } );

                    $form.trigger( 'changelanguage' );
                },
                //swap language of <select> <option>s
                setSelect: function( $select ) {
                    var value, /** @type {string} */ curLabel, /** @type {string} */ newLabel;
                    $select.children( 'option' ).not( '[value=""]' ).each( function() {
                        curLabel = /** @type {string} */ $( this ).text();
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
                    $form.attr( 'data-edited', Boolean( status ) ); //.toString());
                    $form.trigger( 'edit', status );
                },
                get: function() {
                    return ( $form.attr( 'data-edited' ) === 'true' ) ? true : false;
                }
            };

            FormView.prototype.recordName = {
                set: function( key ) {
                    $form.attr( 'data-stored-with-key', key );
                    //$('#record-name').text(key);
                    $form.find( 'h2 span' ).text( key );
                },
                get: function() {
                    return $form.attr( 'data-stored-with-key' ) || null;
                },
                reset: function() {
                    $form.removeAttr( 'data-stored-with-key' );
                }
            };

            FormView.prototype.recordStatus = {
                set: function( markedFinal ) {
                    $form.attr( 'data-stored-final', markedFinal.toString() );
                },
                get: function() {
                    return ( $form.attr( 'data-stored-final' ) === 'true' ) ? true : false;
                },
                reset: function() {
                    $form.removeAttr( 'data-stored-final' );
                }
            };

            /**
             * Branch Class (inherits properties of FormView Class) is used to manage skip logic
             *
             * @constructor
             */
            FormView.prototype.Branch = function( parent ) {
                /**
                 * Initializes branches, sets delegated event handlers
                 */
                this.init = function() {
                    this.update();
                };
                /**
                 * Updates branches based on changed input fields
                 *
                 * @param  {string=} changedNodeNames [description]
                 * @return {?boolean}                  [description]
                 */
                this.update = function( changedNodeNames ) {
                    var i, p, $branchNode, result, namesArr, cleverSelector, insideRepeat, insideRepeatClone, cacheIndex,
                        relevantCache = {},
                        alreadyCovered = [],
                        that = this,
                        evaluations = 0,
                        clonedRepeatsPresent;

                    //var profiler = new Profiler('branch update');
                    namesArr = ( typeof changedNodeNames !== 'undefined' ) ? changedNodeNames.split( ',' ) : [];
                    cleverSelector = ( namesArr.length > 0 ) ? [] : [ '[data-relevant]' ];

                    for ( i = 0; i < namesArr.length; i++ ) {
                        cleverSelector.push( '[data-relevant*="' + namesArr[ i ] + '"]' );
                    }

                    clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                    $form.find( cleverSelector.join() ).each( function() {
                        //note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
                        if ( $.inArray( $( this ).attr( 'name' ), alreadyCovered ) !== -1 ) {
                            return;
                        }
                        p = {};
                        cacheIndex = null;

                        p.relevant = $( this ).attr( 'data-relevant' );
                        p.path = parent.input.getName( $( this ) );

                        //p = parent.input.getProps($(this));
                        //$branchNode = parent.input.getWrapNodes($(this));
                        $branchNode = $( this ).closest( '.or-branch' );

                        if ( $branchNode.length !== 1 ) {
                            if ( $( this ).parents( '#or-calculated-items' ).length === 0 ) {
                                console.error( 'could not find branch node for ', $( this ) );
                            }
                            return;
                        }
                        /* 
                        Determining ancestry is expensive. Using the knowledge most forms don't use repeats and 
                        if they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
                        The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
                        (6-7 seconds of loading time on the bench6 form)
                        */
                        insideRepeat = ( clonedRepeatsPresent && $branchNode.closest( '.or-repeat' ).length > 0 ) ? true : false;
                        insideRepeatClone = ( clonedRepeatsPresent && $branchNode.closest( '.or-repeat.clone' ).length > 0 ) ? true : false;
                        /*
                        Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
                        It can be safely set to 0 for other branches.
                        */
                        p.ind = ( insideRepeatClone ) ? parent.input.getIndex( $( this ) ) : 0;
                        /*
                        Caching is only possible for expressions that do not contain relative paths to nodes.
                        So, first do a *very* aggresive check to see if the expression contains a relative path. 
                        This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
                        expression, which may prove to be incorrect.
                        */
                        if ( p.relevant.indexOf( '..' ) === -1 ) {
                            /*
                            For now, let's just not cache relevants inside a repeat. 
                            */
                            //if ($branchNode.parents('.or-repeat').length === 0){
                            if ( !insideRepeat ) {
                                cacheIndex = p.relevant;
                            } else {
                                //cacheIndex = p.relevant+'__'+p.path+'__'+p.ind;
                            }
                        }
                        if ( cacheIndex && typeof relevantCache[ cacheIndex ] !== 'undefined' ) {
                            result = relevantCache[ cacheIndex ];
                        } else {
                            result = that.evaluate( p.relevant, p.path, p.ind );
                            evaluations++;
                            relevantCache[ cacheIndex ] = result;
                        }

                        if ( !insideRepeat ) {
                            alreadyCovered.push( $( this ).attr( 'name' ) );
                        }

                        that.process( $branchNode, result );
                    } );
                    //profiler.report();
                    return true;
                };
                /**
                 * evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
                 * @param  {string} expr        [description]
                 * @param  {string} contextPath [description]
                 * @param  {number} index       [description]
                 * @return {boolean}             [description]
                 */
                this.evaluate = function( expr, contextPath, index ) {
                    var result = model.evaluate( expr, 'boolean', contextPath, index );
                    return result;
                };
                /**
                 * Processes the evaluation result for a branch
                 * @param  {jQuery} $branchNode [description]
                 * @param  {boolean} result      [description]
                 */
                this.process = function( $branchNode, result ) {
                    //for mysterious reasons '===' operator fails after Advanced Compilation even though result has value true 
                    //and type boolean
                    if ( result === true ) {
                        this.enable( $branchNode );
                    } else {
                        this.disable( $branchNode );
                    }
                };
                /**
                 * whether branch currently has 'relevant' state
                 * @param  {jQuery} $branchNode [description]
                 * @return {boolean}             [description]
                 */
                this.selfRelevant = function( $branchNode ) {
                    return !$branchNode.hasClass( 'disabled' ) && !$branchNode.hasClass( 'pre-init' );
                };
                /**
                 * whether branch currently only has 'relevant' ancestors
                 * @param  {jQuery} $branchNode [description]
                 * @return {boolean}             [description]
                 */
                this.ancestorRelevant = function( $branchNode ) {
                    return ( $branchNode.parents( '.disabled' ).length === 0 );
                };
                /**
                 * Enables and reveals a branch node/group
                 *
                 * @param  {jQuery} $branchNode The jQuery object to reveal and enable
                 */
                this.enable = function( $branchNode ) {
                    var type,
                        that = this;
                    if ( !this.selfRelevant( $branchNode ) ) {
                        //console.debug( 'enabling branch with name: ' + $branchNode.attr( 'name' ) );

                        $branchNode.removeClass( 'disabled pre-init' ).show( 250, function() {
                            //to recalculate table column widths
                            //if ( that.ancestorRelevant( $branchNode ) ) {
                            //  parent.widgets.tableWidget( $branchNode );
                            //}
                            widgets.enable( $branchNode );
                        } );

                        type = $branchNode.prop( 'nodeName' ).toLowerCase();

                        if ( type == 'label' ) {
                            $branchNode.children( 'input:not(.force-disabled), select, textarea' ).prop( 'disabled', false );
                        } else {
                            $branchNode.prop( 'disabled', false );
                            /*
                            A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503 
                            where the file inputs end up in a weird partially enabled state. 
                            Refresh the state by disabling and enabling the file inputs again.
                            */
                            $branchNode.find( '*:not(.or-branch) input[type="file"]:not(.force-disabled, [data-relevant])' )
                                .prop( 'disabled', true ).prop( 'disabled', false );
                        }
                    }
                };
                /**
                 * Disables and hides a branch node/group
                 *
                 * @param  {jQuery} $branchNode The jQuery object to hide and disable
                 */
                this.disable = function( $branchNode ) {
                    var type = $branchNode.prop( 'nodeName' ).toLowerCase(),
                        virgin = $branchNode.hasClass( 'pre-init' );
                    if ( this.selfRelevant( $branchNode ) || virgin ) {
                        $branchNode.addClass( 'disabled' ); //;

                        //if ( typeof settings !== 'undefined' && typeof settings.showBranch !== 'undefined' && !settings.showBranch ) {
                        console.log( 'hiding branch', $branchNode );
                        $branchNode.hide( 250 );
                        //}

                        //if the branch was previously enabled
                        if ( !virgin ) {
                            $branchNode.clearInputs( 'change' );
                            widgets.disable( $branchNode );
                            //all remaining fields marked as invalid can now be marked as valid
                            $branchNode.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                                parent.setValid( $( this ) );
                            } );
                        } else {
                            $branchNode.removeClass( 'pre-init' );
                        }

                        if ( type == 'label' ) {
                            $branchNode.children( 'input, select, textarea' ).prop( 'disabled', true );
                        } else {
                            $branchNode.prop( 'disabled', true );
                        }
                    }
                };
            };

            //$.extend(FormView.prototype.Branch.prototype, FormView.prototype);


            /**
             * Updates itemsets
             * @param  {string=} changedDataNodeNames node names that were recently changed, separated by commas
             */
            FormView.prototype.itemsetUpdate = function( changedDataNodeNames ) {
                //TODO: test with very large itemset
                var clonedRepeatsPresent, insideRepeat, insideRepeatClone,
                    that = this,
                    cleverSelector = [],
                    needToUpdateLangs = false,
                    itemsCache = {};

                if ( typeof changedDataNodeNames == 'undefined' ) {
                    cleverSelector = [ '.itemset-template' ];
                } else {
                    $.each( changedDataNodeNames.split( ',' ), function( index, value ) {
                        cleverSelector.push( '.itemset-template[data-items-path*="' + value + '"]' );
                    } );
                }

                cleverSelector = cleverSelector.join( ',' );
                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $form.find( cleverSelector ).each( function() {
                    var $htmlItem, $htmlItemLabels, value, $instanceItems, index, context,
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
                    Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
                    It can be safely set to 0 for other branches.
                    */
                    insideRepeat = ( clonedRepeatsPresent && $input.closest( '.or-repeat' ).length > 0 ) ? true : false;
                    insideRepeatClone = ( clonedRepeatsPresent && $input.closest( '.or-repeat.clone' ).length > 0 ) ? true : false;

                    index = ( insideRepeatClone ) ? that.input.getIndex( $input ) : 0;

                    console.log( 'inside clone?', insideRepeatClone );

                    if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                        $instanceItems = itemsCache[ itemsXpath ];
                    } else {
                        $instanceItems = model.evaluate( itemsXpath, 'nodes', context, index );
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

                    //clear data values through inputs. Note: if a value exists, 
                    //this will trigger a dataupdate event which may call this update function again
                    $( this ).closest( 'label > select, fieldset > label' ).parent()
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

                        value = /**@type {string}*/ $( this ).children( valueRef ).text();
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
             * @param  {string=} changedNodeNames Comma-separated node names that may have changed
             */
            FormView.prototype.outputUpdate = function( changedNodeNames ) {
                var i, expr, namesArr, cleverSelector, clonedRepeatsPresent, insideRepeat, insideRepeatClone, $context, context, index,
                    outputChanged = false,
                    outputCache = {},
                    val = '',
                    that = this;

                namesArr = ( typeof changedNodeNames !== 'undefined' ) ? changedNodeNames.split( ',' ) : [];
                cleverSelector = ( namesArr.length > 0 ) ? [] : [ '.or-output[data-value]' ];
                for ( i = 0; i < namesArr.length; i++ ) {
                    cleverSelector.push( '.or-output[data-value*="' + namesArr[ i ] + '"]' );
                }
                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $form.find( ':not(:disabled) span.active' ).find( cleverSelector.join() ).each( function() {
                    expr = $( this ).attr( 'data-value' );
                    //context = that.input.getName($(this).closest('fieldset'));

                    /*
                    Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
                    should look at the HTML input to determine the context. 
                    So, context is either the input name attribute (if output is inside input label),
                    or the parent with a name attribute
                    or the whole doc
                    */
                    $context = ( $( this ).parent( 'span' ).parent( 'label' ).find( '[name]' ).eq( 0 ).length === 1 ) ?
                        $( this ).parent().parent().find( '[name]:eq(0)' ) :
                        $( this ).parent( 'span' ).parent( 'legend' ).parent( 'fieldset' ).find( '[name]' ).eq( 0 ).length === 1 ?
                        $( this ).parent().parent().parent().find( '[name]:eq(0)' ) : $( this ).closest( '[name]' );
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
                        outputChanged = true;
                    }
                } );

                //hints may have changed too
                if ( outputChanged ) {
                    //this.setHints( {
                    //    outputsOnly: true
                    //} );
                }
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
                    console.log( "Found meta/instanceID with binding that has a calculate attribute and removed this calculation. It ain't right!" );
                    $culprit.removeAttr( 'data-calculate' );
                }
            };

            /**
             * Updates calculated items
             * @param {string=} changedNodeNames - [type/description]
             */
            FormView.prototype.calcUpdate = function( changedNodeNames ) {
                var i, index, name, expr, dataType, relevant, relevantExpr, result, constraint, namesArr, valid, cleverSelector, $dataNodes;

                namesArr = ( typeof changedNodeNames !== 'undefined' ) ? changedNodeNames.split( ',' ) : [];
                cleverSelector = ( namesArr.length > 0 ) ? [] : [ 'input[data-calculate]' ];
                for ( i = 0; i < namesArr.length; i++ ) {
                    cleverSelector.push( 'input[data-calculate*="' + namesArr[ i ] + '"], input[data-relevant*="' + namesArr[ i ] + '"]' );
                }

                $form.find( '#or-calculated-items' ).find( cleverSelector.join() ).each( function() {
                    name = $( this ).attr( 'name' );
                    expr = $( this ).attr( 'data-calculate' );
                    dataType = $( this ).attr( 'data-type-xml' );
                    constraint = $( this ).attr( 'data-constraint' ); //obsolete?
                    relevantExpr = $( this ).attr( 'data-relevant' );
                    relevant = ( relevantExpr ) ? model.evaluate( relevantExpr, 'boolean', name ) : true;
                    $dataNodes = model.node( name ).get();
                    $dataNodes.each( function( index ) {
                        //not sure if using 'string' is always correct
                        result = ( relevant ) ? model.evaluate( expr, 'string', name, index ) : '';
                        valid = model.node( name, index ).setVal( result, constraint, dataType );
                    } );

                } );
            };

            FormView.prototype.bootstrapify = function() {
                //if no constraintmessage use a default
                //TODO: move to XSLT
                $form.addClass( 'clearfix' )
                    .find( 'label, legend' ).each( function() {
                        var $label = $( this );
                        if ( $label.siblings( 'legend' ).length === 0 &&
                            $label.parent( '#or-calculated-items, #or-preload-items' ).length === 0 &&
                            $label.find( '.or-constraint-msg' ).length === 0 &&
                            ( $label.prop( 'nodeName' ).toLowerCase() == 'legend' ||
                                $label.children( 'input.ignore' ).length !== $label.children( 'input' ).length ||
                                $label.children( 'select.ignore' ).length !== $label.children( 'select' ).length ||
                                $label.children( 'textarea.ignore' ).length !== $label.children( 'textarea' ).length ) ) {
                            $label.prepend( '<span class="or-constraint-msg active" lang="">Value not allowed</span>' );
                        }
                    } );
                //TODO: move to XSLT
                $form.find( '.trigger' ).addClass( 'alert alert-block' );

                //move constraint message to bottom of question and add message for required (could also be done in XSLT)
                //TODO: move to XSLT
                $form.find( '.or-constraint-msg' ).parent().each( function() {
                    var $msg = $( this ).find( '.or-constraint-msg' ).detach(),
                        $wrapper = $( this ).closest( 'label, fieldset' );
                    $wrapper.append( $msg );
                    $msg.after( '<span class="or-required-msg active" lang="">This field is required</span>' );
                } );

            };

            /*
             * Note that preloaders may be deprecated in the future and be handled as metadata without bindings at all, in which
             * case all this stuff should perhaps move to FormModel
             */
            //functions are designed to fail silently if unknown preloaders are called
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
                            console.error( 'Preload "' + item + '"" not supported. May or may not be a big deal.' );
                        }
                    } );
                    //in addition the presence of certain meta data in the instance may automatically trigger a preload function
                    //even if the binding is not present. Note, that this actually does not deal with HTML elements at all.
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
                    // of = 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
                    // return '' except for deviceid?
                    if ( o.curVal.length === 0 ) {
                        return 'no device properties in enketo';
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
                    $form.find( 'fieldset.or-repeat' ).prepend( '<span class="repeat-number"></span>' );
                    $form.find( 'fieldset.or-repeat:not([data-repeat-fixed])' )
                        .append( '<button type="button" class="btn repeat"><i class="icon-plus"></i></button>' +
                            '<button type="button" disabled class="btn remove"><i class="icon-minus"></i></button>' );

                    //delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
                    $form.on( 'click', 'button.repeat:enabled', function() {
                        //create a clone
                        that.clone( $( this ).parent( 'fieldset.or-repeat' ) );
                        //prevent default
                        return false;
                    } );
                    $form.on( 'click', 'button.remove:enabled', function() {
                        //remove clone
                        that.remove( $( this ).parent( 'fieldset.or-repeat.clone' ) );
                        //prevent default
                        return false;
                    } );

                    cloneDefaultReps = function( $repeat ) {
                        repLevel++;
                        repCountPath = $repeat.attr( 'data-repeat-count' ) || "";
                        numRepsInCount = ( repCountPath.length > 0 ) ? parseInt( model.node( repCountPath ).getVal()[ 0 ], 10 ) : 0;
                        //console.debug('number of reps in count attribute: ' +numRepsInCount);
                        index = $form.find( '.or-repeat[name="' + $repeat.attr( 'name' ) + '"]' ).index( $repeat );
                        $dataRepeat = model.node( $repeat.attr( 'name' ), index ).get();
                        numRepsInInstance = $dataRepeat.siblings( $dataRepeat.prop( 'nodeName' ) + ':not([template])' ).addBack().length;
                        numRepsDefault = ( numRepsInCount > numRepsInInstance ) ? numRepsInCount : numRepsInInstance;
                        //console.debug('default number of repeats for '+$repeat.attr('name')+' is '+numRepsDefault);
                        //first rep is already included (by XSLT transformation)
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
                    var $master, $clone, $parent, index, radioNames, i, path, timestamp, duration,
                        that = this;
                    duration = ( animate === false ) ? 0 : 400;
                    if ( $node.length !== 1 ) {
                        console.error( 'Nothing to clone' );
                        return false;
                    }
                    $parent = $node.parent( 'fieldset.or-group' );
                    $master = $parent.children( 'fieldset.or-repeat:not(.clone)' ).eq( 0 );
                    $clone = $master.clone( true, true );

                    //add clone class and remove any child clones.. (cloned repeats within repeats..)
                    $clone.addClass( 'clone' ).find( '.clone' ).remove();

                    //mark all cloned fields as valid
                    $clone.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                        that.formO.setValid( $( this ) );
                    } );

                    $clone.insertAfter( $node )
                        .parent( '.or-group' ).numberRepeats();

                    //if not done asynchronously, this code causes a "style undefined" exception in Jasmine unit tests with jQuery 1.9 and 2.0
                    //but this breaks loading of default values inside repeats
                    //this is caused by show() not being able to find the 'property "style" of undefined'
                    //setTimeout(function(){
                    $clone.clearInputs( '' ); //.show(duration, function(){
                    //re-initiate widgets in clone
                    widgets.destroy( $clone );
                    widgets.init( $clone );
                    //});
                    //}, 0);

                    //note: in http://formhub.org/formhub_u/forms/hh_polio_survey_cloned/form.xml a parent group of a repeat
                    //has the same ref attribute as the nodeset attribute of the repeat. This would cause a problem determining 
                    //the proper index if .or-repeat was not included in the selector
                    index = $form.find( 'fieldset.or-repeat[name="' + $node.attr( 'name' ) + '"]' ).index( $node );
                    //parentIndex = $form.find('[name="'+$master.attr('name')+'"]').parent().index($parent);
                    //add ____x to names of radio buttons where x is the index
                    radioNames = [];

                    $clone.find( 'input[type="radio"]' ).each( function() {
                        if ( $.inArray( $( this ).attr( 'data-name' ), radioNames ) === -1 ) {
                            radioNames.push( $( this ).attr( 'data-name' ) );
                        }
                    } );

                    for ( i = 0; i < radioNames.length; i++ ) {
                        //amazingly, this executes so fast when compiled that the timestamp in milliseconds is
                        //not sufficient guarantee of uniqueness (??)
                        timestamp = new Date().getTime().toString() + '_' + Math.floor( ( Math.random() * 10000 ) + 1 );
                        $clone.find( 'input[type="radio"][data-name="' + radioNames[ i ] + '"]' ).attr( 'name', timestamp );
                    }

                    this.toggleButtons( $master.parent() );

                    //create a new data point in <instance> by cloning the template node
                    path = $master.attr( 'name' );

                    //0-based index of node in a jquery resultset when using a selector with that name attribute
                    /*
                     * clone data node if it doesn't already exist
                     */
                    if ( path.length > 0 && index >= 0 ) {
                        model.cloneTemplate( path, index );
                    }

                    $form.trigger( 'changerepeat' );
                    //p.report();
                    return true;
                },
                remove: function( node ) {
                    var delay = 600, // dataNode,
                        that = this,
                        repeatPath = node.attr( 'name' ),
                        repeatIndex = $form.find( 'fieldset.or-repeat[name="' + repeatPath + '"]' ).index( node ),
                        parentGroup = node.parent( 'fieldset.or-group' );

                    node.hide( delay, function() {
                        node.remove();
                        parentGroup.numberRepeats();
                        that.toggleButtons( parentGroup );
                        $form.trigger( 'changerepeat' );
                        //now remove the data node
                        model.node( repeatPath, repeatIndex ).remove();
                    } );
                },
                toggleButtons: function( $node ) {
                    $node = ( typeof $node == 'undefined' || $node.length === 0 || !$node ) ? $node = $form : $node;

                    //first switch everything off and remove hover state
                    $node.find( 'button.repeat, button.remove' ).prop( 'disabled', true ); //button('disable').removeClass('ui-state-hover');

                    //then enable the appropriate ones
                    $node.find( 'fieldset.or-repeat:last-child > button.repeat' ).prop( 'disabled', false ); //.button('enable');
                    $node.find( 'button.remove:not(:eq(0))' ).prop( 'disabled', false );
                }
            };

            FormView.prototype.setEventHandlers = function() {
                var that = this;

                //first prevent default submission, e.g. when text field is filled in and Enter key is pressed
                $form.attr( 'onsubmit', 'return false;' );

                /* 
                workaround for Chrome to clear invalid values right away 
                issue: https://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&groupby=&sort=&id=178437)
                a workaround was chosen instead of replacing the change event listener to a blur event listener
                because I'm guessing that Google will bring back the old behaviour.
                */
                $form.on( 'blur', 'input:not([type="text"], [type="radio"], [type="checkbox"])', function( event ) {
                    if ( typeof $( this ).prop( 'validity' ).badInput !== 'undefined' && $( this ).prop( 'validity' ).badInput ) {
                        $( this ).val( '' );
                    }
                } );

                $form.on( 'change.file validate', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    var validCons, validReq,
                        n = that.input.getProps( $( this ) );

                    event.stopImmediatePropagation();

                    //set file input values to the actual name of file (without c://fakepath or anything like that)
                    if ( n.val.length > 0 && n.inputType === 'file' && $( this )[ 0 ].files[ 0 ] && $( this )[ 0 ].files[ 0 ].size > 0 ) {
                        n.val = $( this )[ 0 ].files[ 0 ].name;
                    }

                    if ( event.type === 'validate' ) {
                        //the enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not
                        //if an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid)
                        validCons = ( n.enabled && n.inputType !== 'hidden' ) ? model.node( n.path, n.ind ).validate( n.constraint, n.xmlType ) : true;
                    } else {
                        validCons = model.node( n.path, n.ind ).setVal( n.val, n.constraint, n.xmlType );
                    }

                    //validate 'required'
                    validReq = ( n.enabled && n.inputType !== 'hidden' && n.required && n.val.length < 1 ) ? false : true;

                    if ( validReq === false ) {
                        that.setValid( $( this ), 'constraint' );
                        if ( event.type === 'validate' ) {
                            //console.error('setting node '+n.path+' to invalid-required', n);
                            that.setInvalid( $( this ), 'required' );
                        }
                    } else {
                        that.setValid( $( this ), 'required' );
                        if ( typeof validCons !== 'undefined' && validCons === false ) {
                            //console.error('setting node '+n.path+' to invalid-constraint', n);
                            that.setInvalid( $( this ), 'constraint' );
                        } else if ( validCons !== null ) {
                            that.setValid( $( this ), 'constraint' );
                        }
                    }
                } );

                $form.on( 'focus blur', '[required]', function( event ) {
                    var props = that.input.getProps( $( this ) ),
                        loudErrorShown = ( $( this ).parents( '.invalid-required, .invalid-constraint' ).length > 0 ),
                        insideTable = ( $( this ).parents( '.or-appearance-list-nolabel' ).length > 0 ),
                        $reqSubtle = $( this ).next( '.required-subtle' ),
                        reqSubtle = $( '<span class="required-subtle focus" style="color: transparent;">Required</span>' );

                    if ( event.type === 'focusin' ) {
                        if ( $reqSubtle.length === 0 && !insideTable ) {
                            $reqSubtle = $( reqSubtle );
                            $reqSubtle.insertAfter( this );
                            if ( !loudErrorShown ) {
                                $reqSubtle.show( function() {
                                    $( this ).removeAttr( 'style' );
                                } );
                            }
                        } else if ( !loudErrorShown ) {
                            $reqSubtle.addClass( 'focus' );
                        }
                    } else if ( event.type === 'focusout' ) {
                        if ( props.val.length > 0 ) {
                            $reqSubtle.remove();
                        } else {
                            $reqSubtle.removeClass( 'focus' );
                            if ( !loudErrorShown ) {
                                $reqSubtle.removeAttr( 'style' );
                            }
                        }
                    }
                } );

                //nodeNames is comma-separated list as a string
                model.$.on( 'dataupdate', function( event, nodeNames ) {
                    that.calcUpdate( nodeNames ); //EACH CALCUPDATE THAT CHANGES A VALUE TRIGGERS ANOTHER CALCUPDATE => INEFFICIENT
                    that.branch.update( nodeNames );
                    that.outputUpdate( nodeNames );
                    that.itemsetUpdate( nodeNames );
                    //it is possible that a changed data value validates question that were previously invalidated
                    //that.validateInvalids();
                } );

                //edit is fired when the form changes due to user input or repeats added/removed
                //branch update doesn't require detection as it always happens as a result of an event that triggers change or changerepeat.
                $form.on( 'change changerepeat', function( event ) {
                    that.editStatus.set( true );
                } );

                $form.on( 'changerepeat', function( event ) {
                    //set defaults of added repeats, setAllVals does not trigger change event
                    //TODO: only do this for the repeat that trigger it
                    that.setAllVals();
                    //the cloned fields may have been marked as invalid, so after setting thee default values, validate the invalid ones
                    //that.validateInvalids();
                } );

                //$form.on('beforesave', function( event ) {
                //  that.validateAll();
                //});

                $form.on( 'changelanguage', function() {
                    that.outputUpdate();
                    //that.setHints( );
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
                $form.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, input:disabled, select:disabled, textarea:disabled' ).each( function() {
                    that.setValid( $( this ) );
                } );
                $form.find( 'input, select, textarea' ).not( '.ignore' ).trigger( 'validate' );
                $firstError = $form.find( '.invalid-required, .invalid-constraint' ).eq( 0 );
                if ( $firstError.length > 0 && window.scrollTo ) {
                    window.scrollTo( 0, $firstError.offset().top - 50 );
                }
                return $firstError.length > 0;
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
