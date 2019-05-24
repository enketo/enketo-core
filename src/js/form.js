import { FormModel } from './form-model';
import $ from 'jquery';
import { toArray, parseFunctionFromExpression, stripQuotes, getFilename } from './utils';
import { t } from 'enketo/translator';
import config from 'enketo/config';
import inputHelper from './input';
import repeatModule from './repeat';
import pageModule from './page';
import relevantModule from './relevant';
import itemsetModule from './itemset';
import progressModule from './progress';
import widgetModule from './widgets-controller';
import languageModule from './language';
import preloadModule from './preload';
import outputModule from './output';
import calculationModule from './calculate';
import requiredModule from './required';
import maskModule from './mask';
import readonlyModule from './readonly';
import FormLogicError from './form-logic-error';
import events from './event';
import './plugins';
import './extend';

/**
 * Class: Form
 *
 * Most methods are prototype method to facilitate customizations outside of enketo-core.
 *
 * @param {string} formSelector  jquery selector for the form
 * @param {{modelStr: string, ?instanceStr: string, ?submitted: boolean, ?external: <{id: string, xmlStr: string }> }} data data object containing XML model, (partial) XML instance-to-load, external data and flag about whether instance-to-load has already been submitted before.
 * @param { {?webMapId: string}} options form options
 * 
 * @constructor
 */

function Form( formSelector, data, options ) {
    const $form = $( formSelector );

    this.$nonRepeats = {};
    this.$all = {};
    this.options = typeof options !== 'object' ? {} : options;
    if ( typeof this.options.clearIrrelevantImmediately === 'undefined' ) {
        this.options.clearIrrelevantImmediately = true;
    }
    this.view = {
        $: $form,
        html: $form[ 0 ],
        $clone: $form.clone()
    };
    this.model = new FormModel( data );
    this.repeatsPresent = !!this.view.html.querySelector( '.or-repeat' );
    this.widgetsInitialized = false;
    this.pageNavigationBlocked = false;
    this.initialized = false;
}

/**
 * Getter and setter functions
 * @type {Object}
 */
Form.prototype = {
    evaluationCascadeAdditions: [],
    get evaluationCascade() {
        return [
            this.calc.update.bind( this.calc ),
            this.repeats.countUpdate.bind( this.repeats ),
            this.relevant.update.bind( this.relevant ),
            this.output.update.bind( this.output ),
            this.itemset.update.bind( this.itemset ),
            this.required.update.bind( this.required ),
            this.readonly.update.bind( this.readonly ),
            this.validationUpdate
        ].concat( this.evaluationCascadeAdditions );
    },
    get recordName() {
        return this.view.$.attr( 'name' );
    },
    set recordName( name ) {
        this.view.$.attr( 'name', name );
    },
    get editStatus() {
        return this.view.html.dataset.edited === 'true';
    },
    set editStatus( status ) {
        // only trigger edit event once
        if ( status && status !== this.editStatus ) {
            this.view.html.dispatchEvent( events.Edited() );
        }
        this.view.html.dataset.edited = status;
    },
    get surveyName() {
        return this.view.$.find( '#form-title' ).text();
    },
    get instanceID() {
        return this.model.instanceID;
    },
    get deprecatedID() {
        return this.model.deprecatedID;
    },
    get instanceName() {
        return this.model.instanceName;
    },
    get version() {
        return this.model.version;
    },
    get encryptionKey() {
        return this.view.$.data( 'base64rsapublickey' );
    },
    get action() {
        return this.view.$.attr( 'action' );
    },
    get method() {
        return this.view.$.attr( 'method' );
    },
    get id() {
        return this.view.html.id;
    }
};

/**
 * Returns a module and adds the form property to it.
 */
Form.prototype.addModule = function( module ) {
    return Object.create( module, {
        form: {
            value: this
        }
    } );
};

/**
 * Function: init
 *
 * Initializes the Form instance (XML Model and HTML View).
 *
 */
Form.prototype.init = function() {
    let loadErrors = [];
    const that = this;

    loadErrors = loadErrors.concat( this.model.init() );

    if ( typeof this.model === 'undefined' || !( this.model instanceof FormModel ) ) {
        loadErrors.push( 'Form could not be initialized without a model.' );
        return loadErrors;
    }

    // Before initializing form view, passthrough some model events externally
    this.model.events.addEventListener( 'dataupdate', event => {
        that.view.html.dispatchEvent( events.DataUpdate( event.detail ) );
    } );
    this.model.events.addEventListener( 'removed', event => {
        that.view.html.dispatchEvent( events.Removed( event.detail ) );
    } );

    this.pages = this.addModule( pageModule );
    this.langs = this.addModule( languageModule );
    this.progress = this.addModule( progressModule );
    this.widgets = this.addModule( widgetModule );
    this.preloads = this.addModule( preloadModule );
    this.relevant = this.addModule( relevantModule );
    this.repeats = this.addModule( repeatModule );
    this.input = this.addModule( inputHelper );
    this.output = this.addModule( outputModule );
    this.itemset = this.addModule( itemsetModule );
    this.calc = this.addModule( calculationModule );
    this.required = this.addModule( requiredModule );
    this.mask = this.addModule( maskModule );
    this.readonly = this.addModule( readonlyModule );

    try {
        this.preloads.init();

        // before widgets.init (as instanceID used in offlineFilepicker widget)
        // store the current instanceID as data on the form element so it can be easily accessed by e.g. widgets
        this.view.$.data( {
            instanceID: this.model.instanceID
        } );

        // before calc.update!
        this.grosslyViolateStandardComplianceByIgnoringCertainCalcs();
        // before repeats.init to make sure the jr:repeat-count calculation has been evaluated
        this.calc.update();

        // before itemset.update
        this.langs.init();

        // before repeats.init so that template contains role="page" when applicable
        this.pages.init();

        // after radio button data-name setting (now done in XLST)
        this.repeats.init();

        // after repeats.init, but before itemset.update
        this.output.update();

        // after repeats.init
        this.itemset.update();

        // after repeats.init
        this.setAllVals();

        this.readonly.update(); // after setAllVals();

        // after setAllVals, after repeats.init

        this.options.input = this.input;
        this.options.pathToAbsolute = this.pathToAbsolute.bind( this );
        this.options.evaluate = this.model.evaluate.bind( this.model );
        this.options.formClasses = toArray( this.view.html.classList );
        this.options.getModelValue = this.getModelValue.bind( this );
        this.widgetsInitialized = this.widgets.init( null, this.options );

        // after widgets.init(), and after repeats.init(), and after pages.init()
        this.relevant.update();

        // after widgets init to make sure widget handlers are called before
        // after loading existing instance to not trigger an 'edit' event
        this.setEventHandlers();

        // update field calculations again to make sure that dependent
        // field values are calculated
        this.calc.update();

        this.required.update();

        this.mask.init();

        this.editStatus = false;

        if ( this.options.printRelevantOnly !== false ) {
            this.view.$.addClass( 'print-relevant-only' );
        }

        setTimeout( () => {
            that.progress.update();
        }, 0 );

        this.initialized = true;
        return loadErrors;
    } catch ( e ) {
        console.error( e );
        loadErrors.push( `${e.name}: ${e.message}` );
    }

    document.querySelector( 'body' ).scrollIntoView();

    console.debug( 'loadErrors', loadErrors );
    return loadErrors;
};

Form.prototype.goTo = function( xpath ) {
    const errors = [];
    if ( !this.goToTarget( this.getGoToTarget( xpath ) ) ) {
        errors.push( t( 'alert.gotonotfound.msg', {
            path: location.hash.substring( 1 )
        } ) );
    }
    return errors;
};

/**
 * Obtains a string of primary instance.
 * 
 * @param  {!{include: boolean}=} include optional object items to exclude if false
 * @return {string}        XML string of primary instance
 */
Form.prototype.getDataStr = function( include ) {
    include = ( typeof include !== 'object' || include === null ) ? {} : include;
    // By default everything is included
    if ( include.irrelevant === false ) {
        return this.getDataStrWithoutIrrelevantNodes();
    }
    return this.model.getStr();
};

/**
 * Restores HTML form to pre-initialized state. It is meant to be called before re-initializing with
 * new Form ( .....) and form.init()
 * For this reason, it does not fix event handler, $form, formView.$ etc.!
 * It also does not affect the XML instance!
 */
Form.prototype.resetView = function() {
    //form language selector was moved outside of <form> so has to be separately removed
    $( '#form-languages' ).remove();
    this.view.$.replaceWith( this.view.$clone );
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
Form.prototype.replaceChoiceNameFn = function( expr, resTypeStr, selector, index, tryNative ) {
    const that = this;
    const choiceNames = parseFunctionFromExpression( expr, 'jr:choice-name' );

    choiceNames.forEach( choiceName => {
        const params = choiceName[ 1 ];

        if ( params.length === 2 ) {
            let label = '';
            const value = that.model.evaluate( params[ 0 ], resTypeStr, selector, index, tryNative );
            const name = stripQuotes( params[ 1 ] ).trim();
            const $input = that.view.$.find( `[name="${name}"]` );

            if ( !value ) {
                label = '';
            } else if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                label = $input.find( `[value="${value}"]` ).text();
            } else if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'input' ) {
                if ( !$input.attr( 'list' ) ) {
                    label = $input.filter( function() {
                        return $( this ).attr( 'value' ) === value;
                    } ).siblings( '.option-label.active' ).text();
                } else {
                    label = $input.siblings( `datalist#${$input.attr( 'list' )}` ).find( `[data-value="${value}"]` ).attr( 'value' );
                }
            }
            expr = expr.replace( choiceName[ 0 ], `"${label}"` );
        } else {
            throw new FormLogicError( `jr:choice-name function has incorrect number of parameters: ${choiceName[ 0 ]}` );
        }

    } );
    return expr;
};

/**
 *  Uses current state of model to set all the values in the form.
 *  Since not all data nodes with a value have a corresponding input element, 
 *  we cycle through the HTML form elements and check for each form element whether data is available.
 */
Form.prototype.setAllVals = function( $group, groupIndex ) {
    const that = this;
    const selector = ( $group && $group.attr( 'name' ) ) ? $group.attr( 'name' ) : null;

    groupIndex = ( typeof groupIndex !== 'undefined' ) ? groupIndex : null;

    this.model.node( selector, groupIndex ).getElements()
        .reduce( ( nodes, current ) => {
            const newNodes = [ ...current.querySelectorAll( '*' ) ].filter( ( n ) => n.children.length === 0 && n.textContent );
            return nodes.concat( newNodes );
        }, [] )
        .forEach( element => {
            try {
                var value = element.textContent;
                var name = that.model.getXPath( element, 'instance' );
                const index = that.model.node( name ).getElements().indexOf( element );
                const control = that.input.find( name, index );
                if ( control ) {
                    that.input.setVal( control, value );
                }
            } catch ( e ) {
                console.error( e );
                // TODO: Test if this correctly adds to loadErrors
                //loadErrors.push( 'Could not load input field value with name: ' + name + ' and value: ' + value );
                throw new Error( `Could not load input field value with name: ${name} and value: ${value}` );
            }
        } );
    return;
};

Form.prototype.getModelValue = function( $control ) {
    const control = $control[ 0 ];
    const path = this.input.getName( control );
    const index = this.input.getIndex( control );
    return this.model.node( path, index ).getVal();
};

/**
 * Finds nodes that have attributes with XPath expressions that refer to particular XML elements.
 *
 * @param  {string} attribute The attribute name to search for
 * @param  {?string} filter   The optional filter to append to each selector
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 * @return {jQuery}           A jQuery collection of elements
 */
Form.prototype.getRelatedNodes = function( attr, filter, updated ) {
    let $collection;
    let $repeatControls = null;
    let $controls;
    let selector = [];
    const that = this;

    updated = updated || {};
    filter = filter || '';

    // The collection of non-repeat inputs, calculations and groups is cached (unchangeable)
    if ( !this.$nonRepeats[ attr ] ) {
        $controls = this.view.$.find( `:not(.or-repeat-info)[${attr}]` )
            .filter( function() {
                return $( this ).closest( '.or-repeat' ).length === 0;
            } );
        this.$nonRepeats[ attr ] = this.filterRadioCheckSiblings( $controls );
    }

    // If the updated node is inside a repeat (and there are multiple repeats present)
    if ( typeof updated.repeatPath !== 'undefined' && updated.repeatIndex >= 0 ) {
        $controls = this.view.$.find( `.or-repeat[name="${updated.repeatPath}"]` ).eq( updated.repeatIndex )
            .find( `[${attr}]` );
        $repeatControls = this.filterRadioCheckSiblings( $controls );
    }

    // If a new repeat was created, update the cached collection of all form controls with that attribute
    // If a repeat was deleted ( update.repeatPath && !updated.cloned), rebuild cache
    if ( !this.$all[ attr ] || ( updated.repeatPath && !updated.cloned ) ) {
        // (re)build the cache
        this.$all[ attr ] = this.filterRadioCheckSiblings( this.view.$.find( `[${attr}]` ) );
    } else if ( updated.cloned && $repeatControls ) {
        // update the cache
        this.$all[ attr ] = this.$all[ attr ].add( $repeatControls );
    }

    /**
     * If the update was triggered from a repeat, it improves performance (a lot)
     * to exclude all those repeats that did not trigger it...
     * However, this will break if people are referring to nodes in other
     * repeats such as with /path/to/repeat[3]/node, /path/to/repeat[position() = 3]/node or indexed-repeat(/path/to/repeat/node, /path/to/repeat, 3).
     * We accept that for now.
     **/
    if ( $repeatControls ) {
        // The non-repeat fields have to be added too, e.g. to update a calculated item with count(to/repeat/node) at the top level
        $collection = this.$nonRepeats[ attr ].add( $repeatControls );
    } else {
        $collection = this.$all[ attr ];
    }

    // Add selectors based on specific changed nodes
    if ( !updated.nodes || updated.nodes.length === 0 ) {
        selector = selector.concat( [ filter ] );
    } else {
        updated.nodes.forEach( node => {
            selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, node ) );
        } );
        // add all the paths that use the /* selector at end of path
        selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, '*' ) );
    }

    const selectorStr = selector.join( ', ' );

    $collection = selectorStr ? $collection.filter( selectorStr ) : $collection;

    // TODO: exclude descendents of disabled elements? .find( ':not(:disabled) span.active' )
    return $collection;
};

Form.prototype.filterRadioCheckSiblings = $controls => {
    const wrappers = [];
    return $controls.filter( function() {
        // TODO: can this be further performance-optimized?
        const wrapper = this.type === 'radio' || this.type === 'checkbox' ? $( this.parentNode ).parent( '.option-wrapper' )[ 0 ] : null;
        // Filter out duplicate radiobuttons and checkboxes
        if ( wrapper ) {
            if ( wrappers.indexOf( wrapper ) !== -1 ) {
                return false;
            }
            wrappers.push( wrapper );
        }
        return true;
    } );
};

/**
 * Crafts an optimized jQuery selector for element attributes that contain an expression with a target node name.
 * 
 * @param  {string} filter   The filter to use
 * @param  {string} attr     The attribute to target
 * @param  {string} nodeName The XML nodeName to find
 * @return {string}          The selector
 */
Form.prototype.getQuerySelectorsForLogic = ( filter, attr, nodeName ) => [
    // The target node name is ALWAYS at the END of a path inside the expression.
    // #1: followed by space
    `${filter}[${attr}*="/${nodeName} "]`,
    // #2: followed by )
    `${filter}[${attr}*="/${nodeName})"]`,
    // #3: followed by , if used as first parameter of multiple parameters
    `${filter}[${attr}*="/${nodeName},"]`,
    // #4: at the end of an expression
    `${filter}[${attr}$="/${nodeName}"]`,
    // #5: followed by ] (used in itemset filters)
    `${filter}[${attr}*="/${nodeName}]"]`,
    // #6: followed by [ (used when filtering nodes in repeat instances)
    `${filter}[${attr}*="/${nodeName}["]`
];

/**
 * Obtains the XML primary instance as string without nodes that have a relevant
 * that evaluates to false.
 *
 * Though this function may be slow it is slow when it doesn't matter much (upon saving). The
 * alternative is to add some logic to relevant.update to mark irrelevant nodes in the model
 * but that would slow down form loading and form traversal when it does matter.
 * 
 * @return {string} [description]
 */
Form.prototype.getDataStrWithoutIrrelevantNodes = function() {
    const that = this;
    const modelClone = new FormModel( this.model.getStr() );
    modelClone.init();

    // Since we are removing nodes, we need to go in reverse order to make sure 
    // the indices are still correct!
    this.getRelatedNodes( 'data-relevant' ).reverse().each( function() {
        const $node = $( this );
        const node = this;
        const relevant = that.input.getRelevant( node );
        const index = that.input.getIndex( node );
        const path = that.input.getName( node );
        let context;

        /* 
         * Copied from relevant.js:
         * 
         * If the relevant is placed on a group and that group contains repeats with the same name,
         * but currently has 0 repeats, the context will not be available.
         */
        if ( $node.children( `.or-repeat-info[data-name="${path}"]` ).length && !$node.children( `.or-repeat[name="${path}"]` ).length ) {
            context = null;
        } else {
            context = path;
        }

        /*
         * If performance becomes an issue, some opportunities are:
         * - check if ancestor is relevant
         * - use cache of relevant.update
         * - check for repeatClones to avoid calculating index (as in relevant.update)
         */
        if ( context && !that.model.evaluate( relevant, 'boolean', context, index ) ) {
            modelClone.node( context, index ).remove();
        }
    } );

    return modelClone.getStr();
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
Form.prototype.grosslyViolateStandardComplianceByIgnoringCertainCalcs = function() {
    const $culprit = this.view.$.find( '[name$="instanceID"][data-calculate]' );
    if ( $culprit.length > 0 ) {
        $culprit.removeAttr( 'data-calculate' );
    }
};

/**   
 * This re-validates questions that have a dependency on a question that has just been updated.
 * 
 * Note: it does not take care of re-validating a question itself after its value has changed due to a calculation update!
 */
Form.prototype.validationUpdate = function( updated ) {
    let $nodes;
    const that = this;
    let upd;

    if ( config.validateContinuously === true ) {
        upd = updated || {};
        if ( updated.cloned ) {
            /*
             * We don't want requireds and constraints of questions in a newly created
             * repeat to be evaluated immediately after the repeat is created.
             * However, we do want constraints and requireds outside the repeat that
             * depend on e.g. the count() of repeats to be re-evaluated.
             * To achieve this we use a dirty trick and convert the "cloned" updated object
             * to a regular "node" updated object.
             */
            upd = {
                nodes: updated.repeatPath.split( '/' ).reverse().slice( 0, 1 )
            };
        }

        // Find all inputs that have a dependency on the changed node.
        $nodes = this.getRelatedNodes( 'data-constraint', '', upd )
            .add( this.getRelatedNodes( 'data-required', '', upd ) );

        $nodes.each( function() {
            that.validateInput( this );
        } );
    }
};

Form.prototype.setEventHandlers = function() {
    const that = this;

    // Prevent default submission, e.g. when text field is filled in and Enter key is pressed
    this.view.$.attr( 'onsubmit', 'return false;' );

    /*
     * The listener below catches both change and change.file events.
     * The .file namespace is used in the filepicker to avoid an infinite loop. 
     * 
     * Fields with the "ignore" class are dynamically added to the DOM in a widget and are supposed to be handled
     * by the widget itself, e.g. the search field in a geopoint widget. They should be ignored by the main engine.
     *
     * Readonly fields are not excluded because of this scenario:
     * 1. readonly field has a calculation
     * 2. readonly field becomes irrelevant (e.g. parent group with relevant)
     * 3. this clears value in view, which should propagate to model via 'change' event
     */
    this.view.$.on( 'change.file',
        'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)',
        function() {
            const $input = $( this );
            const input = this;
            const n = {
                path: that.input.getName( input ),
                inputType: that.input.getInputType( input ),
                xmlType: that.input.getXmlType( input ),
                val: that.input.getVal( input ),
                index: that.input.getIndex( input )
            };

            // set file input values to the uniqified actual name of file (without c://fakepath or anything like that)
            if ( n.val.length > 0 && n.inputType === 'file' && input.files[ 0 ] && input.files[ 0 ].size > 0 ) {
                n.val = getFilename( input.files[ 0 ], input.dataset.filenamePostfix );
            }
            if ( n.val.length > 0 && n.inputType === 'drawing' ) {
                n.val = getFilename( {
                    name: n.val
                }, input.dataset.filenamePostfix );
            }

            const updated = that.model.node( n.path, n.index ).setVal( n.val, n.xmlType );

            if ( updated ) {
                that.validateInput( input )
                    .then( valid => {
                        // propagate event externally after internal processing is completed
                        $input.trigger( 'valuechange', valid );
                    } );
            }
        } );

    // doing this on the focus event may have little effect on performance, because nothing else is happening :)
    this.view.html.addEventListener( 'focusin', event => {
        // update the form progress status
        this.progress.update( event.target );
    } );
    this.view.html.addEventListener( events.FakeFocus().type, event => {
        // update the form progress status
        this.progress.update( event.target );
    } );

    this.model.events.addEventListener( 'dataupdate', event => {
        that.evaluationCascade.forEach( fn => {
            fn.call( that, event.detail );
        }, true );
        // edit is fired when the model changes after the form has been initialized
        that.editStatus = true;
    } );

    this.view.html.addEventListener( events.AddRepeat().type, event => {
        const index = event.detail ? event.detail[ 0 ] : undefined;
        const $clone = $( event.target );
        const updated = {
            repeatPath: $clone.attr( 'name' ),
            repeatIndex: index,
            cloned: true
        };
        // Set defaults of added repeats in Form, setAllVals does not trigger change event
        that.setAllVals( $clone, index );
        // Initialize calculations, relevant, itemset, required, output inside that repeat. 
        that.evaluationCascade.forEach( fn => {
            fn.call( that, updated );
        } );
        that.progress.update();
    } );

    this.view.html.addEventListener( events.RemoveRepeat().type, () => {
        that.progress.update();
    } );

    this.view.html.addEventListener( events.ChangeLanguage().type, () => {
        that.output.update();
    } );

    this.view.$.find( '.or-group > h4' ).on( 'click', function() {
        // The resize trigger is to make sure canvas widgets start working.
        $( this ).closest( '.or-group' ).toggleClass( 'or-appearance-compact' ).trigger( 'resize' );
    } );
};

Form.prototype.setValid = function( node, type ) {
    const classes = ( type ) ? [ `invalid-${type}` ] : [ 'invalid-constraint', 'invalid-required', 'invalid-relevant' ];
    this.input.getWrapNode( node ).classList.remove( ...classes );
};

Form.prototype.setInvalid = function( node, type ) {
    type = type || 'constraint';

    if ( config.validatePage === false && this.isValid( node ) ) {
        this.blockPageNavigation();
    }

    this.input.getWrapNode( node ).classList.add( `invalid-${type}` );
};

/**
 * Blocks page navigation for a short period.
 * This can be used to ensure that the user sees a new error message before moving to another page.
 * 
 * @return {[type]} [description]
 */
Form.prototype.blockPageNavigation = function() {
    const that = this;
    this.pageNavigationBlocked = true;
    window.clearTimeout( this.blockPageNavigationTimeout );
    this.blockPageNavigationTimeout = window.setTimeout( () => {
        that.pageNavigationBlocked = false;
    }, 600 );
};

/**
 * Checks whether the question is not currently marked as invalid. If no argument is provided, it checks the whole form.
 * 
 * @return {!boolean} whether the question/form is not marked as invalid.
 */
Form.prototype.isValid = function( node ) {
    if ( node ) {
        const question = this.input.getWrapNode( node );
        const cls = question.classList;
        return !cls.contains( 'invalid-required' ) && !cls.contains( 'invalid-constraint' ) && !cls.contains( 'invalid-relevant' );
    }
    return this.view.html.querySelector( '.invalid-required, .invalid-constraint, .invalid-relevant' ) === null;
};

Form.prototype.clearIrrelevant = function() {
    this.relevant.update( null, true );
};

/**
 * Clears all irrelevant question values if necessary and then 
 * validates all enabled input fields after first resetting everything as valid.
 * 
 * @return {Promise} wrapping {boolean} whether the form contains any errors
 */
Form.prototype.validateAll = function() {
    const that = this;
    // to not delay validation unneccessarily we only clear irrelevants if necessary
    if ( this.options.clearIrrelevantImmediately === false ) {
        this.clearIrrelevant();
    }

    return this.validateContent( this.view.$ )
        .then( valid => {
            that.view.html.dispatchEvent( events.ValidationComplete() );
            return valid;
        } );
};

/**
 * Alias of validateAll
 */
Form.prototype.validate = Form.prototype.validateAll;

/**
 * Validates all enabled input fields in the supplied container, after first resetting everything as valid.
 * @return {Promise} wrapping {boolean} whether the container contains any errors
 */
Form.prototype.validateContent = function( $container ) {
    let $firstError;
    const that = this;

    //can't fire custom events on disabled elements therefore we set them all as valid
    $container.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, ' +
        'input:disabled, select:disabled, textarea:disabled' ).each( function() {
        that.setValid( this );
    } );

    const validations = $container.find( '.question' ).addBack( '.question' ).map( function() {
        // only trigger validate on first input and use a **pure CSS** selector (huge performance impact)
        const elem = this
            .querySelector( 'input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)' );
        if ( !elem ) {
            return Promise.resolve();
        }
        return that.validateInput( elem );
    } ).toArray();

    return Promise.all( validations )
        .then( () => {
            $firstError = $container
                .find( '.invalid-required, .invalid-constraint, .invalid-relevant' )
                .addBack( '.invalid-required, .invalid-constraint, .invalid-relevant' )
                .eq( 0 );

            if ( $firstError.length > 0 ) {
                that.goToTarget( $firstError[ 0 ] );
            }
            return $firstError.length === 0;
        } )
        .catch( () => // fail whole-form validation if any of the question
            // validations threw.
            false );
};

Form.prototype.pathToAbsolute = function( targetPath, contextPath ) {
    let target;

    if ( targetPath.indexOf( '/' ) === 0 ) {
        return targetPath;
    }

    // index is irrelevant (no positions in returned path)
    target = this.model.evaluate( targetPath, 'node', contextPath, 0, true );

    return this.model.getXPath( target, 'instance', false );
};

/**
 * Validates question values.
 * 
 * @param  {Element} control    [description]
 * @return {Promise}           [description]
 */
Form.prototype.validateInput = function( control ) {
    if ( !this.initialized ) {
        return Promise.resolve();
    }
    const that = this;
    let getValidationResult;
    // All relevant properties, except for the **very expensive** index property
    // There is some scope for performance improvement by determining other properties when they 
    // are needed, but that may not be so significant.
    const n = {
        path: this.input.getName( control ),
        inputType: this.input.getInputType( control ),
        xmlType: this.input.getXmlType( control ),
        enabled: this.input.isEnabled( control ),
        constraint: this.input.getConstraint( control ),
        calculation: this.input.getCalculation( control ),
        required: this.input.getRequired( control ),
        readonly: this.input.getReadonly( control ),
        val: this.input.getVal( control )
    };
    // No need to validate, **nor send validation events**. Meant for simple empty "notes" only.
    if ( n.readonly && !n.val && !n.required && !n.constraint && !n.calculation ) {
        return Promise.resolve();
    }

    // The enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not.
    // If an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid).
    if ( n.enabled && n.inputType !== 'hidden' ) {
        // Only now, will we determine the index.
        n.ind = this.input.getIndex( control );
        getValidationResult = this.model.node( n.path, n.ind ).validate( n.constraint, n.required, n.xmlType );
    } else {
        getValidationResult = Promise.resolve( {
            requiredValid: true,
            constraintValid: true
        } );
    }

    return getValidationResult
        .then( result => {
            let previouslyInvalid = false;
            const passed = result.requiredValid !== false && result.constraintValid !== false;

            if ( n.inputType !== 'hidden' ) {

                // Check current UI state
                n.q = that.input.getWrapNode( control );
                previouslyInvalid = n.q.classList.contains( 'invalid-required' ) || n.q.classList.contains( 'invalid-constraint' );

                // Update UI
                if ( result.requiredValid === false ) {
                    that.setValid( control, 'constraint' );
                    that.setInvalid( control, 'required' );
                } else if ( result.constraintValid === false ) {
                    that.setValid( control, 'required' );
                    that.setInvalid( control, 'constraint' );
                } else {
                    that.setValid( control, 'constraint' );
                    that.setValid( control, 'required' );
                }
            }
            // Send invalidated event
            if ( !passed && !previouslyInvalid ) {
                control.dispatchEvent( events.Invalidated() );
            }
            return passed;
        } )
        .catch( e => {
            console.error( 'validation error', e );
            that.setInvalid( control, 'constraint' );
            throw e;
        } );
};

Form.prototype.getGoToTarget = function( path ) {
    let hits;
    let modelNode;
    let target;
    let intermediateTarget;
    let selector = '';
    const repeatRegEx = /([^[]+)\[(\d+)\]([^[]*$)?/g;

    if ( !path ) {
        return;
    }

    modelNode = this.model.node( path ).getElement();

    if ( !modelNode ) {
        return;
    }

    // Convert to absolute path, while maintaining positions.
    path = this.model.getXPath( modelNode, 'instance', true );

    // Not inside a cloned repeat.
    target = this.view.html.querySelector( `[name="${path}"]` );

    // If inside a cloned repeat (i.e. a repeat that is not first-in-series)
    if ( !target ) {
        intermediateTarget = this.view.html;
        while ( ( hits = repeatRegEx.exec( path ) ) !== null && intermediateTarget ) {
            selector += hits[ 1 ];
            intermediateTarget = intermediateTarget
                .querySelectorAll( `[name="${selector}"], [data-name="${selector}"]` )[ hits[ 2 ] ];
            if ( intermediateTarget && hits[ 3 ] ) {
                selector += hits[ 3 ];
                intermediateTarget = intermediateTarget
                    .querySelector( `[name="${selector}"],[data-name="${selector}"]` );
            }
            target = intermediateTarget;
        }
    }

    return target ? this.input.getWrapNode( target ) : target;
};

/**
 * Scrolls to a HTML Element, flips to the page it is on and focuses on the nearest form control.
 * 
 * @param  {HTMLElement} target A HTML element to scroll to
 */
Form.prototype.goToTarget = function( target ) {
    if ( target ) {
        if ( this.pages.active ) {
            // Flip to page
            this.pages.flipToPageContaining( $( target ) );
        }
        // check if the nearest question or group is irrelevant after page flip
        if ( target.closest( '.or-branch.disabled' ) ) {
            // It is up to the apps to decide what to do with this event.
            target.dispatchEvent( events.GoToHidden() );
        }
        // Scroll to element
        target.scrollIntoView();
        // Focus on the first non .ignore form control
        // If the element is hidden (e.g. because it's been replaced by a widget), 
        // the focus event will not fire, so we also trigger an applyfocus event that widgets can listen for.
        const input = target.querySelector( 'input:not(.ignore), textarea:not(.ignore), select:not(.ignore)' );
        input.focus();
        input.dispatchEvent( events.ApplyFocus() );
    }
    return !!target;
};

/** 
 * Static method to obtain required enketo-transform version direct from class.
 */
Form.requiredTransformerVersion = '1.31.1';

export { Form, FormModel };
