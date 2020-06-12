/**
 * @module readonly
 */

import $ from 'jquery';

export default {
    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated ) {
        const $nodes = this.form.getRelatedNodes( 'readonly', '', updated );
        $nodes.each( function() {
            $( this ).closest( '.question' ).addClass( 'readonly' );
            // Note: the readonly-forced class is added for special readonly views of a form.
            if ( !this.value && !this.dataset.calculate && !this.classList.contains( 'readonly-forced' ) ) {
                this.classList.add( 'empty' );
            }
        } );
    }
};
