// Overwrites native 'children' prototype.
// Adds Document & DocumentFragment support for IE9 & Safari.
// Returns array instead of HTMLCollection.
( function( constructor ) {
    if ( constructor &&
        constructor.prototype &&
        constructor.prototype.children == null ) {
        Object.defineProperty( constructor.prototype, 'children', {
            get: function() {
                var i = 0,
                    node, nodes = this.childNodes,
                    children = [];
                while ( ( node = nodes[ i++ ] ) ) {
                    if ( node.nodeType === 1 ) {
                        children.push( node );
                    }
                }

                return children;
            }
        } );
    }
} )( window.Node || window.Element );

/**
 * A spec-compliant polyfill for 'parentElement'.
 *
 * @author Frederik Wessberg <https://github.com/wessberg>
 * @version 1.0.0
 */

( function() {
    // Environment doesn't support 'parentElement' or only supports it on nodes that are Elements themselves.
    // To unify behavior between all browsers and to be spec-compliant, parentElement should be supported on any Node.
    function implementation() {
        return this.parentNode instanceof Element ? this.parentNode : null;
    }

    if ( !( 'parentElement' in Document.prototype ) || !( 'parentElement' in Text.prototype ) || !( 'parentElement' in Attr.prototype ) ) {

        try {
            Object.defineProperty( Attr.prototype, 'parentElement', { configurable: false, enumerable: false, get: implementation } );
        } catch ( e ) {
            // IE8
            Attr.prototype.parentElement = implementation;
        }

        try {
            Object.defineProperty( Text.prototype, 'parentElement', { configurable: false, enumerable: false, get: implementation } );
        } catch ( e ) {
            // IE8
            Text.prototype.parentElement = implementation;
        }

        try {
            Object.defineProperty( Element.prototype, 'parentElement', { configurable: false, enumerable: false, get: implementation } );
        } catch ( e ) {
            // IE8
            Element.prototype.parentElement = implementation;
        }

        try {
            Object.defineProperty( Document.prototype, 'parentElement', { configurable: false, enumerable: false, get: implementation } );
        } catch ( e ) {
            // IE8
            Document.prototype.parentElement = implementation;
        }

    }
}() );


// I think the Financial Times polyfill does not include Comment Nodes
//from: https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/after()/after().md
( function( arr ) {
    arr.forEach( function( item ) {
        if ( Object.prototype.hasOwnProperty.call( item, 'after' ) ) {
            return;
        }
        Object.defineProperty( item, 'after', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function after() {
                var argArr = Array.prototype.slice.call( arguments ),
                    docFrag = document.createDocumentFragment();

                argArr.forEach( function( argItem ) {
                    var isNode = argItem instanceof Node;
                    docFrag.appendChild( isNode ? argItem : document.createTextNode( String( argItem ) ) );
                } );

                this.parentNode.insertBefore( docFrag, this.nextSibling );
            }
        } );
    } );
} )( [ Element.prototype, CharacterData.prototype, DocumentType.prototype ] );
