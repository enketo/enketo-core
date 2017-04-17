'use strict';
var $ = require( 'jquery' );

/**
 * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM
 * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added
 * to the DOM (and synchronized with data object) a regular change event should be fired
 *
 * @param  {string=} ev1 event to be triggered when a value is cleared
 * @param  {string=} ev2 event to be triggered when a value is cleared
 * @return { jQuery} [description]
 */
$.fn.clearInputs = function( ev1, ev2 ) {
    ev1 = ev1 || 'edit';
    ev2 = ev2 || '';
    return this.each( function() {
        //remove media previews
        $( this ).find( '.file-preview' ).remove();
        //remove input values
        $( this ).find( 'input, select, textarea' ).not( '.ignore' ).each( function() {
            var $node = $( this ),
                type = $node.attr( 'type' );
            if ( $node.prop( 'nodeName' ).toUpperCase() === 'SELECT' ) {
                type = 'select';
            }
            if ( $node.prop( 'nodeName' ).toUpperCase() === 'TEXTAREA' ) {
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
                    $node.removeAttr( 'data-previous-file-name data-loaded-file-name' );
                    /* falls through */
                case 'hidden':
                case 'textarea':
                    if ( $node.val() !== '' ) {
                        $node.val( '' ).trigger( ev1 ).trigger( ev2 );
                    }
                    break;
                case 'radio':
                case 'checkbox':
                    if ( $node.prop( 'checked' ) ) {
                        $node.prop( 'checked', false );
                        $node.trigger( ev1 ).trigger( ev2 );
                    }
                    break;
                case 'select':
                    if ( $node[ 0 ].selectedIndex > 0 ) {
                        $node[ 0 ].selectedIndex = 0;
                        $node.trigger( ev1 ).trigger( ev2 );
                    }
                    break;
                default:
                    console.error( 'Unrecognized input type found when trying to reset', this );
            }
        } );
    } );
};

/**
 * Reverses a jQuery collection
 * @type {Array}
 */
$.fn.reverse = [].reverse;
