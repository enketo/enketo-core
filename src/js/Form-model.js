'use strict';


var MergeXML = require( 'mergexml/mergexml' );
var utils = require( './utils' );
var $ = require( 'jquery' );
var Promise = require( 'lie' );
var FormLogicError = require( './Form-logic-error' );
var config = require( 'enketo-config' );
var types = require( './types' );
var REPEAT_COMMENT_PREFIX = 'repeat:/';
var INSTANCE = /instance\([\'|\"]([^\/:\s]+)[\'|\"]\)/g;
var OPENROSA = /(decimal-date-time\(|pow\(|indexed-repeat\(|format-date\(|coalesce\(|join\(|max\(|min\(|random\(|substr\(|int\(|uuid\(|regex\(|now\(|today\(|date\(|if\(|boolean-from-string\(|checklist\(|selected\(|selected-at\(|round\(|area\(|position\([^\)])/;
var OPENROSA_XFORMS_NS = 'http://openrosa.org/xforms';
var JAVAROSA_XFORMS_NS = 'http://openrosa.org/javarosa';
var ENKETO_XFORMS_NS = 'http://enketo.org/xforms';
require( './plugins' );
require( './extend' );
var FormModel;
var Nodeset;

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

    this.$events = $( '<div/>' );
    this.convertedExpressions = {};
    this.templates = {};
    this.loadErrors = [];

    this.data = data;
    this.options = options;
    this.namespaces = {};
};

/**
 * Getter and setter functions
 * @type {Object}
 */
FormModel.prototype = {
    get version() {
        return this.evaluate( '/node()/@version', 'string', null, null, true );
    },
    /**
     * Gets the instance ID
     *
     * @return {string} instanceID
     */
    get instanceID() {
        return this.getMetaNode( 'instanceID' ).getVal()[ 0 ];
    },
    /**
     * Gets the deprecated ID
     *
     * @return {string} deprecatedID
     */
    get deprecatedID() {
        return this.getMetaNode( 'deprecatedID' ).getVal()[ 0 ] || '';
    },
    /**
     * Gets the instance Name
     *
     * @return {string} instanceID
     */
    get instanceName() {
        return this.getMetaNode( 'instanceName' ).getVal()[ 0 ];
    },
};

/**
 * Initializes FormModel
 */
FormModel.prototype.init = function() {
    var id;
    var i;
    var instanceDoc;
    var secondaryInstanceChildren;
    var that = this;

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
            instanceDoc = that.getSecondaryInstance( instance.id );
            // remove any existing content that is just an XLSForm hack to pass ODK Validate
            secondaryInstanceChildren = instanceDoc.childNodes;
            for ( i = secondaryInstanceChildren.length - 1; i >= 0; i-- ) {
                instanceDoc.removeChild( secondaryInstanceChildren[ i ] );
            }
            instanceDoc.appendChild( $.parseXML( instance.xmlStr ).firstChild );
        } );

        // TODO: in the future, we should search for jr://instance/session and 
        // populate that one. This is just moving in that direction to implement preloads.
        this.createSession( '__session', this.data.session );
    } catch ( e ) {
        console.error( 'parseXML error' );
        this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
    }

    // Initialize/process the model
    if ( this.xml ) {
        try {
            this.$ = $( this.xml );
            this.hasInstance = !!this.xml.querySelector( 'model > instance' ) || false;
            this.rootElement = this.xml.querySelector( 'instance > *' ) || this.xml.documentElement;
            this.setNamespaces();

            // Check if instanceID is present
            if ( !this.getMetaNode( 'instanceID' ).get().get( 0 ) ) {
                that.loadErrors.push( 'Invalid primary instance. Missing instanceID node.' );
            }

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
            }
            // Set the two most important meta fields before any field 'dataupdate' event fires.
            this.setInstanceIdAndDeprecatedId();
        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
        }
    }

    return this.loadErrors;
};

FormModel.prototype.createSession = function( id, sessObj ) {
    var instance;
    var session;
    var model = this.xml.querySelector( 'model' );
    var fixedProps = [ 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid' ];
    if ( !model ) {
        return;
    }

    sessObj = ( typeof sessObj === 'object' ) ? sessObj : {};
    instance = model.querySelector( 'instance[id="' + id + '"]' );

    if ( !instance ) {
        instance = $.parseXML( '<instance id="' + id + '"/>' ).documentElement;
        this.xml.adoptNode( instance );
        model.appendChild( instance );
    }

    // fixed: /sesssion/context properties
    fixedProps.forEach( function( prop ) {
        sessObj[ prop ] = sessObj[ prop ] || utils.readCookie( '__enketo_meta_' + prop ) || prop + ' not found';
    } );

    session = $.parseXML( '<session><context>' +
        fixedProps.map( function( prop ) {
            return '<' + prop + '>' + sessObj[ prop ] + '</' + prop + '>';
        } ) +
        '</context></session>' ).documentElement;

    // TODO: custom properties could be added to /session/user/data or to /session/data

    this.xml.adoptNode( session );
    instance.appendChild( session );
};

/**
 * For some unknown reason we cannot use doc.getElementById(id) or doc.querySelector('#'+id)
 * in IE11. This function is a replacement for this specifically to find a secondary instance.
 * 
 * @param  {string} id [description]
 * @return {Element}    [description]
 */
FormModel.prototype.getSecondaryInstance = function( id ) {
    var instanceEl;

    [].slice.call( this.xml.querySelectorAll( 'model > instance' ) ).some( function( el ) {
        var idAttr = el.getAttribute( 'id' );
        if ( idAttr === id ) {
            instanceEl = el;
            return true;
        } else {
            return false;
        }
    } );

    return instanceEl;
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
 * Alternative adoptNode on IE11 (http://stackoverflow.com/questions/1811116/ie-support-for-dom-importnode)
 */
FormModel.prototype.importNode = function( node, allChildren ) {
    var i;
    var il;
    switch ( node.nodeType ) {
        case document.ELEMENT_NODE:
            var newNode = document.createElementNS( node.namespaceURI, node.nodeName );
            if ( node.attributes && node.attributes.length > 0 ) {
                for ( i = 0, il = node.attributes.length; i < il; i++ ) {
                    var attr = node.attributes[ i ];
                    if ( attr.namespaceURI ) {
                        newNode.setAttributeNS( attr.namespaceURI, attr.nodeName, node.getAttributeNS( attr.namespaceURI, attr.localName ) );
                    } else {
                        newNode.setAttribute( attr.nodeName, node.getAttribute( attr.nodeName ) );
                    }
                }
            }
            if ( allChildren && node.childNodes && node.childNodes.length > 0 ) {
                for ( i = 0, il = node.childNodes.length; i < il; i++ ) {
                    newNode.appendChild( this.importNode( node.childNodes[ i ], allChildren ) );
                }
            }
            return newNode;
        case document.TEXT_NODE:
        case document.CDATA_SECTION_NODE:
        case document.COMMENT_NODE:
            return document.createTextNode( node.nodeValue );
    }
};

/**
 * Merges an XML instance string into the XML Model
 *
 * @param  {string} recordStr The XML record as string
 * @param  {string} modelDoc  The XML model to merge the record into
 */
FormModel.prototype.mergeXml = function( recordStr ) {
    var modelInstanceChildStr;
    var merger;
    var modelInstanceEl;
    var modelInstanceChildEl;
    var mergeResultDoc;
    var that = this;
    var templateEls;
    var record;
    var $record;

    if ( !recordStr ) {
        return;
    }

    modelInstanceEl = this.xml.querySelector( 'instance' );
    modelInstanceChildEl = this.xml.querySelector( 'instance > *' ); // do not use firstChild as it may find a #textNode

    if ( !modelInstanceChildEl ) {
        throw new Error( 'Model is corrupt. It does not contain a childnode of instance' );
    }

    /** 
     * A Namespace merge problem occurs when ODK decides to invent a new namespace for a submission
     * that is different from the XForm model namespace... So we just remove this nonsense.
     */
    recordStr = recordStr.replace( /\s(xmlns\=("|')[^\s\>]+("|'))/g, '' );
    /**
     * Comments aren't merging in document order (which would be impossible also). 
     * This may mess up repeat functionality, so until we actually need
     * comments, we simply remove them (multiline comments are probably not removed, but we don't care about them).
     */
    recordStr = recordStr.replace( /<!--[^>]*-->/g, '' );
    record = $.parseXML( recordStr );
    $record = $( record );

    /**
     * Normally records will not contain the special "jr:template" attribute. However, we should still be able to deal with
     * this if they do, including the old hacked non-namespaced "template" attribute. 
     * https://github.com/enketo/enketo-core/issues/376
     * 
     * The solution if these are found is to delete the node.
     * 
     * Since the record is not a FormModel instance we revert to a very aggressive querySelectorAll that selects all 
     * nodes with a template attribute name IN ANY NAMESPACE.
     */

    templateEls = record.querySelectorAll( '[*|template]' );

    for ( var i = 0; i < templateEls.length; i++ ) {
        // IE11 has no remove method, so we use jQuery
        $( templateEls[ i ] ).remove();
    }

    /**
     * To comply with quirky behaviour of repeats in XForms, we manually create the correct number of repeat instances
     * before merging. This resolves these two issues:
     *  a) Multiple repeat instances in record are added out of order when merged into a record that contains fewer 
     *     repeat instances, see https://github.com/kobotoolbox/enketo-express/issues/223
     *  b) If a repeat node is missing from a repeat instance (e.g. the 2nd) in a record, and that repeat instance is not 
     *     in the model, that node will be missing in the result.
     */
    $record.find( '*' ).each( function() {
        var node = this;
        var repeatPath;
        var positionedPath;
        try {
            if ( that.getRepeatIndex( node ) > 0 ) {
                repeatPath = that.getXPath( node, 'instance', false );
                positionedPath = that.getXPath( node, 'instance', true );
                if ( !that.evaluate( positionedPath, 'node', null, null, true ) ) {
                    if ( positionedPath.split( '[' ).length > 2 ) {
                        // TODO: nested, determine repeatSeriesIndex, although I cannot seem to get it to fail
                    } else {
                        that.cloneRepeat( repeatPath, 0, true );
                    }
                }
            }
        } catch ( e ) {
            console.log( 'Ignored error:', e );
        }
    } );

    /** 
     * Any default values in the model, may have been emptied in the record.
     * MergeXML will keep those default values, which would be bad, so we manually clear defaults before merging.
     */
    // first find all empty leaf nodes in record
    $record.find( '*' ).filter( function() {
        var node = this;
        var val = node.textContent;
        return node.childNodes.length === 0 && val.trim().length === 0;
    } ).each( function() {
        var path = that.getXPath( this, 'instance', true );
        // find the corresponding node in the model, and set value to empty
        that.node( path, 0 ).setVal( '' );
    } );

    merger = new MergeXML( {
        join: false
    } );

    modelInstanceChildStr = ( new XMLSerializer() ).serializeToString( modelInstanceChildEl );
    recordStr = ( new XMLSerializer() ).serializeToString( record );

    // first the model, to preserve DOM order of that of the default instance
    merger.AddSource( modelInstanceChildStr );
    // then merge the record into the model
    merger.AddSource( recordStr );

    if ( merger.error.code ) {
        throw new Error( merger.error.text );
    }

    /**
     * Beware: merge.Get(0) returns an ActiveXObject in IE11. We turn this 
     * into a proper XML document by parsing the XML string instead.
     */
    mergeResultDoc = $.parseXML( merger.Get( 1 ) );

    // remove the primary instance  childnode from the original model
    this.xml.querySelector( 'instance' ).removeChild( modelInstanceChildEl );
    // checking if IE
    if ( global.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {
        // IE not support adoptNode
        modelInstanceChildEl = this.importNode( mergeResultDoc.documentElement, true );
    } else {
        // adopt the merged instance childnode
        modelInstanceChildEl = this.xml.adoptNode( mergeResultDoc.documentElement, true );
    }
    // append the adopted node to the primary instance
    modelInstanceEl.appendChild( modelInstanceChildEl );
    // reset the rootElement
    this.rootElement = modelInstanceChildEl;

};

/**
 * Creates an XPath from a node
 * @param { XMLElement} node XML node
 * @param  {string=} rootNodeName   if absent the root is #document
 * @param  {boolean=} includePosition whether or not to include the positions /path/to/repeat[2]/node
 * @return {string}                 XPath
 */
FormModel.prototype.getXPath = function( node, rootNodeName, includePosition ) {
    var index;
    var steps = [];
    var position = '';
    var nodeName = node.nodeName;
    var parent = node.parentNode;
    var parentName = parent.nodeName;

    rootNodeName = rootNodeName || '#document';
    includePosition = includePosition || false;

    if ( includePosition ) {
        index = this.getRepeatIndex( node );
        if ( index > 0 ) {
            position = '[' + ( index + 1 ) + ']';
        }
    }

    steps.push( nodeName + position );

    while ( parent && parentName !== rootNodeName && parentName !== '#document' ) {
        if ( includePosition ) {
            index = this.getRepeatIndex( parent );
            position = ( index > 0 ) ? '[' + ( index + 1 ) + ']' : '';
        }
        steps.push( parentName + position );
        parent = parent.parentNode;
        parentName = parent.nodeName;
    }

    return '/' + steps.reverse().join( '/' );
};

/** 
 * Obtains the index of a repeat instance within its own series.
 * 
 * @param  {[type]} node [description]
 * @return {[type]}      [description]
 */
FormModel.prototype.getRepeatIndex = function( node ) {
    var index = 0;
    var nodeName = node.nodeName;
    var prevSibling = node.previousSibling;

    while ( prevSibling ) {
        // ignore any sibling text and comment nodes (e.g. whitespace with a newline character)
        if ( prevSibling.nodeName && prevSibling.nodeName === nodeName ) {
            index++;
        }
        prevSibling = prevSibling.previousSibling;
    }

    return index;
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
FormModel.prototype.setInstanceIdAndDeprecatedId = function() {
    var instanceIdObj;
    var instanceIdEl;
    var deprecatedIdEl;
    var metaEl;
    var instanceIdExistingVal;

    instanceIdObj = this.getMetaNode( 'instanceID' );
    instanceIdEl = instanceIdObj.get().get( 0 );
    instanceIdExistingVal = instanceIdObj.getVal()[ 0 ];

    if ( this.data.instanceStr && this.data.submitted ) {
        deprecatedIdEl = this.getMetaNode( 'deprecatedID' ).get().get( 0 );

        // set the instanceID value to empty
        instanceIdEl.textContent = '';

        // add deprecatedID node if necessary
        if ( !deprecatedIdEl ) {
            deprecatedIdEl = $.parseXML( '<deprecatedID/>' ).documentElement;
            this.xml.adoptNode( deprecatedIdEl );
            metaEl = this.xml.querySelector( '* > meta' );
            metaEl.appendChild( deprecatedIdEl );
        }
    }

    if ( !instanceIdObj.getVal()[ 0 ] ) {
        instanceIdObj.setVal( this.evaluate( 'concat("uuid:", uuid())', 'string' ) );
    }

    // after setting instanceID, give deprecatedID element the old value of the instanceId
    // ensure dataupdate event fires by using setVal
    if ( deprecatedIdEl ) {
        this.getMetaNode( 'deprecatedID' ).setVal( instanceIdExistingVal );
    }
};

/**
 * Creates a custom XPath Evaluator to be used for XPath Expresssions that contain custom
 * OpenRosa functions or for browsers that do not have a native evaluator.
 */
FormModel.prototype.bindJsEvaluator = require( './xpath-evaluator-binding' );

FormModel.prototype.getMetaNode = function( localName ) {
    var orPrefix = this.getNamespacePrefix( OPENROSA_XFORMS_NS );
    var n = this.node( '/*/' + orPrefix + ':meta/' + orPrefix + ':' + localName );

    if ( n.get().length === 0 ) {
        n = this.node( '/*/meta/' + localName );
    }

    return n;
};

FormModel.prototype.getRepeatCommentText = function( path ) {
    path = path.trim();
    return REPEAT_COMMENT_PREFIX + path;
};

FormModel.prototype.getRepeatCommentEl = function( repeatPath, repeatSeriesIndex ) {
    var xPath = '//comment()[self::comment()="' + this.getRepeatCommentText( repeatPath ) + '"]';
    return this.evaluate( xPath, 'nodes', null, null, true )[ repeatSeriesIndex ];
};

/**
 * Clones a <repeat>able instance node in a particular series of a repeat.
 *
 * @param  {string} repeatPath absolute path of a repeat 
 * @param  {number} repeatSeriesIndex    index of the repeat series that gets a new repeat (this is always 0 for non-nested repeats)
 * @param  {boolean} merge   whether this operation is part of a merge operation (won't send dataupdate event, clears all values and 
 *                           will not add ordinal attributes as these should be provided in the record)
 */
FormModel.prototype.cloneRepeat = function( repeatPath, repeatSeriesIndex, merge ) {
    var $insertAfterNode;
    var allClonedNodeNames;
    var $templateClone;
    var repeatSeries;
    var $template;
    var that = this;

    if ( !this.templates[ repeatPath ] ) {
        // This allows the model itself without requiring the controller to cal call .extractFakeTemplates()
        // to extract non-jr:templates by assuming that cloneRepeat would only called for a repeat.
        this.extractFakeTemplates( [ repeatPath ] );
    }

    $template = this.templates[ repeatPath ];
    repeatSeries = this.getRepeatSeries( repeatPath, repeatSeriesIndex );
    $insertAfterNode = ( repeatSeries.length ) ? $( repeatSeries[ repeatSeries.length - 1 ] ) : $( this.getRepeatCommentEl( repeatPath, repeatSeriesIndex ) );

    // if not exists and not a merge operation
    if ( !merge ) {
        repeatSeries.forEach( function( el ) {
            that.addOrdinalAttribute( el, repeatSeries[ 0 ] );
        } );
    }

    /**
     * If templatenodes and insertAfterNode(s) have been identified 
     */
    if ( $template[ 0 ] && $insertAfterNode.length === 1 ) {
        $templateClone = $template.clone()
            .insertAfter( $insertAfterNode );

        this.removeOrdinalAttributes( $templateClone[ 0 ] );
        // We should not automatically add ordinal attributes for an existing record as the ordinal values cannot be determined. 
        // They should be provided in the instanceStr (record).
        if ( !merge ) {
            this.addOrdinalAttribute( $templateClone[ 0 ], repeatSeries[ 0 ] );
        }

        // If part of a merge operation (during form load) where the values will be populated from the record, defaults are not desired.
        if ( merge ) {
            $templateClone.find( '*' ).filter( function() {
                return $( this ).children().length === 0;
            } ).text( '' );
        }

        // publish the changes
        if ( !merge ) {
            allClonedNodeNames = [ $template.prop( 'nodeName' ) ];

            $template.find( '*' ).each( function() {
                allClonedNodeNames.push( $( this ).prop( 'nodeName' ) );
            } );

            this.$events.trigger( 'dataupdate', {
                nodes: allClonedNodeNames,
                repeatPath: repeatPath,
                repeatIndex: that.determineIndex( $templateClone ),
                cloned: true
            } );
        }
    } else {
        console.error( 'Could not find template node and/or node to insert the clone after' );
    }
};

FormModel.prototype.addOrdinalAttribute = function( repeat, firstRepeatInSeries ) {
    var lastUsedOrdinal;
    var newOrdinal;
    var enkNs = this.getNamespacePrefix( ENKETO_XFORMS_NS );
    firstRepeatInSeries = firstRepeatInSeries || repeat;
    if ( config.repeatOrdinals === true && !repeat.getAttributeNS( ENKETO_XFORMS_NS, 'ordinal' ) ) {
        // getAttributeNs and setAttributeNs results in duplicate namespace declarations on each repeat node in IE11 when serializing the model.
        // However, the regular getAttribute and setAttribute do not work properly in IE11.
        lastUsedOrdinal = firstRepeatInSeries.getAttributeNS( ENKETO_XFORMS_NS, 'last-used-ordinal' ) || 0;
        newOrdinal = Number( lastUsedOrdinal ) + 1;
        firstRepeatInSeries.setAttributeNS( ENKETO_XFORMS_NS, enkNs + ':last-used-ordinal', newOrdinal );

        repeat.setAttributeNS( ENKETO_XFORMS_NS, enkNs + ':ordinal', newOrdinal );
    }
};

FormModel.prototype.removeOrdinalAttributes = function( el ) {
    if ( config.repeatOrdinals === true ) {
        // Find all nested repeats first (this is only used for repeats that have no template).
        // The querySelector is actually too unspecific as it matches all ordinal attributes in ANY namespace.
        // However the proper [enk\\:ordinal] doesn't work if setAttributeNS was used to add the attribute.
        var repeats = Array.prototype.slice.call( el.querySelectorAll( '[*|ordinal]' ) );
        repeats.push( el );
        for ( var i = 0; i < repeats.length; i++ ) {
            repeats[ i ].removeAttributeNS( ENKETO_XFORMS_NS, 'last-used-ordinal' );
            repeats[ i ].removeAttributeNS( ENKETO_XFORMS_NS, 'ordinal' );
        }
    }
};

/**
 * Obtains a single series of repeat element;
 * 
 * @param  {string} repeatPath        The absolute path of the repeat.
 * @param  {number} repeatSeriesIndex The index of the series of that repeat.
 * @return {<Element>}                Array of all repeat elements in a series.
 */
FormModel.prototype.getRepeatSeries = function( repeatPath, repeatSeriesIndex ) {
    var repeatCommentEl = this.getRepeatCommentEl( repeatPath, repeatSeriesIndex );
    var pathSegments = repeatCommentEl.textContent.substr( REPEAT_COMMENT_PREFIX.length ).split( '/' );
    var nodeName = pathSegments[ pathSegments.length - 1 ];
    var result = [];
    var checkEl = repeatCommentEl.nextSibling;

    // then add all subsequent repeats
    while ( checkEl ) {
        // Ignore any sibling text and comment nodes (e.g. whitespace with a newline character)
        // also deal with repeats that have non-repeat siblings in between them, event though that would be a bug.
        if ( checkEl.nodeName && checkEl.nodeName === nodeName ) {
            result.push( checkEl );
        }
        checkEl = checkEl.nextSibling;
    }

    return result;
};

FormModel.prototype.hasPreviousSiblingElementSameName = function( el ) {
    var found = false;
    var nodeName = el.nodeName;
    el = el.previousSibling;

    while ( el ) {
        // Ignore any sibling text and comment nodes (e.g. whitespace with a newline character)
        // also deal with repeats that have non-repeat siblings in between them, event though that would be a bug.
        if ( el.nodeName && el.nodeName === nodeName ) {
            found = true;
            break;
        }
        el = el.previousSibling;
    }
    return found;
};

FormModel.prototype.hasPreviousCommentSiblingWithContent = function( node, content ) {
    var found = false;
    node = node.previousSibling;

    while ( node ) {
        if ( node.nodeType === Node.COMMENT_NODE && node.textContent === content ) {
            found = true;
            break;
        }
        node = node.previousSibling;
    }
    return found;
};

/**
 * Determines the index of a repeated node amongst all nodes with the same XPath selector
 *
 * @param  {} $node optional jquery element
 * @return {number}       [description]
 */
FormModel.prototype.determineIndex = function( $node ) {
    var nodeName;
    var path;
    var $family;
    var that = this;

    if ( $node.length === 1 ) {
        nodeName = $node.prop( 'nodeName' );
        path = this.getXPath( $node.get( 0 ), 'instance' );
        $family = this.$.find( nodeName.replace( /\./g, '\\.' ) ).filter( function() {
            return path === that.getXPath( this, 'instance' );
        } );
        return ( $family.length === 1 ) ? null : $family.index( $node );
    } else {
        console.error( 'no node, or multiple nodes, provided to determineIndex function' );
        return -1;
    }
};

/**
 * Extracts all templates from the model and stores them in a Javascript object poperties as Jquery collections
 * @return {[type]} [description]
 */
FormModel.prototype.extractTemplates = function() {
    var that = this;

    // in reverse document order to properly deal with nested repeat templates
    this.getTemplateNodes().reverse().forEach( function( templateEl ) {
        var xPath = that.getXPath( templateEl, 'instance' );
        that.addTemplate( xPath, templateEl );
        /*
         * Nested repeats that have a template attribute are correctly add to that.templates.
         * The template of the repeat ancestor of the nested repeat contains the correct comment.
         * However, since the ancestor repeat (template)
         */
        // IE11 has no remove() method so we use jQuery
        $( templateEl ).remove();
    } );
};

FormModel.prototype.extractFakeTemplates = function( repeatPaths ) {
    var that = this;
    var repeat;

    repeatPaths.forEach( function( repeatPath ) {
        // Filter by elements that are the first in a series. This means that multiple instances of nested repeats
        // all get a comment insertion point.
        repeat = that.evaluate( repeatPath, 'node', null, null, true );
        if ( repeat ) {
            that.addTemplate( repeatPath, repeat, true );
        }
    } );
};

FormModel.prototype.addRepeatComments = function( repeatPath ) {
    var comment = this.getRepeatCommentText( repeatPath );
    var that = this;
    // Find all repeat series.
    this.evaluate( repeatPath, 'nodes', null, null, true ).forEach( function( repeat ) {
        if ( !that.hasPreviousSiblingElementSameName( repeat ) && !that.hasPreviousCommentSiblingWithContent( repeat, comment ) ) {
            // Add a comment to the primary instance that serves as an insertion point for each repeat series,
            $( repeat ).before( document.createComment( comment ) );
        }
    } );
};

FormModel.prototype.addTemplate = function( repeatPath, repeat, empty ) {
    var $clone;

    this.addRepeatComments( repeatPath );

    if ( !this.templates[ repeatPath ] ) {
        $clone = $( repeat ).clone().removeAttr( 'template' ).removeAttr( 'jr:template' );
        if ( empty ) {
            $clone.find( '*' ).filter( function() {
                return $( this ).children().length === 0;
            } ).text( '' );
        }
        // Add to templates object.
        this.templates[ repeatPath ] = $clone;
    }
};

FormModel.prototype.getTemplateNodes = function() {
    var jrPrefix = this.getNamespacePrefix( JAVAROSA_XFORMS_NS );
    // For now we support both the official namespaced template and the hacked non-namespaced template attributes
    // Note: due to an MS Edge bug, we use the slow JS XPath evaluator here. It would be VERY GOOD for performance 
    // to switch back once the Edge bug is fixed. The bug results in not finding any templates.
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9544701/
    return this.evaluate( '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@' + jrPrefix + ':template]', 'nodes', null, null, false );
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
    var jrPrefix = this.getNamespacePrefix( JAVAROSA_XFORMS_NS );
    var that = this;

    // for now we support both the official namespaced template and the hacked non-namespaced template attributes
    this.getTemplateNodes().forEach( function( templateEl ) {
        var nodeName = templateEl.nodeName;
        var selector = that.getXPath( templateEl, 'instance' );
        var ancestorTemplateNodes = that.evaluate( 'ancestor::' + nodeName + '[@template] | ancestor::' + nodeName + '[@' + jrPrefix + ':template]', 'nodes', selector, 0, true );
        if ( ancestorTemplateNodes.length === 0 && $( templateEl ).siblings( nodeName.replace( /\./g, '\\.' ) ).length === 0 ) {
            $( templateEl ).clone().insertAfter( $( templateEl ) )
                // for backwards compatibility
                .find( '*' ).addBack().removeAttr( 'template' )
                // just to be sure, but could be omitted
                .removeAttr( jrPrefix + ':template' )
                // the proper way of doing this
                .get( 0 ).removeAttributeNS( JAVAROSA_XFORMS_NS, 'template' );
        }
    } );
};

/**
 * Obtains a cleaned up string of the data instance
 *
 * @return {string}           XML string
 */
FormModel.prototype.getStr = function() {
    var dataStr = ( new XMLSerializer() ).serializeToString( this.xml.querySelector( 'instance > *' ) || this.xml.documentElement, 'text/xml' );
    // restore default namespaces
    dataStr = dataStr.replace( /\s(data-)(xmlns\=("|')[^\s\>]+("|'))/g, ' $2' );
    // remove repeat comments
    dataStr = dataStr.replace( new RegExp( '<!--' + REPEAT_COMMENT_PREFIX + '\/[^>]+-->', 'g' ), '' );
    // If not IE, strip duplicate namespace declarations. IE doesn't manage to add a namespace declaration to the root element.
    if ( navigator.userAgent.indexOf( 'Trident/' ) === -1 ) {
        dataStr = this.removeDuplicateEnketoNsDeclarations( dataStr );
    }
    return dataStr;
};

FormModel.prototype.removeDuplicateEnketoNsDeclarations = function( xmlStr ) {
    var i = 0;
    var declarationExp = new RegExp( '( xmlns:' + this.getNamespacePrefix( ENKETO_XFORMS_NS ) + '="' + ENKETO_XFORMS_NS + '")', 'g' );
    return xmlStr.replace( declarationExp, function( match, p1 ) {
        i++;
        if ( i > 1 ) {
            return '';
        } else {
            return match;
        }
    } );
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
 */
FormModel.prototype.makeBugCompliant = function( expr, selector, index ) {
    var i;
    var parentSelector;
    var parentIndex;
    var $target;
    var $node;
    var nodeName;
    var $siblings;
    var $parents;

    // TODO: eliminate jQuery from this function.

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
            parentSelector = this.getXPath( $node.get( 0 ), 'instance' );
            parentIndex = $siblings.add( $node ).index( $node );
            // Add position to segments that do not have an XPath predicate.
            expr = expr.replace( new RegExp( parentSelector + '/', 'g' ), parentSelector + '[' + ( parentIndex + 1 ) + ']/' );
        }
    }
    return expr;
};

FormModel.prototype.setNamespaces = function() {
    /**
     * Passing through all nodes would be very slow with an XForms model that contains lots of nodes such as large secondary instances. 
     * (The namespace XPath axis is not support in native browser XPath evaluators unfortunately).
     * 
     * For now it has therefore been restricted to only look at the top-level node in the primary instance.
     * We can always expand that later.
     */
    var start = this.hasInstance ? '/model/instance[1]' : '';
    var node = this.evaluate( start + '/*', 'node', null, null, true );
    var that = this;
    var prefix;

    if ( node ) {
        if ( node.hasAttributes() ) {
            for ( var i = 0; i < node.attributes.length; i++ ) {
                var attribute = node.attributes[ i ];

                if ( attribute.name.indexOf( 'xmlns:' ) === 0 ) {
                    this.namespaces[ attribute.name.substring( 6 ) ] = attribute.value;
                }
            }
        }
        // add required namespaces to resolver and document if they are missing
        [
            [ 'orx', OPENROSA_XFORMS_NS, false ],
            [ 'jr', JAVAROSA_XFORMS_NS, false ],
            [ 'enk', ENKETO_XFORMS_NS, config.repeatOrdinals === true ]
        ].forEach( function( arr ) {
            if ( !that.getNamespacePrefix( arr[ 1 ] ) ) {
                prefix = ( !that.namespaces[ arr[ 0 ] ] ) ? arr[ 0 ] : '__' + arr[ 0 ];
                // add to resolver
                that.namespaces[ prefix ] = arr[ 1 ];
                // add to document
                if ( arr[ 2 ] ) {
                    node.setAttributeNS( 'http://www.w3.org/2000/xmlns/', 'xmlns:' + prefix, arr[ 1 ] );
                }
            }
        } );
    }
};

FormModel.prototype.getNamespacePrefix = function( namespace ) {
    var p;
    for ( var prefix in this.namespaces ) {
        if ( this.namespaces.hasOwnProperty( prefix ) && this.namespaces[ prefix ] === namespace ) {
            p = prefix;
            break;
        }
    }
    return p;
};

FormModel.prototype.getNsResolver = function() {
    var namespaces = ( typeof this.namespaces === 'undefined' ) ? {} : this.namespaces;

    return {
        lookupNamespaceURI: function( prefix ) {
            return namespaces[ prefix ] || null;
        }
    };
};


/**
 * Shift root to first instance for all absolute paths not starting with /model
 *
 * @param  {string} expr original expression
 * @return {string}      new expression
 */
FormModel.prototype.shiftRoot = function( expr ) {
    var LITERALS = /"([^"]*)(")|'([^']*)(')/g;
    if ( this.hasInstance ) {
        // Encode all string literals in order to exclude them, without creating a monsterly regex
        expr = expr.replace( LITERALS, function( m, p1, p2, p3, p4 ) {
            var encoded = typeof p1 !== 'undefined' ? encodeURIComponent( p1 ) : encodeURIComponent( p3 );
            var quote = p2 ? p2 : p4;
            return quote + encoded + quote;
        } );
        // Insert /model/instance[1]
        expr = expr.replace( /^(\/(?!model\/)[^\/][^\/\s,"']*\/)/g, '/model/instance[1]$1' );
        expr = expr.replace( /([^a-zA-Z0-9\.\]\)\/\*_-])(\/(?!model\/)[^\/][^\/\s,"']*\/)/g, '$1/model/instance[1]$2' );
        // Decode string literals
        expr = expr.replace( LITERALS, function( m, p1, p2, p3, p4 ) {
            var decoded = typeof p1 !== 'undefined' ? decodeURIComponent( p1 ) : decodeURIComponent( p3 );
            var quote = p2 ? p2 : p4;
            return quote + decoded + quote;
        } );
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
    return expr.replace( INSTANCE, function( match, id ) {
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
 * Replaces current() with /absolute/path/to/node to ensure the context is shifted to the primary instance
 * 
 * Doing this here instead of adding a current() function to the XPath evaluator, means we can keep using
 * the much faster native evaluator in most cases!
 *
 * Root will be shifted, and repeat positions injected, **later on**, so it's not included here.
 *
 * @param  {string} expr            original expression
 * @param  {string} contextSelector context selector 
 * @return {string}                 new expression
 */
FormModel.prototype.replaceCurrentFn = function( expr, contextSelector ) {
    // relative paths
    expr = expr.replace( 'current()/.', contextSelector + '/.' );
    // absolute paths
    expr = expr.replace( 'current()/', '/' );

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
    var pullDataResult;
    var that = this;
    var replacements = this.convertPullDataFn( expr, selector, index );

    for ( var pullData in replacements ) {
        if ( replacements.hasOwnProperty( pullData ) ) {
            // We evaluate this here, so we can use the native evaluator safely. This speeds up pulldata() by about a factor *740*!
            pullDataResult = that.evaluate( replacements[ pullData ], 'string', selector, index, true );
            expr = expr.replace( pullData, '"' + pullDataResult + '"' );
        }
    }
    return expr;
};

FormModel.prototype.convertPullDataFn = function( expr, selector, index ) {
    var that = this;
    var pullDatas = utils.parseFunctionFromExpression( expr, 'pulldata' );
    var replacements = {};

    if ( !pullDatas.length ) {
        return replacements;
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

            replacements[ pullData[ 0 ] ] = searchXPath;

        } else {
            throw new FormLogicError( 'pulldata with incorrect number of parameters found: ' + pullData[ 0 ] );
        }
    } );

    return replacements;
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
        expr = this.replaceInstanceFn( expr );
        expr = this.replaceCurrentFn( expr, selector );
        // shiftRoot should come after replaceCurrentFn
        expr = this.shiftRoot( expr );
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
    if ( tryNative && typeof doc.evaluate !== 'undefined' && !OPENROSA.test( expr ) ) {
        try {
            // console.log( 'trying the blazing fast native XPath Evaluator for', expr, index );
            result = doc.evaluate( expr, context, this.getNsResolver(), resTypeNum, null );
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
            result = doc.jsEvaluate( expr, context, this.getNsResolver(), resTypeNum, null );
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
    var $nodes;
    var /** @type {string} */ val;

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
 * @param {?string=} requiredExpr XPath expression to determine where value is required
 * @param {?boolean} noValidate Whether to skip validation
 *
 * @return {?*} wrapping {?boolean}; null is returned when the node is not found or multiple nodes were selected,
 *                            otherwise an object with update information is returned.
 */
Nodeset.prototype.setVal = function( newVals, constraintExpr, xmlDataType, requiredExpr, noValidate ) {
    var $target;
    var curVal;
    var /**@type {string}*/ newVal;
    var updated;
    var customData;

    curVal = this.getVal()[ 0 ];

    if ( typeof newVals !== 'undefined' && newVals !== null ) {
        newVal = ( Array.isArray( newVals ) ) ? newVals.join( ' ' ) : newVals.toString();
    } else {
        newVal = '';
    }

    newVal = this.convert( newVal, xmlDataType );
    $target = this.get();

    if ( $target.length === 1 && newVal.toString().trim() !== curVal.toString().trim() ) {
        // first change the value so that it can be evaluated in XPath (validated)
        $target.text( newVal.toString() );
        // then return validation result
        updated = this.getClosestRepeat();
        updated.nodes = [ $target.prop( 'nodeName' ) ];

        customData = this.model.getUpdateEventData( $target.get( 0 ), xmlDataType );
        updated = ( customData ) ? $.extend( {}, updated, customData ) : updated;

        this.model.$events.trigger( 'dataupdate', updated );

        if ( config.validateContinuously && noValidate !== true ) {
            this.validate( constraintExpr, requiredExpr, xmlDataType );
        }

        //add type="file" attribute for file references
        if ( xmlDataType === 'binary' ) {
            if ( newVal.length > 0 ) {
                $target.attr( 'type', 'file' );
            } else {
                $target.removeAttr( 'type' );
            }
        }
        return updated;
    }
    if ( $target.length > 1 ) {
        console.error( 'nodeset.setVal expected nodeset with one node, but received multiple' );
        return null;
    }
    if ( $target.length === 0 ) {
        console.log( 'Data node: ' + this.selector + ' with null-based index: ' + this.index + ' not found. Ignored.' );
        return null;
    }

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

// if repeats have not been cloned yet, they are not considered a repeat by this function
Nodeset.prototype.getClosestRepeat = function() {
    var el = this.get().get( 0 );
    var nodeName = el.nodeName;

    while ( nodeName !== 'instance' && !( el.nextSibling && el.nextSibling.nodeName === nodeName ) && !( el.previousSibling && el.previousSibling.nodeName === nodeName ) ) {
        el = el.parentNode;
        nodeName = el.nodeName;
    }

    return ( nodeName === 'instance' ) ? {} : {
        repeatPath: this.model.getXPath( el, 'instance' ),
        repeatIndex: this.model.determineIndex( $( el ) )
    };
};

/**
 * Remove a repeat node
 */
Nodeset.prototype.remove = function() {
    var $dataNode;
    var allRemovedNodeNames;
    var $this;
    var repeatPath;
    var repeatIndex;
    var removalEventData;

    $dataNode = this.get();

    if ( $dataNode.length > 0 ) {

        allRemovedNodeNames = [ $dataNode.prop( 'nodeName' ) ];

        $dataNode.find( '*' ).each( function() {
            $this = $( this );
            allRemovedNodeNames.push( $this.prop( 'nodeName' ) );
        } );

        repeatPath = this.model.getXPath( $dataNode.get( 0 ), 'instance' );
        repeatIndex = this.model.determineIndex( $dataNode );
        removalEventData = this.model.getRemovalEventData( $dataNode.get( 0 ) );

        if ( !this.model.templates[ repeatPath ] ) {
            // This allows the model itself without requiring the controller to cal call .extractFakeTemplates()
            // to extract non-jr:templates by assuming that node.remove() would only called for a repeat.
            this.model.extractFakeTemplates( [ repeatPath ] );
        }

        $dataNode.remove();
        this.nodes = null;

        // For internal use
        this.model.$events.trigger( 'dataupdate', {
            nodes: allRemovedNodeNames,
            repeatPath: repeatPath,
            repeatIndex: repeatIndex
        } );

        // For external use, if required with custom data.
        this.model.$events.trigger( 'removed', removalEventData );

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

Nodeset.prototype.validate = function( constraintExpr, requiredExpr, xmlDataType ) {
    var that = this;
    var result = {};

    // Avoid checking constraint if required is invalid
    return this.validateRequired( requiredExpr )
        .then( function( passed ) {
            result.requiredValid = passed;
            return ( passed === false ) ? null : that.validateConstraintAndType( constraintExpr, xmlDataType );
        } )
        .then( function( passed ) {
            result.constraintValid = passed;

            return result;
        } );
};

/**
 * Validate a value with an XPath Expression and /or xml data type
 * @param  {?string=} expr        XPath expression
 * @param  {?string=} xmlDataType XML datatype
 * @return {Promise} wrapping a boolean indicating if the value is valid or not; error also indicates invalid field, or problem validating it
 */
Nodeset.prototype.validateConstraintAndType = function( expr, xmlDataType ) {
    var that = this;
    var value;

    if ( !xmlDataType || typeof types[ xmlDataType.toLowerCase() ] === 'undefined' ) {
        xmlDataType = 'string';
    }

    // This one weird trick results in a small validation performance increase.
    // Do not obtain *the value* if the expr is empty and data type is string, select, select1, binary knowing that this will always return true.
    if ( !expr && ( xmlDataType === 'string' || xmlDataType === 'select' || xmlDataType === 'select1' || xmlDataType === 'binary' ) ) {
        return Promise.resolve( true );
    }

    value = that.getVal()[ 0 ];

    if ( value.toString() === '' ) {
        return Promise.resolve( true );
    }

    return Promise.resolve()
        .then( function() {
            return types[ xmlDataType.toLowerCase() ].validate( value );
        } )
        .then( function( typeValid ) {
            var exprValid = ( typeof expr !== 'undefined' && expr !== null && expr.length > 0 ) ? that.model.evaluate( expr, 'boolean', that.originalSelector, that.index ) : true;

            return ( typeValid && exprValid );
        } );
};

Nodeset.prototype.isRequired = function( expr ) {
    return !expr || expr.trim() === 'false()' ? false : expr.trim() === 'true()' || this.model.evaluate( expr, 'boolean', this.originalSelector, this.index );
};

Nodeset.prototype.validateRequired = function( expr ) {
    var that = this;

    // if the node has a value or there is no required expression
    if ( !expr || this.getVal()[ 0 ] ) {
        return Promise.resolve( true );
    }

    // if the node does not have a value and there is a required expression
    return Promise.resolve()
        .then( function() {
            // if the expression evaluates to true, the field is required, and the function returns false.
            return !that.isRequired( expr );
        } );
};

// Placeholder function meant to be overwritten
FormModel.prototype.getUpdateEventData = function( node, type ) {};

// Placeholder function meant to be overwritten
FormModel.prototype.getRemovalEventData = function( node ) {};

// Expose types to facilitate extending with custom types
FormModel.prototype.types = types;

module.exports = FormModel;


// The deprecated methods below to be removed for version 5.0.0:
/**
 * @deprecated
 */
FormModel.prototype.getVersion = function() {
    console.warn( 'FormModel.getVersion() is deprecated, use model.version' );
    return this.version;
};
/**
 * @deprecated
 * 
 * See Also:
 * Returns jQuery Data Object (obsolete?)
 * See also: <nodes.get()>, which is always (?) preferred except for debugging.
 *
 * @return {jQuery} JQuery Data Object
 */
FormModel.prototype.get = function() {
    console.warn( 'model.get() is deprecated, use model.$' );
    return this.$ || null;
};
/**
 * @deprecated
 * @return {Element} data XML object (not sure if type is element actually)
 */
FormModel.prototype.getXML = function() {
    console.warn( 'model.getXML() is deprecated, use model.xml' );
    return this.xml || null;
};
/**
 * @deprecated
 */
FormModel.prototype.getInstanceID = function() {
    console.warn( 'model.getInstanceID() is deprecated, use model.instanceID' );
    return this.instanceID;
};
/**
 * @deprecated
 */
FormModel.prototype.getDeprecatedID = function() {
    console.warn( 'model.getDeprecatedID() is deprecated, use model.deprecatedID' );
    return this.deprecatedID;
};
/**
 * @deprecated
 */
FormModel.prototype.getInstanceName = function() {
    console.warn( 'model.getInstanceName() is deprecated, use model.instanceName' );
    return this.instanceName;
};
