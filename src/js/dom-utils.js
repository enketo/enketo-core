/**
 * Gets siblings that match selector and self _in DOM order_.
 * @param {} element 
 * @param {*} selector 
 */
function getSiblingElementsAndSelf( element, selector ) {
    return _getSiblingElements( element, selector, [ element ] );
}

function getSiblingElements( element, selector ) {
    return _getSiblingElements( element, selector );
}

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

function getAncestors( element, selector = '*' ) {
    const ancestors = [];
    let parent = element.parentElement;

    while ( parent ) {
        if ( parent.matches( selector ) ) {
            // document order
            ancestors.unshift( parent );
        }
        parent = parent.parentElement;
    }

    return ancestors;
}

function closestAncestorUntil( element, filterSelector, endSelector ) {
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

function empty( element ) {
    [ ...element.children ].forEach( el => el.remove() );
}

/** 
 * Adapted from https://stackoverflow.com/a/46522991/3071529
 * 
 * A storage solution aimed at replacing jQuerys data function.
 * Implementation Note: Elements are stored in a (WeakMap)[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap].
 * This makes sure the data is garbage collected when the node is removed.
 */
const elementDataStore = {
    _storage: new WeakMap(),
    put: function( element, key, obj ) {
        if ( !this._storage.has( element ) ) {
            this._storage.set( element, new Map() );
        }
        this._storage.get( element ).set( key, obj );
    },
    get: function( element, key ) {
        const item = this._storage.get( element );
        return item ? item.get( key ) : item;
    },
    has: function( element, key ) {
        const item = this._storage.get( element );
        return item && item.has( key );
    },
    remove: function( element, key ) {
        var ret = this._storage.get( element ).delete( key );
        if ( !this._storage.get( key ).size === 0 ) {
            this._storage.delete( element );
        }
        return ret;
    }
};

export {
    elementDataStore,
    getSiblingElementsAndSelf,
    getSiblingElements,
    getAncestors,
    closestAncestorUntil,
    empty,
};
