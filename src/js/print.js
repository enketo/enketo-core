/**
 * Deals with printing
 *
 * @module print
 */

import $ from 'jquery';

let dpi, printStyleSheet;
let printStyleSheetLink;
import dialog from 'enketo/dialog';

// make sure setDpi is not called until DOM is ready
$( document ).ready( () => {
    setDpi();
} );

/**
 * @typedef PaperObj
 * @property {string} format
 * @property {string} margin
 * @property {string} orientation
 */

/**
 * Calculates the dots per inch and sets the dpi property
 */
function setDpi() {
    const dpiO = {};
    const e = document.body.appendChild( document.createElement( 'DIV' ) );
    e.style.width = '1in';
    e.style.padding = '0';
    dpiO.v = e.offsetWidth;
    e.parentNode.removeChild( e );
    dpi = dpiO.v;
}

/**
 * Gets a single print stylesheet
 *
 * @return {Element|null}
 */
function getPrintStyleSheet() {
    // document.styleSheets is an Object not an Array!
    for ( const i in document.styleSheets ) {
        if ( Object.prototype.hasOwnProperty.call( document.styleSheets, i ) ) {
            const sheet = document.styleSheets[ i ];
            if ( sheet.media.mediaText === 'print' ) {
                return sheet;
            }
        }
    }
    return null;
}

/**
 * Obtains a link element with a reference to the print stylesheet.
 *
 * @return {Element}
 */
function getPrintStyleSheetLink() {
    return document.querySelector( 'link[media="print"]' );
}

/**
 * Applies the print stylesheet to the current view by changing stylesheets media property to 'all'
 *
 * @static
 * @return {boolean}
 */
function styleToAll() {
    // sometimes, setStylesheet fails upon loading
    printStyleSheet = printStyleSheet || getPrintStyleSheet();
    printStyleSheetLink = printStyleSheetLink || getPrintStyleSheetLink();
    // Chrome:
    printStyleSheet.media.mediaText = 'all';
    // Firefox:
    printStyleSheetLink.setAttribute( 'media', 'all' );
    return !!printStyleSheet;
}

/**
 * Resets the print stylesheet to only apply to media 'print'
 *
 * @static
 */
function styleReset() {
    printStyleSheet.media.mediaText = 'print';
    printStyleSheetLink.setAttribute( 'media', 'print' );
    $( '.print-height-adjusted, .print-width-adjusted, .main' )
        .removeAttr( 'style' )
        .removeClass( 'print-height-adjusted print-width-adjusted' );
    $( '.back-to-screen-view' ).off( 'click' ).remove();
}

/**
 * Tests if the form element is set to use the Grid Theme.
 *
 * @static
 * @return {boolean}
 */
function isGrid() {
    return /theme-.*grid.*/.test( document.querySelector( 'form.or' ).getAttribute( 'class' ) );
}

/**
 * Fixes a Grid Theme layout programmatically by imitating CSS multi-line flexbox in JavaScript.
 *
 * @static
 * @param {PaperObj} paper
 * @return {Promise}
 */
function fixGrid( paper ) {
    // to ensure cells grow correctly with text-wrapping before fixing heights and widths.
    const main = document.querySelector( '.main' );
    main.style.width = getPaperPixelWidth( paper );
    main.classList.add( 'print-width-adjusted' );
    // wait for browser repainting after width change
    return new Promise( resolve => {
        setTimeout( () => {
            let $row;
            let rowTop;
            // the -1px adjustment is necessary because the h3 element width is calc(100% + 1px)
            const maxWidth = $( '#form-title' ).outerWidth() - 1;
            const els = document.querySelectorAll( '.question:not(.draft), .trigger:not(.draft)' );

            els.forEach( ( el, index ) => {
                const lastElement = index === els.length - 1;
                const $el = $( el );
                const top = $el.offset().top;
                rowTop = ( rowTop || rowTop === 0 ) ? rowTop : top;
                $row = $row || $el;

                if ( top === rowTop ) {
                    $row = $row.add( $el );
                }

                if ( top > rowTop || lastElement ) {
                    const widths = [];
                    let cumulativeWidth = 0;
                    let maxHeight = 0;

                    $row.each( function() {
                        const width = Number( $( this ).css( 'width' ).replace( 'px', '' ) );
                        widths.push( width );
                        cumulativeWidth += width;
                    } );

                    // adjusts widths if w-values don't add up to 100%
                    if ( cumulativeWidth < maxWidth ) {
                        const diff = maxWidth - cumulativeWidth;
                        $row.each( function( index ) {
                            const width = widths[ index ] + ( widths[ index ] / cumulativeWidth ) * diff;
                            // round down to 2 decimals to avoid 100.001% totals
                            $( this )
                                .css( 'width', `${Math.floor( ( width * 100 / maxWidth ) * 100 ) / 100}%` )
                                .addClass( 'print-width-adjusted' );
                        } );
                    }

                    $row.each( function() {
                        const height = $( this ).outerHeight();
                        maxHeight = ( height > maxHeight ) ? height : maxHeight;
                    } );

                    $row.addClass( 'print-height-adjusted' ).css( 'height', `${maxHeight}px` );

                    // start a new row
                    $row = $el;
                    rowTop = $el.offset().top;
                } else if ( rowTop < top ) {
                    console.error( 'unexpected question top position: ', top, 'for element:', $el, 'expected >=', rowTop );
                }
            } );

            // In case anybody is using this event.
            $( window ).trigger( 'printviewready' );
            resolve();
        }, 800 );
    } );
}

/**
 * Returns a CSS width value in px (e.g. `"100px"`) for a provided paper format, orientation (`"portrait"` or `"landscape"`) and margin (as any valid CSS value).
 *
 * @param {PaperObj} paper
 * @return {string}
 */
function getPaperPixelWidth( paper ) {
    let printWidth;
    const FORMATS = {
        Letter: [ 8.5, 11 ],
        Legal: [ 8.5, 14 ],
        Tabloid: [ 11, 17 ],
        Ledger: [ 17, 11 ],
        A0: [ 33.1, 46.8 ],
        A1: [ 23.4, 33.1 ],
        A2: [ 16.5, 23.4 ],
        A3: [ 11.7, 16.5 ],
        A4: [ 8.27, 11.7 ],
        A5: [ 5.83, 8.27 ],
        A6: [ 4.13, 5.83 ],
    };
    paper.landscape = typeof paper.landscape === 'boolean' ? paper.landscape : paper.orientation === 'landscape';
    delete paper.orientation;

    if ( typeof paper.margin === 'undefined' ) {
        paper.margin = 0.4;
    } else if ( /^[\d.]+in$/.test( paper.margin.trim() ) ) {
        paper.margin = parseFloat( paper.margin, 10 );
    } else if ( /^[\d.]+cm$/.test( paper.margin.trim() ) ) {
        paper.margin = parseFloat( paper.margin, 10 ) / 2.54;
    } else if ( /^[\d.]+mm$/.test( paper.margin.trim() ) ) {
        paper.margin = parseFloat( paper.margin, 10 ) / 25.4;
    }

    paper.format = typeof paper.format === 'string' && typeof FORMATS[ paper.format ] !== 'undefined' ? paper.format : 'A4';
    printWidth = ( paper.landscape === true ) ? FORMATS[ paper.format ][ 1 ] : FORMATS[ paper.format ][ 0 ];

    return `${( printWidth - ( 2 * paper.margin ) ) * dpi}px`;
}

/**
 * @static
 */
function openAllDetails() {
    document.querySelectorAll( 'details.or-form-guidance.active' )
        .forEach( details => {
            if ( details.open ) {
                details.dataset.previousOpen = true;
            } else {
                details.open = true;
            }
        } );
}

/**
 * @static
 */
function closeAllDetails() {
    document.querySelectorAll( 'details.or-form-guidance.active' )
        .forEach( details => {
            if ( details.dataset.previousOpen ) {
                delete details.dataset.previousOpen;
            } else {
                details.open = false;
            }
        } );
}

/**
 * Prints the form after first preparing the Grid (every time it is called).
 *
 * It's just a demo function that only collects paper format and should be replaced
 * in your app with a dialog that collects a complete paper format (size, margin, orientation);
 *
 * @static
 * @param {string} theme
 */
function print( theme ) {
    if ( theme === 'grid' || ( !theme && isGrid() ) ) {
        let swapped = false;
        dialog.prompt( 'Enter valid paper format', 'A4' )
            .then( format => {
                if ( !format ) {
                    throw new Error( 'Print cancelled by user.' );
                }
                swapped = styleToAll();
                return fixGrid( {
                    format
                } );
            } )
            .then( window.print )
            .catch( console.error )
            .then( () => {
                if ( swapped ) {
                    setTimeout( styleReset, 500 );
                }
            } );
    } else {
        window.print();
    }
}

export { print, fixGrid, styleToAll, styleReset, isGrid, openAllDetails, closeAllDetails };
