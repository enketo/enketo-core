// Overwrites native 'children' prototype.
// Adds Document & DocumentFragment support for IE9 & Safari.
// Returns array instead of HTMLCollection.
;
( function( constructor ) {
    if ( constructor &&
        constructor.prototype &&
        constructor.prototype.children == null ) {
        Object.defineProperty( constructor.prototype, 'children', {
            get: function() {
                var i = 0,
                    node, nodes = this.childNodes,
                    children = [];
                while ( node = nodes[ i++ ] ) {
                    if ( node.nodeType === 1 ) {
                        children.push( node );
                    }
                }
                return children;
            }
        } );
    }
} )( window.Node || window.Element );
