/**
 * This is duplicate of the same function in the file-manager. This was done because:
 * 1. The file-manager is normally overwritten in apps and urlToBlob was only used by the fileManager internally. 
 *    Having a dependency in an IE11 polyfill file, means it would have to be added to the overriding file-manager just for IE11.
 *    We'd like to avoid having any IE11 specific code in the main Enketo build.
 * 2. We don't care about inefficiencies for IE-hacks, since in the future, an IE11-specific build will 
 *    not be loaded by modern browsers (and we care only about peformance in modern browsers.)
 */
function urlToBlob( url ) {
    var xhr = new XMLHttpRequest();

    return new Promise( function( resolve ) {
        xhr.open( 'GET', url );
        xhr.responseType = 'blob';
        xhr.onload = function() {
            resolve( xhr.response );
        };
        xhr.send();
    } );
}

// Replace download functionality for file upload and drawing widgets.
( function() {
    if ( window.navigator.msSaveOrOpenBlob && window.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {
        var utils = require( './utils' );
        var $ = require( 'jquery' );

        utils.updateDownloadLink = function( anchor, objectUrl, fileName ) {
            // Shut off / reset previous link
            $( anchor ).off( 'click' );
            if ( objectUrl ) {

                urlToBlob( objectUrl )
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
} )();
