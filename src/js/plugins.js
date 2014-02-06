define( [ 'jquery' ], function( $ ) {

    /**
     * Update number of repeated elements (with class or-repeat)
     *
     * @return {jQuery} [description]
     */
    $.fn.numberRepeats = function() {

        return this.each( function() {

            $( this ).find( '.or-repeat' ).each( function() {
                var repSiblings, qtyRepeats, i;
                // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
                if ( $( this ).prev( '.or-repeat' ).length === 0 ) {
                    repSiblings = $( this ).siblings( '.or-repeat' );
                    qtyRepeats = repSiblings.length + 1;
                    if ( qtyRepeats > 1 ) {
                        $( this ).find( '.repeat-number' ).text( '1' );
                        i = 2;
                        repSiblings.each( function() {
                            $( this ).find( '.repeat-number' ).text( i );
                            i++;
                        } );
                    } else {
                        $( this ).find( '.repeat-number' ).empty();
                    }
                }
            } );
        } );
    };

    /**
     * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM
     * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added
     * to the DOM (and synchronized with data object) a regular change event should be fired
     *
     * @param  {string=} ev event to be triggered when a value is cleared
     * @return { jQuery} [description]
     */
    $.fn.clearInputs = function( ev ) {
        ev = ev || 'edit';
        return this.each( function() {
            //remove media previews
            $( this ).find( '.file-preview' ).remove();
            //remove input values
            $( this ).find( 'input, select, textarea' ).each( function() {
                var type = $( this ).attr( 'type' );
                if ( $( this ).prop( 'nodeName' ).toUpperCase() === 'SELECT' ) {
                    type = 'select';
                }
                if ( $( this ).prop( 'nodeName' ).toUpperCase() === 'TEXTAREA' ) {
                    type = 'textarea';
                }
                switch ( type ) {
                    case 'date':
                    case 'datetime':
                    case 'time':
                    case 'number':
                    case 'search':
                    case 'color':
                    case 'range':
                    case 'url':
                    case 'email':
                    case 'password':
                    case 'text':
                    case 'file':
                        $( this ).removeAttr( 'data-previous-file-name data-loaded-file-name' );
                        /* falls through */
                    case 'hidden':
                    case 'textarea':
                        if ( $( this ).val() !== '' ) {
                            $( this ).val( '' ).trigger( ev );
                        }
                        break;
                    case 'radio':
                    case 'checkbox':
                        if ( $( this ).prop( 'checked' ) ) {
                            $( this ).prop( 'checked', false );
                            $( this ).trigger( ev );
                        }
                        break;
                    case 'select':
                        if ( $( this )[ 0 ].selectedIndex >= 0 ) {
                            $( this )[ 0 ].selectedIndex = -1;
                            $( this ).trigger( ev );
                        }
                        break;
                    default:
                        console.error( 'Unrecognized input type found when trying to reset: ' + type );
                        console.error( $( this ) );
                }
            } );
        } );
    };

    /**
     * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
     * Also converts newline characters
     *
     * Not supported: escaping and other MarkDown syntax
     */
    $.fn.markdownToHtml = function() {
        return this.each( function() {
            var html,
                $childStore = $( '<div/>' );
            $( this ).children( ':not(input, select, textarea)' ).each( function( index ) {
                var name = '$$$' + index;
                $( this ).clone().markdownToHtml().appendTo( $childStore );
                $( this ).replaceWith( name );
            } );
            html = $( this ).html();
            html = html.replace( /__([^\s][^_]*[^\s])__/gm, "<strong>$1</strong>" );
            html = html.replace( /\*\*([^\s][^\*]*[^\s])\*\*/gm, "<strong>$1</strong>" );
            html = html.replace( /_([^\s][^_]*[^\s])_/gm, '<em>$1</em>' );
            html = html.replace( /\*([^\s][^\*]*[^\s])\*/gm, '<em>$1</em>' );
            //only replaces if url is valid (worthwhile feature?)
            //html = html.replace( /\[(.*)\]\(((https?:\/\/)(([\da-z\.\-]+)\.([a-z\.]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3}))([\/\w \.\-]*)*\/?[\/\w \.\-\=\&\?]*)\)/gm, '<a href="$2">$1</a>' );
            html = html.replace( /\[(.*)\]\(([^\)]+)\)/gm, '<a href="$2" target="_blank">$1</a>' );
            html = html.replace( /\n/gm, '<br />' );
            $childStore.children().each( function( i ) {
                var regex = new RegExp( '\\$\\$\\$' + i );
                html = html.replace( regex, $( this )[ 0 ].outerHTML );
            } );
            $( this ).text( '' ).append( html );
        } );
    };

    /**
     * Reverses a jQuery collection
     * @type {Array}
     */
    $.fn.reverse = [].reverse;

} );
