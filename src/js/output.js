'use strict';

/**
 * Updates output values, optionally filtered by those values that contain a changed node name
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 */

var $ = require( 'jquery' );

module.exports = {
    update: function( updated ) {
        var expr;
        var clonedRepeatsPresent;
        var insideRepeat;
        var insideRepeatClone;
        var $context;
        var $output;
        var context;
        var index;
        var $nodes;
        var outputCache = {};
        var val = '';
        var that = this;

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        $nodes = this.form.getRelatedNodes( 'data-value', '.or-output', updated );

        clonedRepeatsPresent = ( this.form.repeatsPresent && this.form.view.$.find( '.or-repeat.clone' ).length > 0 );

        $nodes.each( function() {
            $output = $( this );

            // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $output.closest( '.or-branch' ).parent().closest( '.disabled' ).length ) {
                return;
            }

            expr = $output.attr( 'data-value' );
            /*
             * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
             * should look at the HTML input to determine the context.
             * So, context is either the input name attribute (if output is inside input label),
             * or the parent with a name attribute
             * or the whole document
             */
            $context = $output.closest( '.question, .or-group' );

            if ( !$context.is( '.or-group' ) ) {
                $context = $context.find( '[name]' ).eq( 0 );
            }

            context = that.form.input.getName( $context );

            /* 
             * If the output is part of a group label and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available. See issue 502. 
             * This same logic is applied in branch.js.
             */
            if ( $context.children( '.or-repeat-info[data-name="' + context + '"]' ).length && !$context.children( '.or-repeat[name="' + context + '"]' ).length ) {
                context = null;
            }

            insideRepeat = ( clonedRepeatsPresent && $output.parentsUntil( '.or', '.or-repeat' ).length > 0 );
            insideRepeatClone = ( insideRepeat && $output.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 );
            index = ( insideRepeatClone && context ) ? that.form.input.getIndex( $context ) : 0;

            if ( typeof outputCache[ expr ] !== 'undefined' ) {
                val = outputCache[ expr ];
            } else {
                val = that.form.model.evaluate( expr, 'string', context, index, true );
                if ( !insideRepeat ) {
                    outputCache[ expr ] = val;
                }
            }
            if ( $output.text() !== val ) {
                $output.text( val );
            }
        } );
    }
};
