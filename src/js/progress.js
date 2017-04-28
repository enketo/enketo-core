'use strict';

/**
 * Progress module.
 */

var $ = require( 'jquery' );

/**
 * Maintains progress state of user traversing through form, using
 * currently focused input || last changed input as current location.
 */
module.exports = {
    status: 0,
    lastChanged: null,
    $all: null,
    updateTotal: function() {
        this.$all = this.form.view.$.find( '.question' ).not( '.disabled, .or-appearance-comment, .or-appearance-dn' ).filter( function() {
            return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
        } );
    },
    // updates rounded % value of progress and triggers event if changed
    update: function( el ) {
        var status;

        if ( !this.$all || !el ) {
            this.updateTotal();
        }

        this.lastChanged = el || this.lastChanged;
        status = Math.round( ( ( this.$all.index( $( this.lastChanged ).closest( '.question' ) ) + 1 ) * 100 ) / this.$all.length );

        // if the current el was removed (inside removed repeat), the status will be 0 - leave unchanged
        if ( status > 0 && status !== this.status ) {
            this.status = status;
            this.form.view.$.trigger( 'progressupdate.enketo', status );
        }
    },
    get: function() {
        return this.status;
    }
};
