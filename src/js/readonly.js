'use strict';

var $ = require( 'jquery' );

module.exports = {
    /**
     * Updates readonly
     *
     * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
     */
    update: function( /*updated, filter */) {
        var $nodes = this.form.getRelatedNodes( 'readonly' );

        $nodes.each( function() {
            $( this ).closest( '.question' ).addClass( 'readonly' );
            // TODO: radiobuttons, checkboxes
            if ( !this.value && !this.dataset.calculate ) {
                this.classList.add( 'empty' );
            }
        } );
    }
};
