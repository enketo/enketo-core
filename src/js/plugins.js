/**
 * @external jQuery
 */
import $ from 'jquery';

/**
 * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM
 * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added
 * to the DOM (and synchronized with data object) a regular change event should be fired
 *
 * @function external:jQuery#clearInputs
 * @param {string} [ev1] - Event to be triggered when a value is cleared
 * @param {string} [ev2] - Event to be triggered when a value is cleared
 * @return {jQuery} original jQuery-wrapped elements
 */
$.fn.clearInputs = function( ev1, ev2 ) {
    ev1 = ev1 || 'edit';
    ev2 = ev2 || '';

    return this.each( function() {
        //remove media previews
        $( this ).find( '.file-preview' ).remove();
        //remove input values
        $( this ).find( 'input, select, textarea' ).not( '.ignore' ).each( function() {
            const $node = $( this );
            let type = $node.attr( 'type' );
            let loadedFilename;

            if ( $node.prop( 'nodeName' ).toUpperCase() === 'SELECT' ) {
                type = 'select';
            }
            if ( $node.prop( 'nodeName' ).toUpperCase() === 'TEXTAREA' ) {
                type = 'textarea';
            }
            switch ( type ) {
                case 'file':
                    loadedFilename = this.dataset.loadedFileName;
                    delete this.dataset.loadedFileName;
                    /* falls through */
                case 'date':
                case 'datetime-local':
                case 'month':
                case 'time':
                case 'number':
                case 'search':
                case 'color':
                case 'range':
                case 'url':
                case 'email':
                case 'password':
                case 'text':
                case 'tel':
                case 'hidden':
                case 'textarea':
                    if ( $node.val() !== '' || loadedFilename ) {
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
 *
 * @function external:jQuery#reverse
 * @type {Array}
 */
$.fn.reverse = [].reverse;
