/**
 * Update a HTML anchor to serve as a download or reset it if an empty objectUrl is provided.
 *
 * @static
 * @param {HTMLElement} anchor - The anchor element
 * @param {string} objectUrl - The objectUrl to download
 * @param {string} fileName - The filename of the file
 */
function updateDownloadLink( anchor, objectUrl, fileName ) {
    if ( window.updateDownloadLinkIe11 ) {
        return window.updateDownloadLinkIe11( ...arguments );
    }
    anchor.setAttribute( 'href', objectUrl || '' );
    anchor.setAttribute( 'download', fileName || '' );
}

// Export as default to facilitate overriding this function.
export default {
    updateDownloadLink
};
