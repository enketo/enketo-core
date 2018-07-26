'use strict';

var $ = require( 'jquery' );

module.exports = {
    /**
     * Updates readonly
     *
     * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
     */
    update: function( updated /*, filter*/ ) {
        var that = this;
        // A "required" update will never result in a node value change so the expression evaluation result can be cached fairly aggressively.
        var requiredCache = {};

        if ( !this.form ) {
            throw new Error( 'Required module not correctly instantiated with form property.' );
        }

        var $nodes = this.form.getRelatedNodes( 'data-required', '', updated );
        var repeatClonesPresent = this.form.repeatsPresent && this.form.view.$.find( '.or-repeat.clone' ).length > 0;

        $nodes.each( function() {
            var $input = $( this );
            var requiredExpr = that.form.input.getRequired( $input );
            var path = that.form.input.getName( $input );
            // Minimize index determination because it is expensive.
            var index = repeatClonesPresent ? that.form.input.getIndex( $input ) : 0;
            // The path is stripped of the last nodeName to record the context.
            // This might be dangerous, but until we find a bug, it improves performance a lot in those forms where one group contains
            // many sibling questions that each have the same required expression.
            var cacheIndex = requiredExpr + '__' + path.substring( 0, path.lastIndexOf( '/' ) ) + '__' + index;

            if ( typeof requiredCache[ cacheIndex ] === 'undefined' ) {
                requiredCache[ cacheIndex ] = that.form.model.node( path, index ).isRequired( requiredExpr );
            }

            $input.closest( '.question' ).find( '.required' ).toggleClass( 'hide', !requiredCache[ cacheIndex ] );
        } );
    }
};
