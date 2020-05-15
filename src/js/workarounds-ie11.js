// 1. Replace download functionality for file upload and drawing widgets.
( function() {
    if ( window.navigator.msSaveOrOpenBlob && window.navigator.userAgent.indexOf( 'Trident/' ) >= 0 ) {

        window.updateDownloadLinkIe11 = function( anchor, objectUrl, fileName ) {
            var blob;
            // Shut off / reset previous link
            var listener = function() {
                window.navigator.msSaveOrOpenBlob( blob, fileName );

                return false;
            };
            anchor.removeEventListener( 'click', listener );
            if ( objectUrl ) {
                var xhr = new XMLHttpRequest();

                return new Promise( function( resolve ) {
                    xhr.open( 'GET', objectUrl );
                    xhr.responseType = 'blob';
                    xhr.onload = function() {
                        resolve( xhr.response );
                    };
                    xhr.send();
                } ).then( function( blb ) {
                    blob = blb;
                    anchor.addEventListener( 'click', listener );
                    anchor.removeAttribute( 'href' );
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
