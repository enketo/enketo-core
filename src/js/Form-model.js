if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
define( function( require, exports, module ) {
    'use strict';
    var MergeXML = require( 'mergexml/mergexml' );
    var utils = require( './utils' );
    var $ = require( 'jquery' );
    var FormLogicError = require( './Form-logic-error' );
    require( './plugins' );
    require( './extend' );
    require( 'jquery-xpath-basic' );

    var FormModel, Nodeset, types;


    /**
     * Class dealing with the XML Model of a form
     *
     * @constructor
     * @param {{modelStr: string, ?instanceStr: string, ?external: <{id: string, xmlStr: string }>, ?submitted: boolean }} data:
     *                            data object containing XML model, 
     *                            (partial) XML instance to load, 
     *                            external data array
     *                            flag to indicate whether data was submitted before
     * @param {?{?full:boolean}} options Whether to initialize the full model or only the primary instance
     */
    FormModel = function( data, options ) {

        if ( typeof data === 'string' ) {
            data = {
                modelStr: data
            };
        }

        data.external = data.external || [];
        data.submitted = ( typeof data.submitted !== 'undefined' ) ? data.submitted : true;
        options = options || {};
        options.full = ( typeof options.full !== 'undefined' ) ? options.full : true;

        this.convertedExpressions = {};
        this.templates = {};
        this.loadErrors = [];

        this.INSTANCE = /instance\([\'|\"]([^\/:\s]+)[\'|\"]\)/g;
        this.OPENROSA = /(decimal-date-time\(|pow\(|indexed-repeat\(|format-date\(|coalesce\(|join\(|max\(|min\(|random\(|substr\(|int\(|uuid\(|regex\(|now\(|today\(|date\(|if\(|boolean-from-string\(|checklist\(|selected\(|selected-at\(|round\(|area\(|position\([^\)])/;

        this.data = data;
        this.options = options;
    };

    /**
     * Initializes FormModel
     */
    FormModel.prototype.init = function() {
        var id, instanceDoc, instanceRoot,
            that = this;
        /**
         * Default namespaces (on a primary instance, instance child, model) would create a problem using the **native** XPath evaluator.
         * It wouldn't find any regular /path/to/nodes. The solution is to ignore these by renaming these attributes to data-xmlns.
         *
         * If the regex is later deemed too aggressive, it could target the model, primary instance and primary instance child only, after creating an XML Document.
         */
        this.data.modelStr = this.data.modelStr.replace( /\s(xmlns\=("|')[^\s\>]+("|'))/g, ' data-$1' );

        if ( !this.options.full ) {
            // Strip all secondary instances from string before parsing
            // This regex works because the model never includes itext in Enketo
            this.data.modelStr = this.data.modelStr.replace( /^(<model\s*><instance((?!<instance).)+<\/instance\s*>\s*)(<instance.+<\/instance\s*>)*/, '$1' );
        }

        // Create the model
        try {
            id = 'model';
            // the default model
            this.xml = $.parseXML( this.data.modelStr );
            // add external data to model
            this.data.external.forEach( function( instance ) {
                id = 'instance "' + instance.id + '"' || 'instance unknown';
                instanceDoc = that.xml.getElementById( instance.id );
                // remove any existing content that is just an XLSForm hack to pass ODK Validate
                instanceRoot = instanceDoc.querySelector( 'root' );
                if ( instanceRoot ) {
                    instanceDoc.removeChild( instanceRoot );
                }
                instanceDoc.appendChild( $.parseXML( instance.xmlStr ).firstChild );
            } );
        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
        }

        // Initialize/process the model
        if ( this.xml ) {
            try {
                this.$ = $( this.xml );
                this.hasInstance = !!this.xml.querySelector( 'model > instance' ) || false;
                this.rootElement = this.xml.querySelector( 'instance > *' ) || this.xml.documentElement;

                // Check if all secondary instances with an external source have been populated
                this.$.find( 'model > instance[src]:empty' ).each( function( index, instance ) {
                    that.loadErrors.push( 'External instance "' + $( instance ).attr( 'id' ) + '" is empty.' );
                } );

                this.trimValues();
                this.cloneAllTemplates();
                this.extractTemplates();
            } catch ( e ) {
                console.error( e );
                this.loadErrors.push( e.name + ': ' + e.message );
            }
            // Merge an existing instance into the model, AFTER templates have been removed
            try {
                id = 'record';
                if ( this.data.instanceStr ) {
                    this.mergeXml( this.data.instanceStr );
                    if ( this.data.submitted ) {
                        this.deprecateId();
                    }
                }
            } catch ( e ) {
                console.error( e );
                this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
            }
        }

        return this.loadErrors;
    };

    /**
     * Returns a new Nodeset instance
     *
     * @param {(string|null)=} selector - [type/description]
     * @param {(string|number|null)=} index    - [type/description]
     * @param {(Object|null)=} filter   - [type/description]
     * @param filter.onlyLeaf
     * @param filter.noEmpty
     * @return {Nodeset}
     */
    FormModel.prototype.node = function( selector, index, filter ) {
        return new Nodeset( selector, index, filter, this );
    };

    /**
     * Merges an XML instance string into the XML Model
     *
     * @param  {string} recordStr The XML record as string
     * @param  {string} modelDoc  The XML model to merge the record into
     */
    FormModel.prototype.mergeXml = function( recordStr ) {
        var modelInstanceChildStr, merger, modelInstanceEl, modelInstanceChildEl;
        var that = this;

        if ( !recordStr ) {
            return;
        }

        modelInstanceEl = this.xml.querySelector( 'instance' );
        modelInstanceChildEl = this.xml.querySelector( 'instance > *' ); // do not use firstChild as it may find a #textNode

        if ( !modelInstanceChildEl ) {
            throw new Error( 'Model is corrupt. It does not contain a childnode of instance' );
        }

        /**
         * To comply with quirky behaviour of repeats in XForms, we manually create the correct number of repeat instances
         * before merging. This resolves these two issues:
         *  a) Multiple repeat instances in record are added out of order when merged into a record that contains fewer 
         *     repeat instances, see https://github.com/kobotoolbox/enketo-express/issues/223
         *  b) If a repeat node is missing from a repeat instance (e.g. the 2nd) in a record, and that repeat instance is not 
         *     in the model, that node will be missing in the result.
         */

        $( $.parseXML( recordStr ) ).find( '*' ).each( function() {
            var path;
            var $node = $( this );
            var nodeName = $node.prop( 'nodeName' );
            /**
             * TODO: fails when node has namespace.
             * The most solid way is probably to create an instance of FormModel for the record.
             * However, since namespaced nodes will likely never pop up inside a repeat, 
             * and cloning a namespaced repeat woul fail anyway, we just catch and ignore any 
             * exceptions here.
             */
            try {
                var $siblings = $node.siblings( nodeName );
                if ( $siblings.length > 0 && $node.prev( nodeName ).length === 0 ) {
                    path = $node.getXPath( 'instance' );
                    $siblings.each( function( index ) {
                        that.cloneRepeat( path, index, true );
                    } );
                }
            } catch ( e ) {
                console.log( 'Ignored error:', e );
            }
        } );

        merger = new MergeXML( {
            join: false
        } );

        modelInstanceChildStr = ( new XMLSerializer() ).serializeToString( modelInstanceChildEl );

        // first the model, to preserve DOM order of that of the default instance
        merger.AddSource( modelInstanceChildStr );
        // then merge the record into the model
        merger.AddSource( recordStr );

        if ( merger.error.code ) {
            throw new Error( merger.error.text );
        }

        // remove the primary instance  childnode from the original model
        this.xml.querySelector( 'instance' ).removeChild( modelInstanceChildEl );
        // adopt the merged instance childnode
        modelInstanceChildEl = this.xml.adoptNode( merger.Get( 0 ).documentElement, true );
        // append the adopted node to the primary instance
        modelInstanceEl.appendChild( modelInstanceChildEl );
        // reset the rootElement
        this.rootElement = modelInstanceChildEl;

    };

    /**
     * Trims values
     * 
     */
    FormModel.prototype.trimValues = function() {
        this.node( null, null, {
            noEmpty: true
        } ).get().each( function() {
            this.textContent = this.textContent.trim();
        } );
    };

    /**
     * [deprecateId description]
     * @return {[type]} [description]
     */
    FormModel.prototype.deprecateId = function() {
        var instanceIdEls, instanceIdEl, deprecatedIdEls, deprecatedIdEl, metaEl;

        /*
         * When implementing this function using the this.node(selector) to find nodes instead of querySelectorAll,
         * I found that the results were always empty even if the nodes existed. There seems to be 
         * some sort of delay in updating the XML Document (in mergeXML) that causes a problem
         * when the XPath evaluator is used to retrieve nodes.
         */

        instanceIdEls = this.xml.querySelectorAll( '* > meta > instanceID' );

        if ( instanceIdEls.length !== 1 ) {
            throw new Error( 'Invalid primary instance. Found ' + instanceIdEls.length + ' instanceID nodes but expected 1.' );
        }

        instanceIdEl = instanceIdEls[ 0 ];

        deprecatedIdEls = this.xml.querySelectorAll( '* > meta > deprecatedID' );

        if ( deprecatedIdEls.length > 1 ) {
            throw new Error( 'Invalid primary instance. Found ' + deprecatedIdEls.length + ' deprecatedID nodes but expected 1.' );
        }

        deprecatedIdEl = deprecatedIdEls[ 0 ];

        // add deprecatedID node
        if ( !deprecatedIdEl ) {
            deprecatedIdEl = $.parseXML( '<deprecatedID/>' ).documentElement;
            this.xml.adoptNode( deprecatedIdEl );
            metaEl = this.xml.querySelector( '* > meta' );
            metaEl.appendChild( deprecatedIdEl );
        }

        // give deprecatedID element the value of the instanceId
        deprecatedIdEl.textContent = instanceIdEl.textContent;

        // set the instanceID value to empty
        instanceIdEl.textContent = '';
    };

    /**
     * Creates a custom XPath Evaluator to be used for XPath Expresssions that contain custom
     * OpenRosa functions or for browsers that do not have a native evaluator.
     */
    FormModel.prototype.bindJsEvaluator = require( './xpath-evaluator-binding' );

    /**
     * Gets the instance ID
     *
     * @return {string} instanceID
     */
    FormModel.prototype.getInstanceID = function() {
        return this.node( '/*/meta/instanceID' ).getVal()[ 0 ];
    };

    /**
     * Gets the instance Name
     *
     * @return {string} instanceID
     */
    FormModel.prototype.getInstanceName = function() {
        return this.node( '/*/meta/instanceName' ).getVal()[ 0 ];
    };

    /**
     * Clones a <repeat>able instance node. If a template exists it will use this, otherwise it will clone an empty version of the first node.
     * If the node with the specified index already exists, this function will do nothing.
     *
     * @param  {string} selector selector of a repeat or a node that is contained inside a repeat
     * @param  {number} index    index of the repeat that the new repeat should be inserted after.
     * @param  {boolean} merge   whether this operation is part of a merge operation (won't send dataupdate event and clears all values)
     */
    FormModel.prototype.cloneRepeat = function( selector, index, merge ) {
        var $insertAfterNode, name, allClonedNodeNames, $templateClone,
            $template = this.templates[ selector ] || this.node( selector, 0 ).get(),
            that = this;

        name = $template.prop( 'nodeName' );
        $insertAfterNode = this.node( selector, index ).get();

        // If templatenodes and insertAfterNode(s) have been identified 
        // AND the node following insertAfterNode doesn't already exist (! important for nested repeats!)
        // Strictly speaking using .next() is more efficient, but we use .nextAll() in case the document order has changed due to 
        // incorrect merging of an existing record.
        if ( $template[ 0 ] && $insertAfterNode.length === 1 && $insertAfterNode.nextAll( name ).length === 0 ) {
            $templateClone = $template.clone().insertAfter( $insertAfterNode );

            if ( !merge ) {
                allClonedNodeNames = [ $template.prop( 'nodeName' ) ];

                $template.find( '*' ).each( function() {
                    allClonedNodeNames.push( $( this ).prop( 'nodeName' ) );
                } );

                this.$.trigger( 'dataupdate', {
                    nodes: allClonedNodeNames,
                    repeatPath: selector,
                    repeatIndex: that.node( selector, index ).determineIndex( $templateClone )
                } );
            } else {
                // this is part of a merge operation (during form load) where the values will be populated from the record, 
                // defaults are therefore not desired
                $templateClone.find( '*' ).text( '' );
            }
        } else {
            // Strictly speaking using .next() is more efficient, but we use .nextAll() in case the document order has changed due to 
            // incorrect merging of an existing record.
            if ( $insertAfterNode.nextAll( name ).length === 0 ) {
                console.error( 'Could not find template node and/or node to insert the clone after' );
            }
        }
    };


    /**
     * Extracts all templates from the model and stores them in a Javascript object poperties as Jquery collections
     * @return {[type]} [description]
     */
    FormModel.prototype.extractTemplates = function() {
        var that = this;
        // in reverse document order to properly deal with nested repeat templates
        // for now we support both the official namespaced template and the hacked non-namespaced template attributes
        this.evaluate( '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]', 'nodes', null, null, true ).reverse().forEach( function( templateEl ) {
            var $template = $( templateEl );
            that.templates[ $template.getXPath( 'instance' ) ] = $template.removeAttr( 'template' ).removeAttr( 'jr:template' ).remove();
        } );
    };


    /**
     * Finds a template path that would contain the provided node path if that template exists in the form.
     *
     * @param  {string} nodePath the /path/to/template/node
     * @return {*}               the /path/to/template
     */
    FormModel.prototype.getTemplatePath = function( nodePath ) {
        var templateIndex,
            that = this;

        nodePath.split( '/' ).some( function( value, index, array ) {
            templateIndex = array.slice( 0, array.length - index ).join( '/' );
            return that.templates[ templateIndex ];
        } );

        return templateIndex || undefined;
    };

    /**
     * Initialization function that creates <repeat>able data nodes with the defaults from the template if no repeats have been created yet.
     * Strictly speaking creating the first repeat automatically is not "according to the spec" as the user should be asked first whether it
     * has any data for this question.
     * However, it seems usually always better to assume at least one 'repeat' (= 1 question). It doesn't make use of the Nodeset subclass (CHANGE?)
     *
     * See also: In JavaRosa, the documentation on the jr:template attribute.
     */
    FormModel.prototype.cloneAllTemplates = function() {
        var that = this;

        // for now we support both the official namespaced template and the hacked non-namespaced template attributes
        this.evaluate( '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]', 'nodes', null, null, true ).forEach( function( templateEl ) {
            var nodeName = templateEl.nodeName,
                selector = $( templateEl ).getXPath( 'instance' ),
                ancestorTemplateNodes = that.evaluate( 'ancestor::' + nodeName + '[@template] | ancestor::' + nodeName + '[@jr:template]', 'nodes', selector, 0, true );
            if ( ancestorTemplateNodes.length === 0 && $( templateEl ).siblings( nodeName ).length === 0 ) {
                $( templateEl ).clone().insertAfter( $( templateEl ) ).find( '*' ).addBack().removeAttr( 'template' ).removeAttr( 'jr:template' );
            }
        } );
    };

    /**
     * See Also:
     * Returns jQuery Data Object (obsolete?)
     * See also: <nodes.get()>, which is always (?) preferred except for debugging.
     *
     * @return {jQuery} JQuery Data Object
     */
    FormModel.prototype.get = function() {
        return this.$ || null;
    };

    /**
     *
     * @return {Element} data XML object (not sure if type is element actually)
     */
    FormModel.prototype.getXML = function() {
        return this.xml || null;
    };

    /**
     * Obtains a cleaned up string of the data instance
     *
     * @return {string}           XML string
     */
    FormModel.prototype.getStr = function() {
        var dataStr = ( new XMLSerializer() ).serializeToString( this.xml.querySelector( 'instance > *' ) || this.xml.documentElement, 'text/xml' );
        // remove tabs
        dataStr = dataStr.replace( /\t/g, '' );
        // restore default namespaces
        dataStr = dataStr.replace( /\s(data-)(xmlns\=("|')[^\s\>]+("|'))/g, ' $2' );
        return dataStr;
    };

    /**
     * There is a huge bug in JavaRosa that has resulted in the usage of incorrect formulae on nodes inside repeat nodes.
     * Those formulae use absolute paths when relative paths should have been used. See more here:
     * http://opendatakit.github.io/odk-xform-spec/#a-big-deviation-with-xforms
     *
     * Tools such as pyxform also build forms in this incorrect manner. See https://github.com/modilabs/pyxform/issues/91
     * It will take time to correct this so makeBugCompliant() aims to mimic the incorrect
     * behaviour by injecting the 1-based [position] of repeats into the XPath expressions. The resulting expression
     * will then be evaluated in a way users expect (as if the paths were relative) without having to mess up
     * the XPath Evaluator.
     *
     * E.g. '/data/rep_a/node_a' could become '/data/rep_a[2]/node_a' if the context is inside
     * the second rep_a repeat.
     *
     * This function should be removed as soon as JavaRosa (or maybe just pyxform) fixes the way those formulae
     * are created (or evaluated).
     *
     * @param  {string} expr        the XPath expression
     * @param  {string} selector    of the (context) node on which expression is evaluated
     * @param  {number} index       of the instance node with that selector
     * @return {string} modified    expression with injected positions (1-based!)
     */
    FormModel.prototype.makeBugCompliant = function( expr, selector, index ) {
        var i, parentSelector, parentIndex, $target, $node, nodeName, $siblings, $parents;
        $target = this.node( selector, index ).get();
        // add() sorts the resulting collection in document order
        $parents = $target.parents().add( $target );
        // traverse collection in reverse document order
        for ( i = $parents.length - 1; i >= 0; i-- ) {
            $node = $parents.eq( i );
            // escape any dots in the node name
            nodeName = $node.prop( 'nodeName' ).replace( /\./g, '\\.' );
            $siblings = $node.siblings( nodeName ).not( '[template]' );
            // if the node is a repeat node that has been cloned at least once (i.e. if it has siblings with the same nodeName)
            if ( nodeName.toLowerCase() !== 'instance' && nodeName.toLowerCase() !== 'model' && $siblings.length > 0 ) {
                parentSelector = $node.getXPath( 'instance' );
                parentIndex = $siblings.add( $node ).index( $node );
                // Add position to segments that do not have an XPath predicate. This is where it gets very messy.
                if ( !new RegExp( parentSelector + '\\[' ).test( expr ) ) {
                    expr = expr.replace( new RegExp( parentSelector, 'g' ), parentSelector + '[' + ( parentIndex + 1 ) + ']' );
                }
            }
        }
        return expr;
    };

    FormModel.prototype.nsResolver = {

        lookupNamespaceURI: function( prefix ) {
            var namespaces = {
                'jr': 'http://openrosa.org/javarosa',
                'xsd': 'http://www.w3.org/2001/XMLSchema',
                'orx': 'http://openrosa.org/xforms/', // CommCare uses 'http://openrosa.org/jr/xforms'
                'cc': 'http://commcarehq.org/xforms'
            };

            return namespaces[ prefix ] || null;
        }
    };

    /**
     * Shift root to first instance for all absolute paths not starting with /model
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.shiftRoot = function( expr ) {
        if ( this.hasInstance ) {
            expr = expr.replace( /^(\/(?!model\/)[^\/][^\/\s]*\/)/g, '/model/instance[1]$1' );
            expr = expr.replace( /([^a-zA-Z0-9\.\]\)\/\*_-])(\/(?!model\/)[^\/][^\/\s]*\/)/g, '$1/model/instance[1]$2' );
        }
        return expr;
    };

    /** 
     * Replace instance('id') with an absolute path
     * Doing this here instead of adding an instance() function to the XPath evaluator, means we can keep using
     * the much faster native evaluator in most cases!
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.replaceInstanceFn = function( expr ) {
        var prefix;
        var that = this;

        // TODO: would be more consistent to use utls.parseFunctionFromExpression() and utils.stripQuotes
        return expr.replace( this.INSTANCE, function( match, id ) {
            prefix = '/model/instance[@id="' + id + '"]';
            // check if referred instance exists in model
            if ( that.evaluate( prefix, 'nodes', null, null, true ).length ) {
                return prefix;
            } else {
                throw new FormLogicError( 'instance "' + id + '" does not exist in model' );
            }
        } );
    };

    /** 
     * Replaces current()/ with '' or '/' because Enketo does not (yet) change the context in an itemset.
     * Doing this here instead of adding a current() function to the XPath evaluator, means we can keep using
     * the much faster native evaluator in most cases!
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.replaceCurrentFn = function( expr ) {
        expr = expr.replace( /current\(\)\/\./g, '.' );
        expr = expr.replace( /current\(\)/g, '' );
        return expr;
    };

    /**
     * Replaces indexed-repeat(node, path, position, path, position, etc) substrings by converting them
     * to their native XPath equivalents using [position() = x] predicates
     *
     * @param  {string} expr the XPath expression
     * @return {string}      converted XPath expression
     */
    FormModel.prototype.replaceIndexedRepeatFn = function( expr, selector, index ) {
        var that = this;
        var indexedRepeats = utils.parseFunctionFromExpression( expr, 'indexed-repeat' );

        if ( !indexedRepeats.length ) {
            return expr;
        }

        indexedRepeats.forEach( function( indexedRepeat ) {
            var i, positionedPath;
            var position;
            var params = indexedRepeat[ 1 ];

            if ( params.length % 2 === 1 ) {

                positionedPath = params[ 0 ];

                for ( i = params.length - 1; i > 1; i -= 2 ) {
                    // The position will become an XPath predicate. The context for an XPath predicate, is not the same
                    // as the context for the complete expression, so we have to evaluate the position separately. Otherwise 
                    // relative paths would break.
                    position = !isNaN( params[ i ] ) ? params[ i ] : that.evaluate( params[ i ], 'number', selector, index, true );
                    positionedPath = positionedPath.replace( params[ i - 1 ], params[ i - 1 ] + '[position() = ' + position + ']' );
                }

                expr = expr.replace( indexedRepeat[ 0 ], positionedPath );

            } else {
                throw new FormLogicError( 'indexed repeat with incorrect number of parameters found: ' + indexedRepeat[ 0 ] );
            }
        } );

        return expr;
    };

    FormModel.prototype.replacePullDataFn = function( expr, selector, index ) {
        var that = this;
        var pullDatas = utils.parseFunctionFromExpression( expr, 'pulldata' );

        if ( !pullDatas.length ) {
            return expr;
        }

        pullDatas.forEach( function( pullData ) {
            var searchValue;
            var searchXPath;
            var params = pullData[ 1 ];

            if ( params.length === 4 ) {

                // strip quotes
                params[ 1 ] = utils.stripQuotes( params[ 1 ] );
                params[ 2 ] = utils.stripQuotes( params[ 2 ] );

                // TODO: the 2nd and 3rd parameter could probably also be expressions.

                // The 4th argument will become an XPath predicate. The context for an XPath predicate, is not the same
                // as the context for the complete expression, so we have to evaluate the position separately. Otherwise
                // relative paths would break.
                searchValue = that.evaluate( params[ 3 ], 'string', selector, index, true );
                searchValue = searchValue === '' || isNaN( searchValue ) ? '\'' + searchValue + '\'' : searchValue;
                searchXPath = 'instance(' + params[ 0 ] + ')/root/item[' + params[ 2 ] + ' = ' + searchValue + ']/' + params[ 1 ];

                expr = expr.replace( pullData[ 0 ], searchXPath );

            } else {
                throw new FormLogicError( 'pulldata with incorrect number of parameters found: ' + pullData[ 0 ] );
            }
        } );

        return expr;
    };

    /**
     * Evaluates an XPath Expression using XPathJS_javarosa (not native XPath 1.0 evaluator)
     *
     * This function does not seem to work properly for nodeset resulttypes otherwise:
     * muliple nodes can be accessed by returned node.snapshotItem(i)(.textContent)
     * a single node can be accessed by returned node(.textContent)
     *
     * @param  { string }     expr        the expression to evaluate
     * @param  { string= }    resTypeStr  boolean, string, number, node, nodes (best to always supply this)
     * @param  { string= }    selector    jQuery selector which will be use to provide the context to the evaluator
     * @param  { number= }    index       0-based index of selector in document
     * @param  { boolean= }   tryNative   whether an attempt to try the Native Evaluator is safe (ie. whether it is
     *                                    certain that there are no date comparisons)
     * @return { ?(number|string|boolean|Array<element>) } the result
     */
    FormModel.prototype.evaluate = function( expr, resTypeStr, selector, index, tryNative ) {
        var j, context, doc, resTypeNum, resultTypes, result, $collection, response, repeats, cacheKey, original, cacheable;

        // console.debug( 'evaluating expr: ' + expr + ' with context selector: ' + selector + ', 0-based index: ' +
        //    index + ' and result type: ' + resTypeStr );
        original = expr;
        tryNative = tryNative || false;
        resTypeStr = resTypeStr || 'any';
        index = index || 0;
        doc = this.xml;
        repeats = null;

        // path corrections for repeated nodes: http://opendatakit.github.io/odk-xform-spec/#a-big-deviation-with-xforms
        if ( selector ) {
            $collection = this.node( selector ).get();
            repeats = $collection.length;
            context = $collection.eq( index )[ 0 ];
        } else {
            // either the first data child of the first instance or the first child (for loaded instances without a model)
            context = this.rootElement;
        }

        // cache key includes the number of repeated context nodes, 
        // to force a new cache item if the number of repeated changes to > 0
        // TODO: these cache keys can get quite large. Would it be beneficial to get the md5 of the key?
        cacheKey = [ expr, selector, index, repeats ].join( '|' );

        // These functions need to come before makeBugCompliant.
        // An expression transformation with indexed-repeat or pulldata cannot be cached because in 
        // "indexed-repeat(node, repeat nodeset, index)" the index parameter could be an expression.
        expr = this.replaceIndexedRepeatFn( expr, selector, index );
        expr = this.replacePullDataFn( expr, selector, index );
        cacheable = ( original === expr );

        // if no cached conversion exists
        if ( !this.convertedExpressions[ cacheKey ] ) {
            expr = expr;
            expr = expr.trim();
            expr = this.shiftRoot( expr );
            expr = this.replaceInstanceFn( expr );
            expr = this.replaceCurrentFn( expr );
            if ( repeats && repeats > 1 ) {
                expr = this.makeBugCompliant( expr, selector, index );
            }
            // decode
            expr = expr.replace( /&lt;/g, '<' );
            expr = expr.replace( /&gt;/g, '>' );
            expr = expr.replace( /&quot;/g, '"' );
            if ( cacheable ) {
                this.convertedExpressions[ cacheKey ] = expr;
            }
        } else {
            expr = this.convertedExpressions[ cacheKey ];
        }

        resultTypes = {
            0: [ 'any', 'ANY_TYPE' ],
            1: [ 'number', 'NUMBER_TYPE', 'numberValue' ],
            2: [ 'string', 'STRING_TYPE', 'stringValue' ],
            3: [ 'boolean', 'BOOLEAN_TYPE', 'booleanValue' ],
            7: [ 'nodes', 'ORDERED_NODE_SNAPSHOT_TYPE' ],
            9: [ 'node', 'FIRST_ORDERED_NODE_TYPE', 'singleNodeValue' ]
        };

        // translate typeStr to number according to DOM level 3 XPath constants
        for ( resTypeNum in resultTypes ) {
            if ( resultTypes.hasOwnProperty( resTypeNum ) ) {
                resTypeNum = Number( resTypeNum );
                if ( resultTypes[ resTypeNum ][ 0 ] === resTypeStr ) {
                    break;
                } else {
                    resTypeNum = 0;
                }
            }
        }

        // try native to see if that works... (will not work if the expr contains custom OpenRosa functions)
        if ( tryNative && typeof doc.evaluate !== 'undefined' && !this.OPENROSA.test( expr ) ) {
            try {
                // console.log( 'trying the blazing fast native XPath Evaluator for', expr, index );
                result = doc.evaluate( expr, context, this.nsResolver, resTypeNum, null );
            } catch ( e ) {
                console.log( '%cWell native XPath evaluation did not work... No worries, worth a shot, the expression probably ' +
                    'contained unknown OpenRosa functions or errors:', 'color:orange', expr );
            }
        }

        // if that didn't work, try the slow XPathJS evaluator 
        if ( !result ) {
            try {
                if ( typeof doc.jsEvaluate === 'undefined' ) {
                    this.bindJsEvaluator();
                }
                // console.log( 'trying the slow enketo-xpathjs "openrosa" evaluator for', expr, index );
                result = doc.jsEvaluate( expr, context, this.nsResolver, resTypeNum, null );
            } catch ( e ) {
                throw new FormLogicError( 'Could not evaluate: ' + expr + ', message: ' + e.message );
            }
        }

        // get desired value from the result object
        if ( result ) {
            // for type = any, see if a valid string, number or boolean is returned
            if ( resTypeNum === 0 ) {
                for ( resTypeNum in resultTypes ) {
                    if ( resultTypes.hasOwnProperty( resTypeNum ) ) {
                        resTypeNum = Number( resTypeNum );
                        if ( resTypeNum === Number( result.resultType ) && resTypeNum > 0 && resTypeNum < 4 ) {
                            response = result[ resultTypes[ resTypeNum ][ 2 ] ];
                            break;
                        }
                    }
                }
                console.error( 'Expression: ' + expr + ' did not return any boolean, string or number value as expected' );
            } else if ( resTypeNum === 7 ) {
                // response is an array of Elements
                response = [];
                for ( j = 0; j < result.snapshotLength; j++ ) {
                    response.push( result.snapshotItem( j ) );
                }
            } else {
                response = result[ resultTypes[ resTypeNum ][ 2 ] ];
            }
            return response;
        }
    };

    /**
     * Class dealing with nodes and nodesets of the XML instance
     *
     * @constructor
     * @param {string=} selector simpleXPath or jQuery selectedor
     * @param {number=} index    the index of the target node with that selector
     * @param {?{onlyLeaf: boolean, noEmpty: boolean}=} filter   filter object for the result nodeset
     * @param { FormModel } model instance of FormModel
     */
    Nodeset = function( selector, index, filter, model ) {
        var defaultSelector = model.hasInstance ? '/model/instance[1]//*' : '//*';

        this.model = model;
        this.originalSelector = selector;
        this.selector = ( typeof selector === 'string' && selector.length > 0 ) ? selector : defaultSelector;
        filter = ( typeof filter !== 'undefined' && filter !== null ) ? filter : {};
        this.filter = filter;
        this.filter.onlyLeaf = ( typeof filter.onlyLeaf !== 'undefined' ) ? filter.onlyLeaf : false;
        this.filter.noEmpty = ( typeof filter.noEmpty !== 'undefined' ) ? filter.noEmpty : false;
        this.index = index;
    };

    /**
     * Privileged method to find data nodes filtered by a jQuery or XPath selector and additional filter properties
     * Without parameters it returns a collection of all data nodes excluding template nodes and their children. Therefore, most
     * queries will not require filter properties. This function handles all (?) data queries in the application.
     *
     * @return {jQuery} jQuery-wrapped filtered instance nodes that match the selector and index
     */
    Nodeset.prototype.get = function() {
        var $nodes, /** @type {string} */ val;

        // cache evaluation result
        if ( !this.nodes ) {
            this.nodes = this.model.evaluate( this.selector, 'nodes', null, null, true );
        }

        // noEmpty automatically excludes non-leaf nodes
        if ( this.filter.noEmpty === true ) {
            $nodes = $( this.nodes ).filter( function() {
                var $node = $( this );
                val = $node.text();
                return $node.children().length === 0 && val.trim().length > 0;
            } );
        }
        // this may still contain empty leaf nodes
        else if ( this.filter.onlyLeaf === true ) {
            $nodes = $( this.nodes ).filter( function() {
                return $( this ).children().length === 0;
            } );
        } else {
            $nodes = $( this.nodes );
        }

        return ( typeof this.index !== 'undefined' && this.index !== null ) ? $nodes.eq( this.index ) : $nodes;
    };

    /**
     * Sets the index of the Nodeset instance
     *
     * @param {=number?} index The 0-based index
     */
    Nodeset.prototype.setIndex = function( index ) {
        this.index = index;
    };

    /**
     * Sets data node values.
     *
     * @param {(string|Array.<string>)=} newVals    The new value of the node.
     * @param {?string=} expr  XPath expression to validate the node.
     * @param {?string=} xmlDataType XML data type of the node
     *
     * @return {?boolean} null is returned when the node is not found or multiple nodes were selected
     */
    Nodeset.prototype.setVal = function( newVals, expr, xmlDataType ) {
        var $target, curVal, /**@type {string}*/ newVal, success, updated;

        curVal = this.getVal()[ 0 ];

        if ( typeof newVals !== 'undefined' && newVals !== null ) {
            newVal = ( $.isArray( newVals ) ) ? newVals.join( ' ' ) : newVals.toString();
        } else {
            newVal = '';
        }

        newVal = this.convert( newVal, xmlDataType );

        $target = this.get();

        if ( $target.length === 1 && $.trim( newVal.toString() ) !== $.trim( curVal.toString() ) ) { //|| (target.length > 1 && typeof this.index == 'undefined') ){
            //first change the value so that it can be evaluated in XPath (validated)
            $target.text( newVal );
            //then return validation result
            success = this.validate( expr, xmlDataType );
            updated = this.getClosestRepeat();
            updated.nodes = [ $target.prop( 'nodeName' ) ];
            this.model.$.trigger( 'dataupdate', updated );
            //add type="file" attribute for file references
            if ( xmlDataType === 'binary' ) {
                if ( newVal.length > 0 ) {
                    $target.attr( 'type', 'file' );
                } else {
                    $target.removeAttr( 'type' );
                }
            }

            return success;
        }
        if ( $target.length > 1 ) {
            console.error( 'nodeset.setVal expected nodeset with one node, but received multiple' );
            return null;
        }
        if ( $target.length === 0 ) {
            console.log( 'Data node: ' + this.selector + ' with null-based index: ' + this.index + ' not found. Ignored.' );
            return null;
        }
        //always validate if the new value is not empty, even if value didn't change (see validateAll() function)
        //return (newVal.length > 0 && validateAll) ? this.validate(expr, xmlDataType) : true;
        return null;
    };


    /**
     * Obtains the data value if a JQuery or XPath selector for a single node is provided.
     *
     * @return {Array<string|number|boolean>} [description]
     */
    Nodeset.prototype.getVal = function() {
        var vals = [];
        this.get().each( function() {
            vals.push( $( this ).text() );
        } );
        return vals;
    };

    /**
     * Determines the index of a repeated node amongst all nodes with the same XPath selector
     *
     * @param  {} $node optional jquery element
     * @return {number}       [description]
     */
    Nodeset.prototype.determineIndex = function( $node ) {
        var nodeName, path, $family;

        $node = $node || this.get();

        if ( $node.length === 1 ) {
            nodeName = $node.prop( 'nodeName' );
            path = $node.getXPath( 'instance' );
            $family = this.model.$.find( nodeName ).filter( function() {
                return path === $( this ).getXPath( 'instance' );
            } );
            return ( $family.length === 1 ) ? null : $family.index( $node );
        } else {
            console.error( 'no node, or multiple nodes, provided to nodeset.determineIndex' );
            return -1;
        }
    };

    // if repeats have not been cloned yet, they are not considered a repeat by this function
    Nodeset.prototype.getClosestRepeat = function() {
        var $node = this.get(),
            nodeName = $node.prop( 'nodeName' );

        while ( $node.siblings( nodeName ).length === 0 && nodeName !== 'instance' ) {
            $node = $node.parent();
            nodeName = $node.prop( 'nodeName' );
        }

        return ( nodeName === 'instance' ) ? {} : {
            repeatPath: $node.getXPath( 'instance' ),
            repeatIndex: this.determineIndex( $node )
        };
    };

    /**
     * Remove a repeat node
     */
    Nodeset.prototype.remove = function() {
        var $dataNode, allRemovedNodeNames, $this, repeatPath, repeatIndex;

        $dataNode = this.get();

        if ( $dataNode.length > 0 ) {

            allRemovedNodeNames = [ $dataNode.prop( 'nodeName' ) ];

            $dataNode.find( '*' ).each( function() {
                $this = $( this );
                allRemovedNodeNames.push( $this.prop( 'nodeName' ) );
            } );

            repeatPath = $dataNode.getXPath( 'instance' );
            repeatIndex = this.determineIndex( $dataNode );

            $dataNode.remove();
            this.nodes = null;

            this.model.$.trigger( 'dataupdate', {
                updatedNodes: allRemovedNodeNames,
                repeatPath: repeatPath,
                repeatIndex: repeatIndex
            } );
        } else {
            console.error( 'could not find node ' + this.selector + ' with index ' + this.index + ' to remove ' );
        }
    };

    /**
     * Convert a value to a specified data type( though always stringified )
     * @param  {?string=} x           value to convert
     * @param  {?string=} xmlDataType XML data type
     * @return {string}               string representation of converted value
     */
    Nodeset.prototype.convert = function( x, xmlDataType ) {
        if ( x.toString() === '' ) {
            return x;
        }
        if ( typeof xmlDataType !== 'undefined' && xmlDataType !== null &&
            typeof types[ xmlDataType.toLowerCase() ] !== 'undefined' &&
            typeof types[ xmlDataType.toLowerCase() ].convert !== 'undefined' ) {
            return types[ xmlDataType.toLowerCase() ].convert( x );
        }
        return x;
    };

    /**
     * Validate a value with an XPath Expression and /or xml data type
     * @param  {?string=} expr        XPath expression
     * @param  {?string=} xmlDataType XML datatype
     * @return {boolean}
     */
    Nodeset.prototype.validate = function( expr, xmlDataType ) {
        var typeValid, exprValid, value;

        if ( !xmlDataType || typeof types[ xmlDataType.toLowerCase() ] === 'undefined' ) {
            xmlDataType = 'string';
        }

        // This one weird trick results in a small validation performance increase.
        // Do not obtain *the value* if the expr is empty and data type is string, select, select1, binary knowing that this will always return true.
        if ( !expr && ( xmlDataType === 'string' || xmlDataType === 'select' || xmlDataType === 'select1' || xmlDataType === 'binary' ) ) {
            return true;
        }

        value = this.getVal()[ 0 ];

        if ( value.toString() === '' ) {
            return true;
        }

        typeValid = types[ xmlDataType.toLowerCase() ].validate( value );
        exprValid = ( typeof expr !== 'undefined' && expr !== null && expr.length > 0 ) ? this.model.evaluate( expr, 'boolean', this.originalSelector, this.index ) : true;

        return ( typeValid && exprValid );
    };

    /**
     * @namespace types
     * @type {Object}
     */
    types = {
        'string': {
            //max length of type string is 255 chars.Convert( truncate ) silently ?
            validate: function() {
                return true;
            }
        },
        'select': {
            validate: function() {
                return true;
            }
        },
        'select1': {
            validate: function() {
                return true;
            }
        },
        'decimal': {
            validate: function( x ) {
                return ( !isNaN( x - 0 ) && x !== null ) ? true : false;
            },
            convert: function( x ) {
                // deals with Java issue and possible db issues:
                // https://github.com/MartijnR/enketo-core/issues/40
                return ( x === 'NaN' ) ? '' : x;
            }
        },
        'int': {
            validate: function( x ) {
                return ( !isNaN( x - 0 ) && x !== null && Math.round( x ).toString() === x.toString() ) ? true : false;
            },
            convert: function( x ) {
                // deals with Java issue and possible db issues:
                // https://github.com/MartijnR/enketo-core/issues/40
                return ( x === 'NaN' ) ? '' : x;
            }
        },
        'date': {
            validate: function( x ) {
                var pattern = ( /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/ ),
                    segments = pattern.exec( x );

                return ( segments && segments.length === 6 ) ? ( new Date( Number( segments[ 1 ] ), Number( segments[ 3 ] ) - 1, Number( segments[ 5 ] ) ).toString() !== 'Invalid Date' ) : false;
            },
            convert: function( x ) {
                var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/,
                    segments = pattern.exec( x ),
                    date = new Date( x );
                if ( new Date( x ).toString() === 'Invalid Date' ) {
                    //this code is really only meant for the Rhino and PhantomJS engines, in browsers it may never be reached
                    if ( segments && Number( segments[ 1 ] ) > 0 && Number( segments[ 3 ] ) >= 0 && Number( segments[ 3 ] ) < 12 && Number( segments[ 5 ] ) < 32 ) {
                        date = new Date( Number( segments[ 1 ] ), ( Number( segments[ 3 ] ) - 1 ), Number( segments[ 5 ] ) );
                    }
                }
                //date.setUTCHours(0,0,0,0);
                //return date.toUTCString();//.getUTCFullYear(), datetime.getUTCMonth(), datetime.getUTCDate());
                return date.getUTCFullYear().toString().pad( 4 ) + '-' + ( date.getUTCMonth() + 1 ).toString().pad( 2 ) + '-' + date.getUTCDate().toString().pad( 2 );
            }
        },
        'datetime': {
            validate: function( x ) {
                //the second part builds in some tolerance for slightly-off dates provides as defaults (e.g.: 2013-05-31T07:00-02)
                return ( new Date( x.toString() ).toString() !== 'Invalid Date' || new Date( this.convert( x.toString() ) ).toString() !== 'Invalid Date' );
            },
            convert: function( x ) {
                var date, // timezone, segments, dateS, timeS,
                    patternCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2}):([0-9]{2})$/,
                    patternAlmostCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2})$/;
                /* 
                 * if the pattern is right, or almost right but needs a small correction for JavaScript to handle it,
                 * do not risk changing the time zone by calling toISOLocalString()
                 */
                if ( new Date( x ).toString() !== 'Invalid Date' && patternCorrect.test( x ) ) {
                    return x;
                }
                if ( new Date( x ).toString() === 'Invalid Date' && patternAlmostCorrect.test( x ) ) {
                    return x + ':00';
                }
                date = new Date( x );
                return ( date.toString() !== 'Invalid Date' ) ? date.toISOLocalString() : date.toString();
            }
        },
        'time': {
            validate: function( x ) {
                var date = new Date(),
                    segments = x.toString().split( ':' );
                if ( segments.length < 2 ) {
                    return false;
                }
                segments[ 2 ] = ( segments[ 2 ] ) ? Number( segments[ 2 ].toString().split( '.' )[ 0 ] ) : 0;

                return ( segments[ 0 ] < 24 && segments[ 0 ] >= 0 && segments[ 1 ] < 60 && segments[ 1 ] >= 0 && segments[ 2 ] < 60 && segments[ 2 ] >= 0 && date.toString() !== 'Invalid Date' );
            },
            convert: function( x ) {
                var segments = x.toString().split( ':' );
                $.each( segments, function( i, val ) {
                    segments[ i ] = val.toString().pad( 2 );
                } );
                return segments.join( ':' );
            }
        },
        'barcode': {
            validate: function() {
                return true;
            }
        },
        'geopoint': {
            validate: function( x ) {
                var coords = x.toString().trim().split( ' ' );
                return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                    ( coords[ 1 ] !== '' && coords[ 1 ] >= -180 && coords[ 1 ] <= 180 ) &&
                    ( typeof coords[ 2 ] === 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                    ( typeof coords[ 3 ] === 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) );
            },
            convert: function( x ) {
                return $.trim( x.toString() );
            }
        },
        'geotrace': {
            validate: function( x ) {
                var geopoints = x.toString().split( ';' );
                return geopoints.length >= 2 && geopoints.every( function( geopoint ) {
                    return types.geopoint.validate( geopoint );
                } );
            },
            convert: function( x ) {
                return x.toString().trim();
            }
        },
        'geoshape': {
            validate: function( x ) {
                console.debug( 'validating geoshape, this: ', this );
                var geopoints = x.toString().split( ';' );
                return geopoints.length >= 4 && ( geopoints[ 0 ] === geopoints[ geopoints.length - 1 ] ) && geopoints.every( function( geopoint ) {
                    return types.geopoint.validate( geopoint );
                } );
            },
            convert: function( x ) {
                return x.toString().trim();
            }
        },
        'binary': {
            validate: function() {
                return true;
            }
        }
    };

    // Expose types to facilitate extending with custom types
    FormModel.prototype.types = types;

    module.exports = FormModel;
} );
