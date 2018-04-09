'use strict';

/**
 * Deals with printing
 */

var $ = require( 'jquery' );
var Promise = require( 'lie' );
var dpi, printStyleSheet;
var $printStyleSheetLink;
var dialog = require( 'enketo/dialog' );

// make sure setDpi is not called until DOM is ready
$( document ).ready( function() {
    setDpi();
} );

/**
 * Calculates the dots per inch and sets the dpi property
 */
function setDpi() {
    var dpiO = {};
    var e = document.body.appendChild( document.createElement( 'DIV' ) );
    e.style.width = '1in';
    e.style.padding = '0';
    dpiO.v = e.offsetWidth;
    e.parentNode.removeChild( e );
    dpi = dpiO.v;
}

/**
 * Gets print stylesheets
 * @return {Element} [description]
 */
function getPrintStyleSheet() {
    var sheet;
    // document.styleSheets is an Object not an Array!
    for ( var i in document.styleSheets ) {
        if ( document.styleSheets.hasOwnProperty( i ) ) {
            sheet = document.styleSheets[ i ];
            if ( sheet.media.mediaText === 'print' ) {
                return sheet;
            }
        }
    }
    return null;
}

function getPrintStyleSheetLink() {
    return $( 'link[media="print"]:eq(0)' );
}

/**
 * Applies the print stylesheet to the current view by changing stylesheets media property to 'all'
 */
function styleToAll() {
    // sometimes, setStylesheet fails upon loading
    printStyleSheet = printStyleSheet || getPrintStyleSheet();
    $printStyleSheetLink = $printStyleSheetLink || getPrintStyleSheetLink();
    // Chrome:
    printStyleSheet.media.mediaText = 'all';
    // Firefox:
    $printStyleSheetLink.attr( 'media', 'all' );
    return !!printStyleSheet;
}

/**
 * Resets the print stylesheet to only apply to media 'print'
 */
function styleReset() {
    printStyleSheet.media.mediaText = 'print';
    $printStyleSheetLink.attr( 'media', 'print' );
    $( '.print-height-adjusted, .print-width-adjusted, .main' )
        .removeAttr( 'style' )
        .removeClass( 'print-height-adjusted print-width-adjusted' );
    $( '.back-to-screen-view' ).off( 'click' ).remove();
}

function isGrid() {
    return /theme-.*grid.*/.test( $( 'form.or' ).attr( 'class' ) );
}

function fixGrid( paper ) {
    // to ensure cells grow correctly with text-wrapping before fixing heights and widths.
    $( '.main' ).css( 'width', getPaperPixelWidth( paper ) ).addClass( 'print-width-adjusted' );
    // wait for browser repainting after width change
    return new Promise( function( resolve ) {
        setTimeout( function() {
            var $row;
            var rowTop;
            // the -1px adjustment is necessary because the h3 element width is calc(100% + 1px)
            var maxWidth = $( '#form-title' ).outerWidth() - 1;
            var $els = $( '.question, .note, .trigger' ).not( '.draft' );

            $els.each( function( index ) {
                var lastElement = index === $els.length - 1;
                var $el = $( this );
                var top = $el.offset().top;
                rowTop = ( rowTop || rowTop === 0 ) ? rowTop : top;
                $row = $row || $el;

                if ( top === rowTop ) {
                    $row = $row.add( $el );
                }

                if ( top > rowTop || lastElement ) {
                    var widths = [];
                    var cumulativeWidth = 0;
                    var maxHeight = 0;

                    $row.each( function() {
                        var width = Number( $( this ).css( 'width' ).replace( 'px', '' ) );
                        widths.push( width );
                        cumulativeWidth += width;
                    } );

                    // adjusts widths if w-values don't add up to 100%
                    if ( cumulativeWidth < maxWidth ) {
                        var diff = maxWidth - cumulativeWidth;
                        $row.each( function( index ) {
                            var width = widths[ index ] + ( widths[ index ] / cumulativeWidth ) * diff;
                            // round down to 2 decimals to avoid 100.001% totals
                            $( this )
                                .css( 'width', ( Math.floor( ( width * 100 / maxWidth ) * 100 ) / 100 ) + '%' )
                                .addClass( 'print-width-adjusted' );
                        } );
                    }

                    $row.each( function() {
                        var height = $( this ).outerHeight();
                        maxHeight = ( height > maxHeight ) ? height : maxHeight;
                    } );

                    $row.addClass( 'print-height-adjusted' ).css( 'height', maxHeight + 'px' );

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

function getPaperPixelWidth( paper ) {
    var printWidth;
    var FORMATS = {
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

    return ( ( printWidth - ( 2 * paper.margin ) ) * dpi ) + 'px';
}


/**
 * Prints the form after first preparing the Grid (every time it is called).
 * 
 * It's just demo function that only collects paper format and should be replaced
 * in your app with a dialog that collects a complete paper format (size, margin, orientation);
 */
function print( theme ) {
    if ( theme === 'grid' || ( !theme && isGrid() ) ) {
        var swapped = false;
        dialog.prompt( 'Enter valid paper format', 'A4' )
            .then( function( format ) {
                swapped = styleToAll();
                return fixGrid( {
                    format: format
                } );
            } )
            .then( window.print )
            .catch( console.error )
            .then( function() {
                if ( swapped ) {
                    setTimeout( styleReset, 500 );
                }
            } );
    } else {
        window.print();
    }
}

//window.printthis = print;

module.exports = {
    print: print,
    fixGrid: fixGrid,
    styleToAll: styleToAll,
    styleReset: styleReset,
    isGrid: isGrid,
};
