/**
 * @preserve Copyright 2013 Martijn van de Rijdt
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Deals with printing
 */

define( [ 'jquery' ], function( $ ) {
    "use strict";
    var dpi, printStyleSheet, $printStyleSheetLink;

    // make sure setDpi is not called until DOM is ready
    $( document ).ready( function() {
        setDpi();
    } );

    /**
     * Calculates the dots per inch and sets the dpi property
     */
    function setDpi() {
        var dpiO = {},
            e = document.body.appendChild( document.createElement( "DIV" ) );
        e.style.width = "1in";
        e.style.padding = "0";
        dpiO.v = e.offsetWidth;
        e.parentNode.removeChild( e );
        dpi = dpiO.v;
    }

    /**
     * Gets print stylesheets
     * @return {Element} [description]
     */
    function getPrintStyleSheet() {
        var sheet, media;
        // document.styleSheets is an Object not an Array!
        for ( var i in document.styleSheets ) {
            sheet = document.styleSheets[ i ];
            console.log( 'checking prop', i, sheet );
            if ( sheet.media.mediaText === 'print' ) {
                return sheet;
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
        //sometimes, setStylesheet fails upon loading
        printStyleSheet = printStyleSheet || getPrintStyleSheet();
        $printStyleSheetLink = $printStyleSheetLink || getPrintStyleSheetLink();
        //Chrome:
        printStyleSheet.media.mediaText = 'all';
        //Firefox:
        $printStyleSheetLink.attr( 'media', 'all' );
    }

    /**
     * Resets the print stylesheet to only apply to media 'print'
     */
    function styleReset() {
        printStyleSheet.media.mediaText = 'print';
        $printStyleSheetLink.attr( 'media', 'print' );
        $( '.print-height-adjusted, .print-width-adjusted' )
            .removeAttr( 'style' )
            .removeClass( 'print-height-adjusted print-width-adjusted' );
        $( '.back-to-screen-view' ).off( 'click' ).remove();
    }

    function isGrid() {
        return $( 'form.or' ).hasClass( 'theme-grid' );
    }

    function fixGrid( paper ) {
        var $row, $el, left, lowestX, maxWidth, diff,
            firstRow = true;

        console.log( 'paper pixel width', getPaperPixelWidth( paper ) );
        // to ensure cells grow correctly with text-wrapping before fixing heights and widths.
        $( '.main' ).css( 'width', getPaperPixelWidth( paper ) ).addClass( 'print-width-adjusted' );
        // wait for browser repainting after width change
        setTimeout( function() {
            // the -1px adjustment is necessary because the h3 element width is calc(100% + 1px)
            maxWidth = $( '#form-title' ).outerWidth() - 1;
            console.log( 'maxWidth', maxWidth );
            $( '.question, .note, .trigger' ).not( '.draft' ).each( function() {
                $el = $( this );
                left = $el.offset().left;
                // determine the lowest possible x-coordinate
                lowestX = ( lowestX || lowestX === 0 ) ? lowestX : left;

                $row = $row || $el;
                if ( left > lowestX ) {
                    $row = $row.add( $el );
                } else if ( left === lowestX && !firstRow ) {
                    var height,
                        widths = [],
                        cumulativeWidth = 0,
                        maxHeight = 0;
                    $row.each( function() {
                        height = $( this ).outerHeight();
                        maxHeight = ( height > maxHeight ) ? height : maxHeight;
                        widths.push( Number( $( this ).css( 'width' ).replace( 'px', '' ) ) );
                    } );
                    $row.addClass( 'print-height-adjusted' ).css( 'height', maxHeight + 'px' );

                    // adjusts widths if w-values don't add up to 100%
                    widths.forEach( function( width ) {
                        cumulativeWidth += width;
                    } );
                    if ( cumulativeWidth < maxWidth ) {
                        console.log( 'adjusting width' );

                        diff = maxWidth - cumulativeWidth;
                        $row.each( function( index ) {
                            $( this )
                                .css( 'width', ( ( widths[ index ] + ( widths[ index ] / cumulativeWidth ) * diff ) * 100 / maxWidth ) + '%' )
                                .addClass( 'print-width-adjusted' );
                        } );
                    }
                    // start a new row
                    $row = $el;
                } else if ( !firstRow ) {
                    console.error( 'unexpected x-coordinate: ', left, 'for element:', $el, 'lowest expected', lowestX );
                }
                firstRow = false;
            } );
            // Chrome 34 doesn't like the fact that main has an inline fixed width (see issue #99)
            // since we do not need it any more, after we have set the adjusted widths to a %-value, we can remove it. 
            $( '.main' ).css( 'width', 'auto' ).removeClass( 'print-width-adjusted' );

            $( window ).trigger( 'printviewready' );
        }, 1000 );
    }

    function getPaperPixelWidth( paper ) {
        var printWidth,
            // the final margin is determined by the browser's print functionality
            // better too large than too small here
            margin = 0.4,
            formats = {
                A4: {
                    width: 8.27,
                    height: 11.69
                },
                letter: {
                    width: 8.5,
                    height: 11
                }
            };

        printWidth = ( paper.orientation === 'portrait' ) ? formats[ paper.format ].width : formats[ paper.format ].height;

        return ( ( printWidth - ( 2 * margin ) ) * dpi ) + 'px';
    }

    /**
     * Show print setting dialog and proceed upon user's direction.
     */
    function confirmPaperSettingsAndPrint( confirm ) {
        var texts = {
                dialog: 'print',
                heading: 'Select Print Settings'
            },
            options = {
                posButton: 'Prepare',
                posAction: function( values ) {
                    fixGrid( values );
                    $( window ).one( 'printviewready', function() {
                        window.print();
                    } );
                },
                negButton: 'Close',
                negAction: function() {
                    styleReset();
                },
                afterAction: function() {
                    setTimeout( function() {
                        styleReset();
                    }, 1500 );
                }

            };

        // TODO: would be nice if fixGrid can become synchronous again or
        // a progress is shown when it is churning away.

        confirm( texts, options );
    }

    /**
     * Prints the form after first setting page breaks (every time it is called)
     */
    function printForm( confirm ) {
        if ( isGrid() ) {
            styleToAll();
            // add temp reset button, just in case somebody gets stuck in print view
            $( '<button class="btn back-to-screen-view">Back to Normal View</button>' ).prependTo( $( 'form.or' ) ).on( 'click', function() {
                styleReset();
            } );
            confirmPaperSettingsAndPrint( confirm );
        } else {
            window.print();
        }
    }

    return printForm;
} );
