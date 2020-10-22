/**
 * @module dom-utils
 */

/**
 * Gets siblings that match selector and self _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} [selector] - A CSS selector.
 * @return {Array<Node>} Array of sibling nodes plus target element.
 */
function getSiblingElementsAndSelf( element, selector ) {
    return _getSiblingElements( element, selector, [ element ] );
}

/**
 * Gets siblings that match selector _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} [selector] - A CSS selector.
 * @return {Array<Node>} Array of sibling nodes.
 */
function getSiblingElements( element, selector ) {
    return _getSiblingElements( element, selector );
}

/**
 * Gets siblings that match selector _in DOM order_.
 *
 * @param {Node} element - Target element.
 * @param {string} [selector] - A CSS selector.
 * @param {Array<Node>} [startArray] - Array of nodes to start with.
 * @return {Array<Node>} Array of sibling nodes.
 */
function _getSiblingElements( element, selector = '*', startArray = [] ) {
    const siblings = startArray;
    let prev = element.previousElementSibling;
    let next = element.nextElementSibling;

    while ( prev ) {
        if ( prev.matches( selector ) ) {
            siblings.unshift( prev );
        }
        prev = prev.previousElementSibling;
    }

    while ( next ) {
        if ( next.matches( selector ) ) {
            siblings.push( next );
        }
        next = next.nextElementSibling;
    }

    return siblings;
}

/**
 * Gets ancestors that match selector _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} [filterSelector] - A CSS selector.
 * @param {string} [endSelector] - A CSS selector indicating where to stop. It will include this element if matched by the filter.
 * @return {Array<Node>} Array of ancestors.
 */
function getAncestors( element, filterSelector = '*', endSelector ) {
    const ancestors = [];
    let parent = element.parentElement;

    while ( parent ) {
        if ( parent.matches( filterSelector ) ) {
            // document order
            ancestors.unshift( parent );
        }
        parent = endSelector && parent.matches( endSelector ) ? null : parent.parentElement;
    }

    return ancestors;
}

/**
 * Gets closest ancestor that match selector until the end selector.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} filterSelector - A CSS selector.
 * @param {string} [endSelector] - A CSS selector indicating where to stop. It will include this element if matched by the filter.
 * @return {Node} Closest ancestor.
 */
function closestAncestorUntil( element, filterSelector = '*', endSelector ) {
    let parent = element.parentElement;
    let found = null;

    while ( parent && !found ) {
        if ( parent.matches( filterSelector ) ) {
            found = parent;
        }
        parent = endSelector && parent.matches( endSelector ) ? null : parent.parentElement;
    }

    return found;
}

function getChildren( element, selector = '*' ) {
    return [ ...element.children ]
        .filter( el => el.matches( selector ) );
}

/**
 * Removes all children elements.
 *
 * @static
 * @param {Node} element - Target element.
 * @return {undefined}
 */
function empty( element ) {
    [ ...element.children ].forEach( el => el.remove() );
}

/**
 * @param {Element} el - Target node
 * @return {boolean} Whether previous sibling has same node name
 */
function hasPreviousSiblingElementSameName( el ) {
    let found = false;
    const nodeName = el.nodeName;
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
}

/**
 * @param {Element} node - Target node
 * @param {string} content - Text content to look for
 * @return {boolean} Whether previous comment sibling has given text content
 */
function hasPreviousCommentSiblingWithContent( node, content ) {
    let found = false;
    node = node.previousSibling;

    while ( node ) {
        if ( node.nodeType === Node.COMMENT_NODE && node.textContent === content ) {
            found = true;
            break;
        }
        node = node.previousSibling;
    }

    return found;
}


/**
 * Creates an XPath from a node
 *
 * @param {Element} node - XML node
 * @param {string} [rootNodeName] - Defaults to #document
 * @param {boolean} [includePosition] - Whether or not to include the positions `/path/to/repeat[2]/node`
 * @return {string} XPath
 */
function getXPath( node, rootNodeName = '#document', includePosition = false ) {
    let index;
    const steps = [];
    let position = '';
    if ( !node || node.nodeType !== 1 ) {
        return null;
    }
    const nodeName = node.nodeName;
    let parent = node.parentElement;
    let parentName = parent ? parent.nodeName : null;

    if ( includePosition ) {
        index = getRepeatIndex( node );
        if ( index > 0 ) {
            position = `[${index + 1}]`;
        }
    }

    steps.push( nodeName + position );

    while ( parent && parentName !== rootNodeName && parentName !== '#document' ) {
        if ( includePosition ) {
            index = getRepeatIndex( parent );
            position = ( index > 0 ) ? `[${index + 1}]` : '';
        }
        steps.push( parentName + position );
        parent = parent.parentElement;
        parentName = parent ? parent.nodeName : null;
    }

    return `/${steps.reverse().join( '/' )}`;
}

/**
 * Obtains the index of a repeat instance within its own series.
 *
 * @param {Element} node - XML node
 * @return {number} index
 */
function getRepeatIndex( node ) {
    let index = 0;
    const nodeName = node.nodeName;
    let prevSibling = node.previousSibling;

    while ( prevSibling ) {
        // ignore any sibling text and comment nodes (e.g. whitespace with a newline character)
        if ( prevSibling.nodeName && prevSibling.nodeName === nodeName ) {
            index++;
        }
        prevSibling = prevSibling.previousSibling;
    }

    return index;
}

/**
 * Adapted from https://stackoverflow.com/a/46522991/3071529
 *
 * A storage solution aimed at replacing jQuerys data function.
 * Implementation Note: Elements are stored in a (WeakMap)[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap].
 * This makes sure the data is garbage collected when the node is removed.
 *
 * @namespace
 */
const elementDataStore = {
    /**
     * @type {WeakMap}
     */
    _storage: new WeakMap(),
    /**
     * Adds object to element storage. Ensures that element storage exist.
     *
     * @param {Node} element - target element
     * @param {string} key - name of the stored data
     * @param {object} obj - stored data
     */
    put: function( element, key, obj ) {
        if ( !this._storage.has( element ) ) {
            this._storage.set( element, new Map() );
        }
        this._storage.get( element ).set( key, obj );
    },
    /**
     * Return object from element storage.
     *
     * @param {Node} element - target element
     * @param {string} key - name of the stored data
     * @return {object} stored data object
     */
    get: function( element, key ) {
        const item = this._storage.get( element );

        return item ? item.get( key ) : item;
    },
    /**
     * Checkes whether element has given storage item.
     *
     * @param {Node} element - target element
     * @param {string} key - name of the stored data
     * @return {boolean} whether data is present
     */
    has: function( element, key ) {
        const item = this._storage.get( element );

        return item && item.has( key );
    },
    /**
     * Removes item from element storage. Removes element storage if empty.
     *
     * @param {Node} element - target element
     * @param {string} key - name of the stored data
     * @return {object} removed data object
     */
    remove: function( element, key ) {
        var ret = this._storage.get( element ).delete( key );
        if ( !this._storage.get( key ).size === 0 ) {
            this._storage.delete( element );
        }

        return ret;
    }
};

class MutationsTracker{

    constructor( el = document.documentElement ){
        let mutations = 0;
        let previousMutations = mutations;
        this.classChanges = new WeakMap();
        this.quiet = true;

        const mutationObserver = new MutationObserver(  mutations => {
            mutations.forEach(  mutation => {
                mutations++;
                if ( mutation.type === 'attributes' && mutation.attributeName === 'class' ){
                    const trackedClasses = this.classChanges.get( mutation.target ) || [];
                    trackedClasses.forEach( obj => {
                        if( mutation.target.classList.contains( obj.className ) ){
                            obj.completed = true;
                            this.classChanges.set( mutation.target, trackedClasses );
                        }
                    } );
                }
            } );
        } );

        mutationObserver.observe( el, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
            characterDataOldValue: true
        } );

        const checkInterval = setInterval( () => {
            if ( previousMutations === mutations ){
                this.quiet = true;
                mutationObserver.disconnect();
                clearInterval( checkInterval );
            } else {
                this.quiet = false;
                previousMutations = mutations;
            }
        }, 100 );
    }

    _resolveWhenTrue( fn ){
        if ( typeof fn !== 'function' ){
            return Promise.reject();
        }

        return new Promise( resolve => {
            const checkInterval = setInterval( () => {
                if ( fn.call( this ) ){
                    clearInterval( checkInterval );
                    resolve();
                }
            }, 10 );
        } );
    }

    waitForClassChange( element, className ){
        const trackedClasses = this.classChanges.get( element ) || [];

        if ( !trackedClasses.some( obj => obj.className === className ) ){
            trackedClasses.push( { className } );
            this.classChanges.set( element, trackedClasses );
        }

        return this._resolveWhenTrue( () => this.classChanges.get( element ).find( obj => obj.className === className ).completed );
    }

    waitForQuietness(){
        return this._resolveWhenTrue( () => this.quiet );
    }

}

export {
    /**
     * @static
     * @see {@link module:dom-utils~elementDataStore|elementDataStore}
     */
    elementDataStore,
    getSiblingElementsAndSelf,
    getSiblingElements,
    getAncestors,
    getChildren,
    getRepeatIndex,
    getXPath,
    hasPreviousCommentSiblingWithContent,
    hasPreviousSiblingElementSameName,
    closestAncestorUntil,
    empty,
    MutationsTracker
};
