import MergeXML from 'mergexml/mergexml';
import { readCookie, parseFunctionFromExpression, stripQuotes } from './utils';
import { getSiblingElementsAndSelf, getXPath, getRepeatIndex, hasPreviousCommentSiblingWithContent, hasPreviousSiblingElementSameName } from './dom-utils';
import FormLogicError from './form-logic-error';
import config from 'enketo/config';
import types from './types';
import event from './event';
import { Nodeset } from './nodeset';
const REPEAT_COMMENT_PREFIX = 'repeat:/';
const INSTANCE = /instance\(\s*(["'])((?:(?!\1)[A-z0-9.\-_]+))\1\s*\)/g;
const OPENROSA = /(decimal-date-time\(|pow\(|indexed-repeat\(|format-date\(|coalesce\(|join\(|max\(|min\(|random\(|substr\(|int\(|uuid\(|regex\(|now\(|today\(|date\(|if\(|boolean-from-string\(|checklist\(|selected\(|selected-at\(|round\(|area\(|position\([^)])/;
const OPENROSA_XFORMS_NS = 'http://openrosa.org/xforms';
const JAVAROSA_XFORMS_NS = 'http://openrosa.org/javarosa';
const ENKETO_XFORMS_NS = 'http://enketo.org/xforms';
const ODK_XFORMS_NS = 'http://www.opendatakit.org/xforms';

import './extend';

const parser = new DOMParser();

/**
 * Class dealing with the XML Model of a form
 *
 * @class
 * @param {FormDataObj} data - data object
 * @param {object=} options - FormModel options
 * @param {string=} options.full - Whether to initialize the full model or only the primary instance.
 */
const FormModel = function( data, options ) {

    if ( typeof data === 'string' ) {
        data = {
            modelStr: data
        };
    }

    data.external = data.external || [];
    data.submitted = ( typeof data.submitted !== 'undefined' ) ? data.submitted : true;
    options = options || {};
    options.full = ( typeof options.full !== 'undefined' ) ? options.full : true;

    this.events = document.createElement( 'div' );
    this.convertedExpressions = {};
    this.templates = {};
    this.loadErrors = [];

    this.data = data;
    this.options = options;
    this.namespaces = {};
};

/**
 * Getter and setter functions
 */
FormModel.prototype = {
    /**
     * @type {string}
     */
    get version() {
        return this.evaluate( '/node()/@version', 'string', null, null, true );
    },
    /**
     * @type {string}
     */
    get instanceID() {
        return this.getMetaNode( 'instanceID' ).getVal();
    },
    /**
     * @type {string}
     */
    get deprecatedID() {
        return this.getMetaNode( 'deprecatedID' ).getVal() || '';
    },
    /**
     * @type {string}
     */
    get instanceName() {
        return this.getMetaNode( 'instanceName' ).getVal();
    },
};

/**
 * Initializes FormModel
 *
 * @return {Array<string>} list of initialization errors
 */
FormModel.prototype.init = function() {
    let id;
    let i;
    let instanceDoc;
    let secondaryInstanceChildren;
    const that = this;

    /**
     * Default namespaces (on a primary instance, instance child, model) would create a problem using the **native** XPath evaluator.
     * It wouldn't find any regular /path/to/nodes. The solution is to ignore these by renaming these attributes to data-xmlns.
     *
     * If the regex is later deemed too aggressive, it could target the model, primary instance and primary instance child only, after creating an XML Document.
     */
    this.data.modelStr = this.data.modelStr.replace( /\s(xmlns=("|')[^\s>]+("|'))/g, ' data-$1' );

    if ( !this.options.full ) {
        // Strip all secondary instances from string before parsing
        // This regex works because the model never includes itext in Enketo
        this.data.modelStr = this.data.modelStr.replace( /^(<model\s*><instance((?!<instance).)+<\/instance\s*>\s*)(<instance.+<\/instance\s*>)*/, '$1' );
    }

    // Create the model
    try {
        id = 'model';
        // The default model
        this.xml = parser.parseFromString( this.data.modelStr, 'text/xml' );
        this.throwParserErrors( this.xml, this.data.modelStr );

        // Add external data to model
        this.data.external.forEach( instance => {
            id = instance.id ? `instance "${instance.id}"` : 'instance "unknown"';
            instanceDoc = that.getSecondaryInstance( instance.id );
            // remove any existing content that is just an XLSForm hack to pass ODK Validate
            secondaryInstanceChildren = instanceDoc.children;
            for ( i = secondaryInstanceChildren.length - 1; i >= 0; i-- ) {
                instanceDoc.removeChild( secondaryInstanceChildren[ i ] );
            }
            let rootEl;
            if ( instance.xml instanceof XMLDocument ) {
                if ( window.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {
                    // IE does not support importNode
                    rootEl = that.importNode( instance.xml.documentElement, true );
                } else {
                    // Create a clone of the root node
                    rootEl = that.xml.importNode( instance.xml.documentElement, true );
                }
            }
            if ( rootEl ) {
                instanceDoc.appendChild( rootEl );
            }
        } );

        // TODO: in the future, we should search for jr://instance/session and
        // populate that one. This is just moving in that direction to implement preloads.
        this.createSession( '__session', this.data.session );
    } catch ( e ) {
        console.error( 'parseXML error' );
        this.loadErrors.push( `Error trying to parse XML ${id}. ${e.message}` );
    }

    // Initialize/process the model
    if ( this.xml ) {
        try {
            this.hasInstance = !!this.xml.querySelector( 'model > instance' );
            this.rootElement = this.xml.querySelector( 'instance > *' ) || this.xml.documentElement;
            this.setNamespaces();

            // Determine whether it is possible that this form uses incorrect absolute/path/to/repeat/node syntax when
            // it actually was supposed to use a relative ../node path (old issue with older pyxform-generated forms).
            // In the future, if there are more use cases for odk:xforms-version, we'll probably have to use a semver-parser
            // to do a comparison. In this case, the presence of the attribute is sufficient, as we know no older versions
            // than odk:xforms-version="1.0.0" exist. Previous versions had no number.
            this.noRepeatRefErrorExpected = this.evaluate( `/model/@${this.getNamespacePrefix( ODK_XFORMS_NS )}:xforms-version`, 'boolean', null, null, true );

            // Check if instanceID is present
            if ( !this.getMetaNode( 'instanceID' ).getElement() ) {
                that.loadErrors.push( 'Invalid primary instance. Missing instanceID node.' );
            }

            // Check if all secondary instances with an external source have been populated
            Array.prototype.slice.call( this.xml.querySelectorAll( 'model > instance[src]:empty' ) ).forEach( instance => {
                that.loadErrors.push( `External instance "${instance.id}" is empty.` );
            } );

            this.trimValues();
            this.extractTemplates();
        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( `${e.name}: ${e.message}` );
        }
        // Merge an existing instance into the model, AFTER templates have been removed
        try {
            id = 'record';
            if ( this.data.instanceStr ) {
                this.mergeXml( this.data.instanceStr );
            }

            // Set the two most important meta fields before any field 'dataupdate' event fires.
            // The first dataupdate event will fire in response to the instance-first-load event.
            this.setInstanceIdAndDeprecatedId();

            if ( !this.data.instanceStr ){
                // Only dispatch for newly created records
                this.events.dispatchEvent( event.InstanceFirstLoad() );
            }

        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( `Error trying to parse XML ${id}. ${e.message}` );
        }
    }

    return this.loadErrors;
};

/**
 * @param {Document} xmlDoc - XML Document
 * @param {string} xmlStr - XML string
 */
FormModel.prototype.throwParserErrors = ( xmlDoc, xmlStr ) => {
    if ( !xmlDoc || xmlDoc.querySelector( 'parsererror' ) ) {
        throw new Error( `Invalid XML: ${xmlStr}` );
    }
};

/**
 * @param {string} id - Instance ID
 * @param {object} [sessObj] - session object
 */
FormModel.prototype.createSession = function( id, sessObj ) {
    let instance;
    let session;
    const model = this.xml.querySelector( 'model' );
    const fixedProps = [ 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid' ];
    if ( !model ) {
        return;
    }

    sessObj = ( typeof sessObj === 'object' ) ? sessObj : {};
    instance = model.querySelector( `instance#${CSS.escape( id )}` );

    if ( !instance ) {
        instance = parser.parseFromString( `<instance id="${id}"/>`, 'text/xml' ).documentElement;
        this.xml.adoptNode( instance );
        model.appendChild( instance );
    }

    // fixed: /sesssion/context properties
    fixedProps.forEach( prop => {
        sessObj[ prop ] = sessObj[ prop ] || readCookie( `__enketo_meta_${prop}` ) || `${prop} not found`;
    } );

    session = parser.parseFromString( `<session><context>${fixedProps.map( prop => `<${prop}>${sessObj[ prop ]}</${prop}>` ).join( '' )}</context></session>`, 'text/xml' ).documentElement;

    // TODO: custom properties could be added to /session/user/data or to /session/data

    this.xml.adoptNode( session );
    instance.appendChild( session );
};

/**
 * For some unknown reason we cannot use doc.getElementById(id) or doc.querySelector('#'+id)
 * in IE11. This function is a replacement for this specifically to find a secondary instance.
 *
 * @param  {string} id - DOM element id.
 * @return {Element|undefined} secondary instance XML element
 */
FormModel.prototype.getSecondaryInstance = function( id ) {
    let instanceEl;

    [ ...this.xml.querySelectorAll( 'model > instance' ) ].some( el => {
        const idAttr = el.getAttribute( 'id' );
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
 * @param {string|null} [selector] - simple path to node
 * @param {string|number|null} [index] - index of node
 * @param {NodesetFilter|null} [filter] - filter to apply
 * @return {Nodeset} Nodeset instance
 */
FormModel.prototype.node = function( selector, index, filter ) {
    return new Nodeset( selector, index, filter, this );
};

/**
 * Alternative adoptNode on IE11 (http://stackoverflow.com/questions/1811116/ie-support-for-dom-importnode)
 * TODO: remove to be replaced by separate IE11-only polyfill file/service
 *
 * @param {Element} node - Node to be imported
 * @param {Array<Node>} allChildren - All children of imported Node
 */
FormModel.prototype.importNode = function( node, allChildren ) {
    let i;
    let il;
    switch ( node.nodeType ) {
        case document.ELEMENT_NODE: {
            const newNode = document.createElementNS( node.namespaceURI, node.nodeName );
            if ( node.attributes && node.attributes.length > 0 ) {
                for ( i = 0, il = node.attributes.length; i < il; i++ ) {
                    const attr = node.attributes[ i ];
                    if ( attr.namespaceURI ) {
                        newNode.setAttributeNS( attr.namespaceURI, attr.nodeName, node.getAttributeNS( attr.namespaceURI, attr.localName ) );
                    } else {
                        newNode.setAttribute( attr.nodeName, node.getAttribute( attr.nodeName ) );
                    }
                }
            }
            if ( allChildren && node.children.length ) {
                for ( i = 0, il = node.children.length; i < il; i++ ) {
                    newNode.appendChild( this.importNode( node.children[ i ], allChildren ) );
                }
            }
            if ( !node.children.length && node.textContent ) {
                newNode.textContent = node.textContent;
            }

            return newNode;
        }
        case document.TEXT_NODE:
        case document.CDATA_SECTION_NODE:
        case document.COMMENT_NODE:
            return document.createTextNode( node.nodeValue );
    }
};
/**
 * Merges an XML instance string into the XML Model
 *
 * @param {string} recordStr - The XML record as string
 */
FormModel.prototype.mergeXml = function( recordStr ) {
    let modelInstanceChildStr;
    let merger;
    let modelInstanceEl;
    let modelInstanceChildEl;
    let mergeResultDoc;
    const that = this;
    let templateEls;
    let record;

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
    recordStr = recordStr.replace( /\s(xmlns=("|')[^\s>]+("|'))/g, '' );
    /**
     * Comments aren't merging in document order (which would be impossible also).
     * This may mess up repeat functionality, so until we actually need
     * comments, we simply remove them (multiline comments are probably not removed, but we don't care about them).
     */
    recordStr = recordStr.replace( /<!--[^>]*-->/g, '' );
    record = parser.parseFromString( recordStr, 'text/xml' );

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

    for ( let i = 0; i < templateEls.length; i++ ) {
        templateEls[ i ].remove();
    }

    /**
     * To comply with quirky behaviour of repeats in XForms, we manually create the correct number of repeat instances
     * before merging. This resolves these two issues:
     *  a) Multiple repeat instances in record are added out of order when merged into a record that contains fewer
     *     repeat instances, see https://github.com/kobotoolbox/enketo-express/issues/223
     *  b) If a repeat node is missing from a repeat instance (e.g. the 2nd) in a record, and that repeat instance is not
     *     in the model, that node will be missing in the result.
     */
    // TODO: ES6 for (var node of record.querySelectorAll('*')){}
    Array.prototype.slice.call( record.querySelectorAll( '*' ) )
        .forEach( node => {
            let path;
            let repeatIndex = 0;
            let positionedPath;
            let repeatParts;
            try {
                path = getXPath( node, 'instance', false );
                // If this is a templated repeat (check templates)
                // or a repeat without templates
                if ( typeof that.templates[ path ] !== 'undefined' || getRepeatIndex( node ) > 0 ) {
                    positionedPath = getXPath( node, 'instance', true );
                    if ( !that.evaluate( positionedPath, 'node', null, null, true ) ) {
                        repeatParts = positionedPath.match( /([^[]+)\[(\d+)\]\//g );
                        // If the positionedPath has a non-0 repeat index followed by (at least) 1 node, avoid cloning out of order.
                        if ( repeatParts && repeatParts.length > 0 ) {
                            // TODO: Does this work for triple-nested repeats. I don't really care though.
                            // repeatIndex of immediate parent repeat of deepest nested repeat in positionedPath
                            repeatIndex = repeatParts[ repeatParts.length - 1 ].match( /\[(\d+)\]/ )[ 1 ] - 1;
                        }
                        that.addRepeat( path, repeatIndex, true );
                    }
                }
            } catch ( e ) {
                console.warn( 'Ignored error:', e );
            }
        } );

    /**
     * Any default values in the model, may have been emptied in the record.
     * MergeXML will keep those default values, which would be bad, so we manually clear defaults before merging.
     */
    // first find all empty leaf nodes in record
    Array.prototype.slice.call( record.querySelectorAll( '*' ) )
        .filter( recordNode => {
            const val = recordNode.textContent;

            return recordNode.children.length === 0 && val.trim().length === 0;
        } )
        .forEach( leafNode => {
            const path = getXPath( leafNode, 'instance', true );
            const instanceNode = that.node( path, 0 ).getElement();
            if ( instanceNode ) {
                // TODO: after dropping support for IE11, we can also use instanceNode.children.length
                if ( that.evaluate( './*', 'nodes', path, 0, true ).length === 0 ) {
                    // Select all text nodes (excluding repeat COMMENT nodes!)
                    that.evaluate( './text()', 'nodes', path, 0, true ).forEach( node => {
                        node.textContent = '';
                    } );
                } else {
                    // If the node in the default instance is a group (empty in record, so appears to be a leaf node
                    // but isn't), empty all true leaf node descendants.
                    that.evaluate( './/*[not(*)]', 'nodes', path, 0, true ).forEach( node => {
                        node.textContent = '';
                    } );
                }
            }
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
    mergeResultDoc = parser.parseFromString( merger.Get( 1 ), 'text/xml' );

    /**
     * To properly show 0 repeats, if the form definition contains multiple default instances
     * and the record contains none, we have to iterate trough the templates object, and
     * 1. check for each template path, whether the record contained more than 0 of these nodes
     * 2. remove all nodes on that path if the answer was no.
     *
     * Since this requires complex handcoded XForms it is unlikely to ever be needed, so I left this
     * functionality out.
     */

    // Remove the primary instance childnode from the original model
    this.xml.querySelector( 'instance' ).removeChild( modelInstanceChildEl );
    // checking if IE
    if ( window.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {
        // IE does not support adoptNode
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
 * Trims values of all Form elements
 */
FormModel.prototype.trimValues = function() {
    this.node( null, null, {
        noEmpty: true
    } ).getElements().forEach( element => {
        element.textContent = element.textContent.trim();
    } );
};

/**
 * Sets instance ID and deprecated ID
 */
FormModel.prototype.setInstanceIdAndDeprecatedId = function() {
    let instanceIdObj;
    let instanceIdEl;
    let deprecatedIdEl;
    let metaEl;
    let instanceIdExistingVal;

    instanceIdObj = this.getMetaNode( 'instanceID' );
    instanceIdEl = instanceIdObj.getElement();
    instanceIdExistingVal = instanceIdObj.getVal();

    if ( !instanceIdEl ){
        console.warn( 'Model has no instanceID element' );

        return;
    }

    if ( this.data.instanceStr && this.data.submitted ) {
        deprecatedIdEl = this.getMetaNode( 'deprecatedID' ).getElement();

        // set the instanceID value to empty
        instanceIdEl.textContent = '';

        // add deprecatedID node if necessary
        if ( !deprecatedIdEl ) {
            deprecatedIdEl = parser.parseFromString( '<deprecatedID/>', 'text/xml' ).documentElement;
            this.xml.adoptNode( deprecatedIdEl );
            metaEl = this.xml.querySelector( '* > meta' );
            metaEl.appendChild( deprecatedIdEl );
        }
    }

    if ( !instanceIdObj.getVal() ) {
        instanceIdObj.setVal( this.evaluate( 'concat("uuid:", uuid())', 'string' ) );
    }

    // after setting instanceID, give deprecatedID element the old value of the instanceId
    // ensure dataupdate event fires by using setVal
    if ( deprecatedIdEl ) {
        this.getMetaNode( 'deprecatedID' ).setVal( instanceIdExistingVal );
    }
};

import bindJsEvaluator from './xpath-evaluator-binding';
/**
 * Creates a custom XPath Evaluator to be used for XPath Expresssions that contain custom
 * OpenRosa functions or for browsers that do not have a native evaluator.
 *
 * @type {Function}
 */
FormModel.prototype.bindJsEvaluator = bindJsEvaluator;

/**
 * @param {string} localName - node name without namespace
 * @return {Element} node
 */
FormModel.prototype.getMetaNode = function( localName ) {
    const orPrefix = this.getNamespacePrefix( OPENROSA_XFORMS_NS );
    let n = this.node( `/*/${orPrefix}:meta/${orPrefix}:${localName}` );

    if ( !n.getElement() ) {
        n = this.node( `/*/meta/${localName}` );
    }

    return n;
};

/**
 * @param {string} path - path to repeat
 * @return {string} repeat comment text
 */
FormModel.prototype.getRepeatCommentText = path => {
    path = path.trim();

    return REPEAT_COMMENT_PREFIX + path;
};

/**
 * @param {string} repeatPath - path to repeat
 * @return {string} selector
 */
FormModel.prototype.getRepeatCommentSelector = function( repeatPath ) {
    return `//comment()[self::comment()="${this.getRepeatCommentText( repeatPath )}"]`;
};

/**
 * @param {string} repeatPath - path to repeat
 * @param {number} repeatSeriesIndex - index of repeat series
 * @return {Element} node
 */
FormModel.prototype.getRepeatCommentEl = function( repeatPath, repeatSeriesIndex ) {
    return this.evaluate( this.getRepeatCommentSelector( repeatPath ), 'nodes', null, null, true )[ repeatSeriesIndex ];
};

/**
 * Adds a <repeat>able instance node in a particular series of a repeat.
 *
 * @param  {string} repeatPath - absolute path of a repeat
 * @param  {number} repeatSeriesIndex - index of the repeat series that gets a new repeat (this is always 0 for non-nested repeats)
 * @param  {boolean} merge - whether this operation is part of a merge operation (won't send dataupdate event, clears all values and
 *                           will not add ordinal attributes as these should be provided in the record)
 */
FormModel.prototype.addRepeat = function( repeatPath, repeatSeriesIndex, merge ) {
    let templateClone;
    const that = this;

    if ( !this.templates[ repeatPath ] ) {
        // This allows the model itself without requiring the controller to cal call .extractFakeTemplates()
        // to extract non-jr:templates by assuming that addRepeat would only called for a repeat.
        this.extractFakeTemplates( [ repeatPath ] );
    }

    const template = this.templates[ repeatPath ];
    const repeatSeries = this.getRepeatSeries( repeatPath, repeatSeriesIndex );
    const insertAfterNode = repeatSeries.length ? repeatSeries[ repeatSeries.length - 1 ] : this.getRepeatCommentEl( repeatPath, repeatSeriesIndex );

    // if not exists and not a merge operation
    if ( !merge ) {
        repeatSeries.forEach( el => {
            that.addOrdinalAttribute( el, repeatSeries[ 0 ] );
        } );
    }

    /**
     * If templatenodes and insertAfterNode(s) have been identified
     */
    if ( template && insertAfterNode ) {
        templateClone = template.cloneNode( true );
        insertAfterNode.after( templateClone );

        this.removeOrdinalAttributes( templateClone );
        // We should not automatically add ordinal attributes for an existing record as the ordinal values cannot be determined.
        // They should be provided in the instanceStr (record).
        if ( !merge ) {
            this.addOrdinalAttribute( templateClone, repeatSeries[ 0 ] );
        }

        // If part of a merge operation (during form load) where the values will be populated from the record, defaults are not desired.
        if ( merge ) {
            Array.prototype.slice.call( templateClone.querySelectorAll( '*' ) )
                .filter( node => node.children.length === 0 )
                .forEach( node => { node.textContent = ''; } );
        }

        // Note: the addrepeat eventhandler in Form.js takes care of initializing branches etc, so no need to fire an event here.
    } else {
        console.error( 'Could not find template node and/or node to insert the clone after' );
    }
};

/**
 * @param {Element} repeat - Set ordinal attribue to this node
 * @param {Element} firstRepeatInSeries - Used to know what the next ordinal attribute value should be. Defaults to `repeat` node.
 */
FormModel.prototype.addOrdinalAttribute = function( repeat, firstRepeatInSeries ) {
    let lastUsedOrdinal;
    let newOrdinal;
    const enkNs = this.getNamespacePrefix( ENKETO_XFORMS_NS );
    firstRepeatInSeries = firstRepeatInSeries || repeat;
    if ( config.repeatOrdinals === true && !repeat.getAttributeNS( ENKETO_XFORMS_NS, 'ordinal' ) ) {
        // getAttributeNs and setAttributeNs results in duplicate namespace declarations on each repeat node in IE11 when serializing the model.
        // However, the regular getAttribute and setAttribute do not work properly in IE11.
        lastUsedOrdinal = firstRepeatInSeries.getAttributeNS( ENKETO_XFORMS_NS, 'last-used-ordinal' ) || 0;
        newOrdinal = Number( lastUsedOrdinal ) + 1;
        firstRepeatInSeries.setAttributeNS( ENKETO_XFORMS_NS, `${enkNs}:last-used-ordinal`, newOrdinal );

        repeat.setAttributeNS( ENKETO_XFORMS_NS, `${enkNs}:ordinal`, newOrdinal );
    }
};

/**
 * Removes all ordinal attriubetes from all applicable nodes
 *
 * @param {Element} el - Target node
 */
FormModel.prototype.removeOrdinalAttributes = el => {
    if ( config.repeatOrdinals === true ) {
        // Find all nested repeats first (this is only used for repeats that have no template).
        // The querySelector is actually too unspecific as it matches all ordinal attributes in ANY namespace.
        // However the proper [enk\\:ordinal] doesn't work if setAttributeNS was used to add the attribute.
        const repeats = Array.prototype.slice.call( el.querySelectorAll( '[*|ordinal]' ) );
        repeats.push( el );
        for ( let i = 0; i < repeats.length; i++ ) {
            repeats[ i ].removeAttributeNS( ENKETO_XFORMS_NS, 'last-used-ordinal' );
            repeats[ i ].removeAttributeNS( ENKETO_XFORMS_NS, 'ordinal' );
        }
    }
};

/**
 * Obtains a single series of repeat element;
 *
 * @param {string} repeatPath - The absolute path of the repeat.
 * @param {number} repeatSeriesIndex - The index of the series of that repeat.
 * @return {Array<Element>} Array of all repeat elements in a series.
 */
FormModel.prototype.getRepeatSeries = function( repeatPath, repeatSeriesIndex ) {
    let pathSegments;
    let nodeName;
    let checkEl;
    const repeatCommentEl = this.getRepeatCommentEl( repeatPath, repeatSeriesIndex );
    const result = [];

    // RepeatCommentEl is null if the requested repeatseries is a nested repeat and its ancestor repeat
    // has 0 instances.
    if ( repeatCommentEl ) {
        pathSegments = repeatCommentEl.textContent.substr( REPEAT_COMMENT_PREFIX.length ).split( '/' );
        nodeName = pathSegments[ pathSegments.length - 1 ];
        checkEl = repeatCommentEl.nextSibling;

        // then add all subsequent repeats
        while ( checkEl ) {
            // Ignore any sibling text and comment nodes (e.g. whitespace with a newline character)
            // also deal with repeats that have non-repeat siblings in between them, event though that would be a bug.
            if ( checkEl.nodeName && checkEl.nodeName === nodeName ) {
                result.push( checkEl );
            }
            checkEl = checkEl.nextSibling;
        }
    }

    return result;
};

/**
 * Determines the index of a repeated node amongst all nodes with the same XPath selector
 *
 * @param {Element} element - Target node
 * @return {number} Determined index
 */
FormModel.prototype.determineIndex = function( element ) {
    if ( element ) {
        const nodeName = element.nodeName;
        const path = getXPath( element, 'instance' );
        const family = Array.prototype.slice.call( this.xml.querySelectorAll( nodeName.replace( /\./g, '\\.' ) ) )
            .filter( node => path === getXPath( node, 'instance' ) );

        return family.length === 1 ? null : family.indexOf( element );
    } else {
        console.error( 'no node, or multiple nodes, provided to determineIndex function' );

        return -1;
    }
};

/**
 * Extracts all templates from the model and stores them in a Javascript object.
 */
FormModel.prototype.extractTemplates = function() {
    const that = this;

    // in reverse document order to properly deal with nested repeat templates
    this.getTemplateNodes().reverse().forEach( templateEl => {
        const xPath = getXPath( templateEl, 'instance' );
        that.addTemplate( xPath, templateEl );
        /*
         * Nested repeats that have a template attribute are correctly added to the templates object.
         * The template of the repeat ancestor of the nested repeat contains the correct comment.
         * However, since the ancestor repeat (template)
         */
        templateEl.remove();
    } );
};

/**
 * @param {Array<string>} repeatPaths - repeat paths
 */
FormModel.prototype.extractFakeTemplates = function( repeatPaths ) {
    const that = this;
    let repeat;

    repeatPaths.forEach( repeatPath => {
        // Filter by elements that are the first in a series. This means that multiple instances of nested repeats
        // all get a comment insertion point.
        repeat = that.evaluate( repeatPath, 'node', null, null, true );
        if ( repeat ) {
            that.addTemplate( repeatPath, repeat, true );
        }
    } );
};

/**
 * @param {string} repeatPath - path to repeat
 */
FormModel.prototype.addRepeatComments = function( repeatPath ) {
    const comment = this.getRepeatCommentText( repeatPath );

    // Find all repeat series.
    this.evaluate( repeatPath, 'nodes', null, null, true ).forEach( repeat => {
        if ( !hasPreviousSiblingElementSameName( repeat ) && !hasPreviousCommentSiblingWithContent( repeat, comment ) ) {
            // Add a comment to the primary instance that serves as an insertion point for each repeat series,
            repeat.before( document.createComment( comment ) );
        }
    } );
};

/**
 * @param {string} repeatPath - path to repeat
 * @param {Element} repeat - Target node
 * @param {boolean} empty - whether to empty values before adding the template
 */
FormModel.prototype.addTemplate = function( repeatPath, repeat, empty ) {
    this.addRepeatComments( repeatPath );

    if ( !this.templates[ repeatPath ] ) {
        const clone = repeat.cloneNode( true );
        clone.removeAttribute( 'template' );
        clone.removeAttribute( 'jr:template' );
        if ( empty ) {
            Array.prototype.slice.call( clone.querySelectorAll( '*' ) )
                .filter( node => node.children.length === 0 )
                .forEach( node => {
                    node.textContent = '';
                } );
        }
        // Add to templates object.
        this.templates[ repeatPath ] = clone;
    }
};

/**
 * @return {Array<Element>} template nodes list
 */
FormModel.prototype.getTemplateNodes = function() {
    const jrPrefix = this.getNamespacePrefix( JAVAROSA_XFORMS_NS );

    return this.evaluate( `/model/instance[1]/*//*[@${jrPrefix}:template]`, 'nodes', null, null, true );
};

/**
 * Obtains a cleaned up string of the data instance
 *
 * @return {string} XML string
 */
FormModel.prototype.getStr = function() {
    let dataStr = ( new XMLSerializer() ).serializeToString( this.xml.querySelector( 'instance > *' ) || this.xml.documentElement, 'text/xml' );
    // restore default namespaces
    dataStr = dataStr.replace( /\s(data-)(xmlns=("|')[^\s>]+("|'))/g, ' $2' );
    // remove repeat comments
    dataStr = dataStr.replace( new RegExp( `<!--${REPEAT_COMMENT_PREFIX}\\/[^>]+-->`, 'g' ), '' );
    // If not IE, strip duplicate namespace declarations. IE doesn't manage to add a namespace declaration to the root element.
    if ( navigator.userAgent.indexOf( 'Trident/' ) === -1 ) {
        dataStr = this.removeDuplicateEnketoNsDeclarations( dataStr );
    }

    return dataStr;
};

/**
 * @param {string} xmlStr - XML string
 * @return {string} XML string without duplicates
 */
FormModel.prototype.removeDuplicateEnketoNsDeclarations = function( xmlStr ) {
    let i = 0;
    const declarationExp = new RegExp( `( xmlns:${this.getNamespacePrefix( ENKETO_XFORMS_NS )}="${ENKETO_XFORMS_NS}")`, 'g' );

    return xmlStr.replace( declarationExp, match => {
        i++;
        if ( i > 1 ) {
            return '';
        } else {
            return match;
        }
    } );
};

/**
 * There is a huge historic issue (stemming from JavaRosa) that has resulted in the usage of incorrect formulae
 * on nodes inside repeat nodes.
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
 * This function should be removed when we can reasonbly expect not many 'old XForms' to be in use any more.
 *
 * Already it should leave proper XPaths untouched.
 *
 * @param {string} expr - The XPath expression
 * @param {string} selector - Selector of the (context) node on which expression is evaluated
 * @param {number} index - Index of the instance node with that selector
 */
FormModel.prototype.makeBugCompliant = function( expr, selector, index ) {
    if ( this.noRepeatRefErrorExpected ) {
        return expr;
    }

    let target = this.node( selector, index ).getElement();

    // target is null for nested repeats if no repeats exist
    if ( !target ) {
        return expr;
    }

    const parents = [ target ];

    while ( target && target.parentElement && target.nodeName.toLowerCase() !== 'instance' ) {
        target = target.parentElement;
        parents.push( target );
    }

    // traverse collection in reverse
    parents.forEach( element => {
        // escape any dots in the node name
        const nodeName = element.nodeName.replace( /\./g, '\\.' );
        const siblingsAndSelf = getSiblingElementsAndSelf( element, `${nodeName}:not([template])` );

        // if the node is a repeat node that has been cloned at least once (i.e. if it has siblings with the same nodeName)
        if ( siblingsAndSelf.length > 1 ) {
            const parentSelector = getXPath( element, 'instance' );
            const parentIndex = siblingsAndSelf.indexOf( element );
            // Add position to segments that do not have an XPath predicate.
            expr = expr.replace( new RegExp( `${parentSelector}/`, 'g' ), `${parentSelector}[${parentIndex + 1}]/` );
        }
    } );

    return expr;
};

/**
 * Set namespaces for all nodes
 */
FormModel.prototype.setNamespaces = function() {
    /**
     * Passing through all nodes would be very slow with an XForms model that contains lots of nodes such as large secondary instances.
     * (The namespace XPath axis is not support in native browser XPath evaluators unfortunately).
     *
     * For now it has therefore been restricted to only look at the top-level node in the primary instance and in the secondary instances.
     * We can always expand that later.
     */
    const start = this.hasInstance ? '/model/instance' : '';
    const nodes = this.evaluate( `${start}/*`, 'nodes', null, null, true );
    const that = this;
    let prefix;

    nodes.forEach( node => {
        if ( node.hasAttributes() ) {
            Array.from( node.attributes ).forEach( attribute => {
                if ( attribute.name.indexOf( 'xmlns:' ) === 0 ) {
                    that.namespaces[ attribute.name.substring( 6 ) ] = attribute.value;
                }
            } );
        }
        // add required namespaces to resolver and document if they are missing
        [
            [ 'orx', OPENROSA_XFORMS_NS, false ],
            [ 'jr', JAVAROSA_XFORMS_NS, false ],
            [ 'enk', ENKETO_XFORMS_NS, config.repeatOrdinals === true ],
            [ 'odk', ODK_XFORMS_NS, false ]
        ].forEach( arr => {
            if ( !that.getNamespacePrefix( arr[ 1 ] ) ) {
                prefix = ( !that.namespaces[ arr[ 0 ] ] ) ? arr[ 0 ] : `__${arr[ 0 ]}`;
                // add to resolver
                that.namespaces[ prefix ] = arr[ 1 ];
                // add to document
                if ( arr[ 2 ] ) {
                    node.setAttributeNS( 'http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`, arr[ 1 ] );
                }
            }
        } );
    } );
};

/**
 * @param {string} namespace - Target namespace
 * @return {string|undefined} Namespace prefix
 */
FormModel.prototype.getNamespacePrefix = function( namespace ) {
    const found = Object.entries( this.namespaces ).find( arr => arr[ 1 ] === namespace );

    return found ? found[ 0 ] : undefined;
};

/**
 * Returns a namespace resolver with single `lookupNamespaceURI` method
 *
 * @return {{lookupNamespaceURI: Function}} namespace resolver
 */
FormModel.prototype.getNsResolver = function() {
    const namespaces = ( typeof this.namespaces === 'undefined' ) ? {} : this.namespaces;

    return {
        lookupNamespaceURI( prefix ) {
            return namespaces[ prefix ] || null;
        }
    };
};


/**
 * Shift root to first instance for all absolute paths not starting with /model
 *
 * @param {string} expr - Original expression
 * @return {string} New expression
 */
FormModel.prototype.shiftRoot = function( expr ) {
    const LITERALS = /"([^"]*)(")|'([^']*)(')/g;
    if ( this.hasInstance ) {
        // Encode all string literals in order to exclude them, without creating a monsterly regex
        expr = expr.replace( LITERALS, ( m, p1, p2, p3, p4 ) => {
            const encoded = typeof p1 !== 'undefined' ? encodeURIComponent( p1 ) : encodeURIComponent( p3 );
            const quote = p2 || p4;

            return quote + encoded + quote;
        } );
        // Insert /model/instance[1]
        expr = expr.replace( /^(\/(?!model\/)[^/][^/\s,"']*\/)/g, '/model/instance[1]$1' );
        expr = expr.replace( /([^a-zA-Z0-9.\])/*_-])(\/(?!model\/)[^/][^/\s,"']*\/)/g, '$1/model/instance[1]$2' );
        // Decode string literals
        expr = expr.replace( LITERALS, ( m, p1, p2, p3, p4 ) => {
            const decoded = typeof p1 !== 'undefined' ? decodeURIComponent( p1 ) : decodeURIComponent( p3 );
            const quote = p2 || p4;

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
 * @param {string} expr - Original expression
 * @return {string} New expression
 */
FormModel.prototype.replaceInstanceFn = function( expr ) {
    let prefix;
    const that = this;

    // TODO: would be more consistent to use utils.parseFunctionFromExpression() and utils.stripQuotes
    return expr.replace( INSTANCE, ( match, quote, id ) => {
        prefix = `/model/instance[@id="${id}"]`;
        // check if referred instance exists in model
        if ( that.evaluate( prefix, 'nodes', null, null, true ).length ) {
            return prefix;
        } else {
            throw new FormLogicError( `instance "${id}" does not exist in model` );
        }
    } );
};

/**
 * Replaces current() with /absolute/path/to/node to ensure the context is shifted to the primary instance
 *
 * Doing this here instead of adding a current() function to the XPath evaluator, means we can keep using
 * the much faster native evaluator in most cases!
 *
 * Root will be shifted later, and repeat positions are already injected into context selector.
 *
 * @param {string} expr - Original expression
 * @param {string} contextSelector - Context selector
 * @return {string} New expression
 */
FormModel.prototype.replaceCurrentFn = ( expr, contextSelector ) => {
    return expr.replace( /current\(\)/g, `${contextSelector}` );
};

/**
 * Replaces indexed-repeat(node, path, position, path, position, etc) substrings by converting them
 * to their native XPath equivalents using [position() = x] predicates
 *
 * @param {string} expr - The XPath expression
 * @param {string} selector - context path
 * @param {number} index - index of context node
 * @return {string} Converted XPath expression
 */
FormModel.prototype.replaceIndexedRepeatFn = function( expr, selector, index ) {
    const that = this;
    const indexedRepeats = parseFunctionFromExpression( expr, 'indexed-repeat' );

    indexedRepeats.forEach( indexedRepeat => {
        let i, positionedPath;
        let position;
        const params = indexedRepeat[ 1 ];

        if ( params.length % 2 === 1 ) {

            positionedPath = params[ 0 ];

            for ( i = params.length - 1; i > 1; i -= 2 ) {
                // The position will become an XPath predicate. The context for an XPath predicate, is not the same
                // as the context for the complete expression, so we have to evaluate the position separately. Otherwise
                // relative paths would break.
                position = !isNaN( params[ i ] ) ? params[ i ] : that.evaluate( params[ i ], 'number', selector, index, true );
                positionedPath = positionedPath.replace( params[ i - 1 ], `${params[ i - 1 ]}[position() = ${position}]` );
            }

            expr = expr.replace( indexedRepeat[ 0 ], positionedPath );

        } else {
            throw new FormLogicError( `indexed repeat with incorrect number of parameters found: ${indexedRepeat[ 0 ]}` );
        }
    } );

    return expr;
};

/**
 * @param {string} expr - The XPath expression
 * @return {string} Converted XPath expression
 */
FormModel.prototype.replaceVersionFn = function( expr ) {
    const that = this;
    let version;
    const versions = parseFunctionFromExpression( expr, 'version' );

    versions.forEach( versionPart => {
        version = version || that.evaluate( '/node()/@version', 'string', null, 0, true );
        // ignore arguments
        expr = expr.replace( versionPart[ 0 ], `"${version}"` );
    } );

    return expr;
};

/**
 * @param {string} expr - The XPath expression
 * @param {string} selector - context path
 * @param {number} index - index of context node
 * @return {string} Converted XPath expression
 */
FormModel.prototype.replacePullDataFn = function( expr, selector, index ) {
    let pullDataResult;
    const that = this;
    const replacements = this.convertPullDataFn( expr, selector, index );

    for ( const pullData in replacements ) {
        if ( Object.prototype.hasOwnProperty.call( replacements, pullData ) ) {
            // We evaluate this here, so we can use the native evaluator safely. This speeds up pulldata() by about a factor *740*!
            pullDataResult = that.evaluate( replacements[ pullData ], 'string', selector, index, true );
            expr = expr.replace( pullData, `"${pullDataResult}"` );
        }
    }

    return expr;
};

/**
 * @param {string} expr - The XPath expression
 * @param {string} selector - context path
 * @param {number} index - index of context node
 * @return {string} Converted XPath expression
 */
FormModel.prototype.convertPullDataFn = function( expr, selector, index ) {
    const that = this;
    const pullDatas = parseFunctionFromExpression( expr, 'pulldata' );
    const replacements = {};

    if ( !pullDatas.length ) {
        return replacements;
    }

    pullDatas.forEach( pullData => {
        let searchValue;
        let searchXPath;
        const params = pullData[ 1 ];

        if ( params.length === 4 ) {

            // strip quotes
            params[ 1 ] = stripQuotes( params[ 1 ] );
            params[ 2 ] = stripQuotes( params[ 2 ] );

            // TODO: the 2nd and 3rd parameter could probably also be expressions.

            // The 4th argument will become an XPath predicate. The context for an XPath predicate, is not the same
            // as the context for the complete expression, so we have to evaluate the position separately. Otherwise
            // relative paths would break.
            searchValue = `'${that.evaluate( params[ 3 ], 'string', selector, index, true )}'`;
            searchXPath = `instance(${params[ 0 ]})/root/item[${params[ 2 ]} = ${searchValue}]/${params[ 1 ]}`;

            replacements[ pullData[ 0 ] ] = searchXPath;

        } else {
            throw new FormLogicError( `pulldata with incorrect number of parameters found: ${pullData[ 0 ]}` );
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
 * @param {string} expr - The expression to evaluate
 * @param {string} [resTypeStr] - "boolean", "string", "number", "node", "nodes" (best to always supply this)
 * @param {string} [selector] - Query selector which will be use to provide the context to the evaluator
 * @param {number} [index] - 0-based index of selector in document
 * @param {boolean} [tryNative] - Whether an attempt to try the Native Evaluator is safe (ie. whether it is
 *                                certain that there are no date comparisons)
 * @return {number|string|boolean|Array<Element>} The result
 */
FormModel.prototype.evaluate = function( expr, resTypeStr, selector, index, tryNative ) {
    let j, context, doc, resTypeNum, resultTypes, result, collection, response, repeats, cacheKey, original, cacheable;

    // console.debug( 'evaluating expr: ' + expr + ' with context selector: ' + selector + ', 0-based index: ' +
    //    index + ' and result type: ' + resTypeStr );
    original = expr;
    tryNative = tryNative || false;
    resTypeStr = resTypeStr || 'any';
    index = index || 0;
    doc = this.xml;
    repeats = null;

    if ( selector ) {
        collection = this.node( selector ).getElements();
        repeats = collection.length;
        context = collection[ index ];
    } else {
        // either the first data child of the first instance or the first child (for loaded instances without a model)
        context = this.rootElement;
    }

    if ( !context ) {
        console.error( 'no context element found', selector, index );
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
        expr = expr.trim();
        expr = this.replaceInstanceFn( expr );
        expr = this.replaceVersionFn( expr );
        expr = this.replaceCurrentFn( expr, getXPath( context, 'instance', true ) );
        // shiftRoot should come after replaceCurrentFn
        expr = this.shiftRoot( expr );
        // path corrections for repeated nodes: http://opendatakit.github.io/odk-xform-spec/#a-big-deviation-with-xforms
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
        if ( Object.prototype.hasOwnProperty.call( resultTypes, resTypeNum ) ) {
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
            //console.log( '%cWell native XPath evaluation did not work... No worries, worth a shot, the expression probably ' +
            //    'contained unknown OpenRosa functions or errors:', expr );
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
            throw new FormLogicError( `Could not evaluate: ${expr}, message: ${e.message}` );
        }
    }

    // get desired value from the result object
    if ( result ) {
        // for type = any, see if a valid string, number or boolean is returned
        if ( resTypeNum === 0 ) {
            for ( resTypeNum in resultTypes ) {
                if ( Object.prototype.hasOwnProperty.call( resultTypes, resTypeNum ) ) {
                    resTypeNum = Number( resTypeNum );
                    if ( resTypeNum === Number( result.resultType ) && resTypeNum > 0 && resTypeNum < 4 ) {
                        response = result[ resultTypes[ resTypeNum ][ 2 ] ];
                        break;
                    }
                }
            }
            if ( !response ) {
                console.error( `Expression: ${expr} did not return any boolean, string or number value as expected` );
            }
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
 * Placeholder function meant to be overwritten
 */
FormModel.prototype.getUpdateEventData = () => /*node, type*/ {};

/**
 * Placeholder function meant to be overwritten
 */
FormModel.prototype.getRemovalEventData = () => /* node */ {};

/**
 * Exposed {@link module:types|types} to facilitate extending with custom types
 *
 * @type {object}
 */
FormModel.prototype.types = types;

export { FormModel };
