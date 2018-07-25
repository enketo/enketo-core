require( 'core-js/es6/object' );
require( 'core-js/es6/array' );
require( 'core-js/es7/array' );
require( 'core-js/es6/map' );
require( 'core-js/es6/promise' );
require( 'core-js/es7/promise' );

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


// Replace download functionality for file upload and drawing widgets.
if ( window.navigator.msSaveOrOpenBlob && window.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {
    var utils = require( './utils' );
    var fileManager = require( 'enketo/file-manager' );
    var $ = require( 'jquery' );

    utils.updateDownloadLink = function( anchor, objectUrl, fileName ) {
        // Shut off / reset previous link
        $( anchor ).off( 'click' );
        if ( objectUrl ) {
            fileManager.urlToBlob( objectUrl )
                .then( function( blob ) {
                    $( anchor ).off( 'click' ).on( 'click', function() {
                        window.navigator.msSaveOrOpenBlob( blob, fileName );
                        return false;
                    } ).removeAttr( 'href' );
                } )
                .catch( function( e ) {
                    console.error( e );
                } );
        } else {
            // This wil hide the link with CSS
            anchor.setAttribute( 'href', '' );
        }
    };
}
