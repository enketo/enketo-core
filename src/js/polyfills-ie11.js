require( 'core-js/es6/object' );
require( 'core-js/es6/array' );
require( 'core-js/es7/array' );
require( 'core-js/es6/map' );

if ( !Object.entries ) {
    Object.entries = function( obj ) {
        var ownProps = Object.keys( obj ),
            i = ownProps.length,
            resArray = new Array( i ); // preallocate the Array
        while ( i-- )
            resArray[ i ] = [ ownProps[ i ], obj[ ownProps[ i ] ] ];

        return resArray;
    };
}

if ( !Element.prototype.matches ) {
    Element.prototype.matches = Element.prototype.msMatchesSelector;
}

// from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
( function( arr ) {
    arr.forEach( function( item ) {
        if ( item.hasOwnProperty( 'remove' ) ) {
            return;
        }
        Object.defineProperty( item, 'remove', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function remove() {
                if ( this.parentNode !== null )
                    this.parentNode.removeChild( this );
            }
        } );
    } );
} )( [ Element.prototype, CharacterData.prototype, DocumentType.prototype ] );

( function() {

    if ( typeof window.CustomEvent === 'function' ) return false;

    function CustomEvent( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
} )();
