/**
 * Deals with form logic around required questions.
 *
 * @module required
 */

import $ from 'jquery';

export default {
    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated /*, filter*/ ) {
        const that = this;
        // A "required" update will never result in a node value change so the expression evaluation result can be cached fairly aggressively.
        const requiredCache = {};

        if ( !this.form ) {
            throw new Error( 'Required module not correctly instantiated with form property.' );
        }

        const $nodes = this.form.getRelatedNodes( 'data-required', '', updated );
        const repeatClonesPresent = this.form.repeatsPresent && this.form.view.html.querySelector( '.or-repeat.clone' );

        $nodes.each( function() {
            const $input = $( this );
            const input = this;
            const requiredExpr = that.form.input.getRequired( input );
            const path = that.form.input.getName( input );
            // Minimize index determination because it is expensive.
            const index = repeatClonesPresent ? that.form.input.getIndex( input ) : 0;
            // The path is stripped of the last nodeName to record the context.
            // This might be dangerous, but until we find a bug, it improves performance a lot in those forms where one group contains
            // many sibling questions that each have the same required expression.
            const cacheIndex = `${requiredExpr}__${path.substring( 0, path.lastIndexOf( '/' ) )}__${index}`;

            if ( typeof requiredCache[ cacheIndex ] === 'undefined' ) {
                requiredCache[ cacheIndex ] = that.form.model.node( path, index ).isRequired( requiredExpr );
            }

            $input.closest( '.question' ).find( '.required' ).toggleClass( 'hide', !requiredCache[ cacheIndex ] );
        } );
    }
};
