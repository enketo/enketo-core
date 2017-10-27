'use strict';

var FormModel = require( './Form-model' );
var $ = require( 'jquery' );
var Promise = require( 'lie' );
var utils = require( './utils' );
var t = require( 'translator' ).t;
var config = require( 'enketo-config' );
var inputHelper = require( './input' );
var repeatModule = require( './repeat' );
var pageModule = require( './page' );
var branchModule = require( './branch' );
var itemsetModule = require( './itemset' );
var progressModule = require( './progress' );
var widgetModule = require( './widgets-controller' );
var languageModule = require( './language' );
var preloadModule = require( './preload' );
var outputModule = require( './output' );
var calculationModule = require( './calculation' );
var maskModule = require( './mask' );
require( './plugins' );
require( './extend' );

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
    var $form = $( formSelector );

    this.$nonRepeats = {};
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
    this.repeatsPresent = this.view.$.find( '.or-repeat' ).length > 0;
    this.widgetsInitialized = false;
    this.pageNavigationBlocked = false;
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
            this.branch.update.bind( this.branch ),
            this.output.update.bind( this.output ),
            this.itemset.update.bind( this.itemset ),
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
        return !!this.view.$.data( 'edited' );
    },
    set editStatus( status ) {
        // only trigger edit event once
        if ( status && status !== this.view.$.data( 'edited' ) ) {
            this.view.$.trigger( 'edited.enketo' );
        }
        this.view.$.data( 'edited', status );
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
    var loadErrors = [];
    var that = this;

    loadErrors = loadErrors.concat( this.model.init() );

    if ( typeof this.model === 'undefined' || !( this.model instanceof FormModel ) ) {
        loadErrors.push( 'Form could not be initialized without a model.' );
        return loadErrors;
    }

    // Before initializing form view, passthrough some model events externally
    this.model.$events.on( 'dataupdate', function( event, updated ) {
        that.view.$.trigger( 'dataupdate.enketo', updated );
    } );
    this.model.$events.on( 'removed', function( event, updated ) {
        that.view.$.trigger( 'removed.enketo', updated );
    } );

    this.pages = this.addModule( pageModule );
    this.langs = this.addModule( languageModule );
    this.progress = this.addModule( progressModule );
    this.widgets = this.addModule( widgetModule );
    this.preloads = this.addModule( preloadModule );
    this.branch = this.addModule( branchModule );
    this.repeats = this.addModule( repeatModule );
    this.input = this.addModule( inputHelper );
    this.output = this.addModule( outputModule );
    this.itemset = this.addModule( itemsetModule );
    this.calc = this.addModule( calculationModule );
    this.mask = this.addModule( maskModule );

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

        // after repeats.init
        this.itemset.update();

        // after repeats.init
        this.setAllVals();

        // after setAllVals, after repeats.init

        this.options.input = this.input;
        this.options.pathToAbsolute = this.pathToAbsolute.bind( this );
        this.options.evaluate = this.model.evaluate.bind( this.model );
        this.options.formClasses = utils.toArray( this.view.html.classList );
        this.widgetsInitialized = this.widgets.init( null, this.options );

        // after widgets.init(), and repeats.init()
        this.branch.update();

        // after repeats.init()
        this.output.update();

        // after widgets init to make sure widget handlers are called before
        // after loading existing instance to not trigger an 'edit' event
        this.setEventHandlers();

        // update field calculations again to make sure that dependent
        // field values are calculated
        this.calc.update();

        // after branch.update to make sure page-relevancy has already been determined
        this.pages.init();

        this.mask.init();

        this.editStatus = false;

        if ( this.options.goTo === true && location.hash ) {
            // if goTo fails (not found), it will return false
            if ( !this.goTo( this.getGoToTarget( location.hash ) ) ) {
                loadErrors.push( t( 'alert.gotonotfound.msg', {
                    path: location.hash.substring( 1 )
                } ) );
            }
        }

        if ( this.options.printRelevantOnly !== false ) {
            this.view.$.addClass( 'print-relevant-only' );
        }

        setTimeout( function() {
            that.progress.update();
        }, 0 );

        return loadErrors;
    } catch ( e ) {
        console.error( e );
        loadErrors.push( e.name + ': ' + e.message );
    }

    document.querySelector( 'body' ).scrollIntoView();

    console.debug( 'loadErrors', loadErrors );
    return loadErrors;
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
    var value;
    var name;
    var $input;
    var label = '';
    var matches = expr.match( /jr:choice-name\(([^,]+),\s?'(.*?)'\)/ );

    if ( matches ) {
        value = this.model.evaluate( matches[ 1 ], resTypeStr, selector, index, tryNative );
        name = matches[ 2 ].trim();
        $input = this.view.$.find( '[name="' + name + '"]' );

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
 *  Uses current state of model to set all the values in the form.
 *  Since not all data nodes with a value have a corresponding input element, 
 *  we cycle through the HTML form elements and check for each form element whether data is available.
 */
Form.prototype.setAllVals = function( $group, groupIndex ) {
    var index;
    var name;
    var value;
    var that = this;
    var selector = ( $group && $group.attr( 'name' ) ) ? $group.attr( 'name' ) : null;

    groupIndex = ( typeof groupIndex !== 'undefined' ) ? groupIndex : null;

    this.model.node( selector, groupIndex ).get().find( '*' ).filter( function() {
        var $node = $( this );
        // only return non-empty leafnodes
        return $node.children().length === 0 && $node.text();
    } ).each( function() {
        var $node = $( this );

        try {
            value = $node.text();
            name = that.model.getXPath( $node.get( 0 ), 'instance' );
            index = that.model.node( name ).get().index( this );
            that.input.setVal( name, index, value );
        } catch ( e ) {
            console.error( e );
            // TODO: Test if this correctly adds to loadErrors
            //loadErrors.push( 'Could not load input field value with name: ' + name + ' and value: ' + value );
            throw new Error( 'Could not load input field value with name: ' + name + ' and value: ' + value );
        }
    } );
    return;
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
    var $collection;
    var $repeat = null;
    var selector = [];
    var that = this;
    var wrappers = [];

    updated = updated || {};
    filter = filter || '';

    // The collection of non-repeat inputs is cached (unchangeable)
    if ( !this.$nonRepeats[ attr ] ) {
        this.$nonRepeats[ attr ] = this.view.$.find( filter + '[' + attr + ']' )
            .parentsUntil( '.or', '.calculation, .question' ).filter( function() {
                return $( this ).closest( '.or-repeat' ).length === 0;
            } );
    }

    // If the updated node is inside a repeat (and there are multiple repeats present)
    if ( typeof updated.repeatPath !== 'undefined' && updated.repeatIndex >= 0 ) {
        $repeat = this.view.$.find( '.or-repeat[name="' + updated.repeatPath + '"]' ).eq( updated.repeatIndex );
    }

    /**
     * If the update was triggered from a repeat, it improves performance (a lot)
     * to exclude all those repeats that did not trigger it...
     * However, this will break if people are referring to nodes in other
     * repeats such as with /path/to/repeat[3]/node, /path/to/repeat[position() = 3]/node or indexed-repeat(/path/to/repeat/node, /path/to/repeat, 3).
     * We accept that for now.
     **/
    if ( $repeat ) {
        // the non-repeat fields have to be added too, e.g. to update a calculated item with count(to/repeat/node) at the top level
        $collection = this.$nonRepeats[ attr ]
            .add( $repeat );
    } else {
        $collection = this.view.$;
    }

    // add selectors based on specific changed nodes
    // Add selectors based on specific changed nodes
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
    return $collection.find( selector.join() )
        .filter( function() {
            // TODO: can this be further performance-optimized?
            var wrapper = this.type === 'radio' || this.type === 'checkbox' ? $( this.parentNode ).parent( '.option-wrapper' )[ 0 ] : null;
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
Form.prototype.getQuerySelectorsForLogic = function( filter, attr, nodeName ) {
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
 * alternative is to add some logic to branch.update to mark irrelevant nodes in the model
 * but that would slow down form loading and form traversal when it does matter.
 * 
 * @return {string} [description]
 */
Form.prototype.getDataStrWithoutIrrelevantNodes = function() {
    var that = this;
    var modelClone = new FormModel( this.model.getStr() );
    modelClone.init();

    // Since we are removing nodes, we need to go in reverse order to make sure 
    // the indices are still correct!
    this.getRelatedNodes( 'data-relevant' ).reverse().each( function() {
        var $node = $( this );
        var relevant = that.input.getRelevant( $node );
        var index = that.input.getIndex( $node );
        var path = that.input.getName( $node );
        var context;

        /* 
         * Copied from branch.js:
         * 
         * If the relevant is placed on a group and that group contains repeats with the same name,
         * but currently has 0 repeats, the context will not be available.
         */
        if ( $node.children( '.or-repeat-info[data-name="' + path + '"]' ).length && !$node.children( '.or-repeat[name="' + path + '"]' ).length ) {
            context = null;
        } else {
            context = path;
        }

        /*
         * If performance becomes an issue, some opportunities are:
         * - check if ancestor is relevant
         * - use cache of branch.update
         * - check for repeatClones to avoid calculating index (as in branch.update)
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
    var $culprit = this.view.$.find( '[name$="instanceID"][data-calculate]' );
    if ( $culprit.length > 0 ) {
        $culprit.removeAttr( 'data-calculate' );
    }
};

Form.prototype.validationUpdate = function( updated ) {
    var $nodes;
    var that = this;
    var upd;

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

        $nodes = this.getRelatedNodes( 'data-constraint', '', upd )
            .add( this.getRelatedNodes( 'data-required', '', upd ) );

        $nodes.each( function() {
            that.validateInput( $( this ) );
        } );
    }
};

Form.prototype.setEventHandlers = function() {
    var that = this;

    //first prevent default submission, e.g. when text field is filled in and Enter key is pressed
    this.view.$.attr( 'onsubmit', 'return false;' );

    /*
     * The .file namespace is used in the filepicker to avoid an infinite loop. 
     * The listener below catches both change and change.file events.
     *
     * Readonly fields are not excluded because of this scenario:
     * 1. readonly field has a calculation
     * 2. readonly field becomes irrelevant (e.g. parent group with relevant)
     * 3. this clears value in view, which should propagate to model via 'change' event
     */
    this.view.$.on( 'change.file',
        'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)',
        function() {
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
            // set file input values to the uniqified actual name of file (without c://fakepath or anything like that)
            if ( n.val.length > 0 && n.inputType === 'file' && $input[ 0 ].files[ 0 ] && $input[ 0 ].files[ 0 ].size > 0 ) {
                n.val = utils.getFilename( $input[ 0 ].files[ 0 ], $input[ 0 ].dataset.filenamePostfix );
            }
            if ( n.val.length > 0 && n.inputType === 'drawing' ) {
                n.val = utils.getFilename( {
                    name: n.val
                }, $input[ 0 ].dataset.filenamePostfix );
            }

            that.model.node( n.path, n.index ).setVal( n.val, n.constraint, n.xmlType, requiredExpr, true );

            that.validateInput( $input )
                .then( function( valid ) {
                    // propagate event externally after internal processing is completed
                    $input.trigger( 'valuechange.enketo', valid );
                } );
        } );

    // doing this on the focus event may have little effect on performance, because nothing else is happening :)
    this.view.$.on( 'focus fakefocus', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
        // update the form progress status
        that.progress.update( event.target );
    } );

    this.model.$events.on( 'dataupdate', function( event, updated ) {
        that.evaluationCascade.forEach( function( fn ) {
            fn.call( that, updated );
        } );
        // edit is fired when the model changes after the form has been initialized
        that.editStatus = true;
    } );

    this.view.$.on( 'addrepeat', function( event, index ) {
        var $clone = $( event.target );
        var updated = {
            repeatPath: $clone.attr( 'name' ),
            repeatIndex: index,
            cloned: true
        };
        // Set defaults of added repeats in Form, setAllVals does not trigger change event
        that.setAllVals( $clone, index );
        // Initialize calculations, branch, itemset, output inside that repeat. 
        that.evaluationCascade.forEach( function( fn ) {
            fn.call( that, updated );
        } );
        that.progress.update();
    } );

    this.view.$.on( 'removerepeat', function() {
        that.progress.update();
    } );

    this.view.$.on( 'changelanguage', function() {
        that.output.update();
    } );

    this.view.$.find( '.or-group > h4' ).on( 'click', function() {
        $( this ).closest( '.or-group' ).toggleClass( 'or-appearance-compact' );
    } );
};

Form.prototype.setValid = function( $node, type ) {
    var classes = ( type ) ? 'invalid-' + type : 'invalid-constraint invalid-required invalid-relevant';
    this.input.getWrapNodes( $node ).removeClass( classes );
};

Form.prototype.setInvalid = function( $node, type ) {
    type = type || 'constraint';

    if ( config.validatePage === false && this.isValid( $node ) ) {
        this.blockPageNavigation();
    }

    this.input.getWrapNodes( $node ).addClass( 'invalid-' + type );
};

/**
 * Blocks page navigation for a short period.
 * This can be used to ensure that the user sees a new error message before moving to another page.
 * 
 * @return {[type]} [description]
 */
Form.prototype.blockPageNavigation = function() {
    var that = this;
    this.pageNavigationBlocked = true;
    window.clearTimeout( this.blockPageNavigationTimeout );
    this.blockPageNavigationTimeout = window.setTimeout( function() {
        that.pageNavigationBlocked = false;
    }, 600 );
};

/**
 * Checks whether the question is not currently marked as invalid. If no argument is provided, it checks the whole form.
 * 
 * @return {!boolean} whether the question/form is not marked as invalid.
 */
Form.prototype.isValid = function( $node ) {
    var $question;
    if ( $node ) {
        $question = this.input.getWrapNodes( $node );
        return !$question.hasClass( 'invalid-required' ) && !$question.hasClass( 'invalid-constraint' ) && !$question.hasClass( 'invalid-relevant' );
    }
    return this.view.$.find( '.invalid-required, .invalid-constraint, .invalid-relevant' ).length === 0;
};

Form.prototype.clearIrrelevant = function() {
    this.branch.update( null, true );
};

/**
 * Clears all irrelevant question values if necessary and then 
 * validates all enabled input fields after first resetting everything as valid.
 * 
 * @return {Promise} wrapping {boolean} whether the form contains any errors
 */
Form.prototype.validateAll = function() {
    var that = this;
    // to not delay validation unneccessarily we only clear irrelevants if necessary
    if ( this.options.clearIrrelevantImmediately === false ) {
        this.clearIrrelevant();
    }

    return this.validateContent( this.view.$ )
        .then( function( valid ) {
            that.view.$.trigger( 'validationcomplete.enketo' );
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
                .find( '.invalid-required, .invalid-constraint, .invalid-relevant' )
                .addBack( '.invalid-required, .invalid-constraint, .invalid-relevant' )
                .eq( 0 );

            if ( $firstError.length > 0 ) {
                that.goTo( $firstError[ 0 ] );
            }
            return $firstError.length === 0;
        } )
        .catch( function() {
            // fail whole-form validation if any of the question
            // validations threw.
            return false;
        } );
};

Form.prototype.pathToAbsolute = function( targetPath, contextPath ) {
    var target;

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
 * @param  {jQuery} $input    [description]
 * @return {Promise}           [description]
 */
Form.prototype.validateInput = function( $input ) {
    var that = this;
    var getValidationResult;
    // All relevant properties, except for the **very expensive** index property
    // There is some scope for performance improvement by determining other properties when they 
    // are needed, but that may not be so significant.
    var n = {
        path: this.input.getName( $input ),
        inputType: this.input.getInputType( $input ),
        xmlType: this.input.getXmlType( $input ),
        enabled: this.input.isEnabled( $input ),
        constraint: this.input.getConstraint( $input ),
        calculation: this.input.getCalculation( $input ),
        required: this.input.getRequired( $input ),
        readonly: this.input.getReadonly( $input ),
        val: this.input.getVal( $input )
    };
    // No need to validate, **nor send validation events**. Meant for simple empty "notes" only.
    if ( n.readonly && !n.val && !n.required && !n.constraint && !n.calculation ) {
        return Promise.resolve();
    }

    // The enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not.
    // If an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid).
    if ( n.enabled && n.inputType !== 'hidden' ) {
        // Only now, will we determine the index.
        n.ind = this.input.getIndex( $input );
        getValidationResult = this.model.node( n.path, n.ind ).validate( n.constraint, n.required, n.xmlType );
    } else {
        getValidationResult = Promise.resolve( {
            requiredValid: true,
            constraintValid: true
        } );
    }

    return getValidationResult
        .then( function( result ) {
            var previouslyInvalid = false;
            var passed = result.requiredValid !== false && result.constraintValid !== false;

            if ( n.inputType !== 'hidden' ) {
                // Check current UI state
                n.$q = that.input.getWrapNodes( $input );
                n.$required = n.$q.find( '.required' );
                previouslyInvalid = n.$q.hasClass( 'invalid-required' ) || n.$q.hasClass( 'invalid-constraint' );

                // Update UI
                if ( result.requiredValid === false ) {
                    that.setValid( $input, 'constraint' );
                    that.setInvalid( $input, 'required' );
                    n.$required.removeClass( 'hide' );
                } else {
                    that.updateRequiredVisibility( n );

                    if ( result.constraintValid === false ) {
                        that.setValid( $input, 'required' );
                        that.setInvalid( $input, 'constraint' );
                    } else {
                        that.setValid( $input, 'constraint' );
                        that.setValid( $input, 'required' );
                    }
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

/**
 * Extracted as separate function for the purpose of overriding it in custom apps.
 * @param  {{$required: jQuery collection, path: string, ind: number, required: string}} n [description]
 */
Form.prototype.updateRequiredVisibility = function( n ) {
    // Show/hide the asterisk of dynamic required expressions
    // This is only 'realtime' with `validateContinuously: true`
    if ( n.required ) {
        n.$required.toggleClass( 'hide', !this.model.node( n.path, n.ind ).isRequired( n.required ) );
    }
};


Form.prototype.getGoToTarget = function( hash ) {
    var path;
    var hits;
    var modelNode;
    var target;
    var intermediateTarget;
    var selector = '';
    var repeatRegEx = /([^\[]+)\[(\d+)\]([^\[]*$)?/g;

    if ( !hash ) {
        return;
    }

    path = hash.substr( 1 );
    modelNode = this.model.node( path ).get().get( 0 );

    if ( !modelNode ) {
        return;
    }

    // Convert to absolute path, while maintaining positions.
    path = this.model.getXPath( modelNode, 'instance', true );

    // Not inside a cloned repeat.
    target = this.view.html.querySelector( '[name="' + path + '"]' );

    // If inside a cloned repeat (i.e. a repeat that is not first-in-series)
    if ( !target ) {
        intermediateTarget = this.view.html;
        while ( ( hits = repeatRegEx.exec( path ) ) !== null && intermediateTarget ) {
            selector += hits[ 1 ];
            intermediateTarget = intermediateTarget
                .querySelectorAll( '[name="' + selector + '"], [data-name="' + selector + '"]' )[ hits[ 2 ] ];
            if ( intermediateTarget && hits[ 3 ] ) {
                selector += hits[ 3 ];
                intermediateTarget = intermediateTarget
                    .querySelector( '[name="' + selector + '"],[data-name="' + selector + '"]' );
            }
            target = intermediateTarget;
        }
    }

    return target ? this.input.getWrapNodes( $( target ) ).get( 0 ) : target;
};


/**
 * Scrolls to a HTML Element, flips to the page it is on and focuses on the nearest form control.
 * 
 * @param  {HTMLElement} target A HTML element to scroll to
 */
Form.prototype.goTo = function( target ) {
    if ( target ) {
        if ( this.pages.active ) {
            // Flip to page
            this.pages.flipToPageContaining( $( target ) );
        }
        // check if the nearest question or group is hidden after page flip (e.g. by being irrelevant)
        if ( $( target ).closest( '.question, .or-group, .or-group-data' ).is( ':hidden' ) ) {
            // It is up to the apps to decide what to do with this event.
            $( target ).trigger( 'gotohidden.enketo' );
        }
        // Scroll to element
        target.scrollIntoView();
        // Focus on the first non .ignore form control
        // If the element is hidden (e.g. because it's been replaced by a widget), 
        // the focus event will not fire, so we also trigger an applyfocus event that widgets can listen for.
        $( target.querySelector( 'input:not(.ignore), textarea:not(.ignore), select:not(.ignore)' ) )
            .trigger( 'focus' ).trigger( 'applyfocus' );
    }
    return !!target;
};

/** 
 * Static method to obtain required enketo-transform version direct from class.
 */
Form.getRequiredTransformerVersion = function() {
    console.deprecate( 'Form.getRequiredTransformerVersion()', 'Form.requiredTransformerVersion' );
    return Form.requiredTransformerVersion;
};
Form.requiredTransformerVersion = '1.21.1';

module.exports = Form;

// The deprecated methods below to be removed for version 5.0.0:
/**
 * @deprecated
 */
Form.prototype.getInstanceID = function() {
    console.deprecate( 'form.getInstanceID()', 'form.instanceID' );
    return this.instanceID;
};
/**
 * @deprecated
 */
Form.prototype.getDeprecatedID = function() {
    console.deprecate( 'form.getDeprecatedID()', 'form.deprecatedID' );
    return this.deprecatedID;
};
/**
 * @deprecated
 */
Form.prototype.getInstanceName = function() {
    console.deprecate( 'form.getModel()', 'form.instanceName' );
    return this.instanceName;
};
/**
 * @deprecated
 */
Form.prototype.getVersion = function() {
    console.deprecate( 'form.getVersion()', 'form.version' );
    return this.version;
};
/**
 * @deprecated
 */
Form.prototype.getEncryptionKey = function() {
    console.deprecate( 'form.getEncryptionKey()', 'form.encryptionKey' );
    return this.encryptionKey;
};
/**
 * @deprecated
 */
Form.prototype.getAction = function() {
    console.deprecate( 'form.getAction()', 'form.action' );
    return this.action;
};
/**
 * @deprecated
 */
Form.prototype.getMethod = function() {
    console.deprecate( 'form.getMethod()', 'form.method ' );
    return this.method;
};
/**
 * @deprecated
 */
Form.prototype.getModel = function() {
    console.deprecate( 'form.getModel()', 'form.model' );
    return this.model;
};
/**
 * @deprecated
 */
Form.prototype.getView = function() {
    console.deprecate( 'form.getView()', 'form.view' );
    return this.view;
};
/**
 * @deprecated
 */
Form.prototype.getRecordName = function() {
    console.deprecate( 'form.getRecordName()', 'form.recordName' );
    return this.recordName;
};
/**
 * @deprecated
 */
Form.prototype.setRecordName = function( name ) {
    console.deprecate( 'form.setRecordName()', 'form.recordName="val"' );
    this.recordName = name;
};
/**
 * @deprecated
 */
Form.prototype.setEditStatus = function( status ) {
    console.deprecate( 'form.setEditStatus()', 'form.editStatus="val"' );
    this.editStatus = status;
};
/**
 * @deprecated
 */
Form.prototype.getEditStatus = function() {
    console.deprecate( 'form.getEditStatus()', 'form.editStatus' );
    return this.editStatus;
};
/**
 * @deprecated
 */
Form.prototype.getSurveyName = function() {
    console.deprecate( 'form.getSurveyName()', 'form.editStatus' );
    return this.surveyName;
};
