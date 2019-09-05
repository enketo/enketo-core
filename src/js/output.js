/**
 * @module output
 */

import $ from 'jquery';

export default {
    /**
     * Updates output values, optionally filtered by those values that contain a changed node name
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated ) {
        const outputCache = {};
        let val = '';
        const that = this;

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        const $nodes = this.form.getRelatedNodes( 'data-value', '.or-output', updated );

        const clonedRepeatsPresent = this.form.repeatsPresent && this.form.view.html.querySelector( '.or-repeat.clone' );

        $nodes.each( function() {
            const $output = $( this );
            const output = this;

            // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $output.closest( '.or-branch' ).parent().closest( '.disabled' ).length ) {
                return;
            }

            const expr = output.dataset.value;
            /*
             * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
             * should look at the HTML input to determine the context.
             * So, context is either the input name attribute (if output is inside input label),
             * or the parent with a name attribute
             * or the whole document
             */
            let context = output.closest( '.question, .or-group' );


            if ( !context.matches( '.or-group' ) ) {
                context = context.querySelector( '[name]' );
            }

            let contextPath = that.form.input.getName( context );

            /*
             * If the output is part of a group label and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available. See issue 502.
             * This same logic is applied in branch.js.
             */
            if ( $( context ).children( `.or-repeat-info[data-name="${contextPath}"]` ).length && !$( context ).children( `.or-repeat[name="${contextPath}"]` ).length ) {
                contextPath = null;
            }

            const insideRepeat = ( clonedRepeatsPresent && $output.parentsUntil( '.or', '.or-repeat' ).length > 0 );
            const insideRepeatClone = ( insideRepeat && $output.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 );
            const index = ( insideRepeatClone && contextPath ) ? that.form.input.getIndex( context ) : 0;

            if ( typeof outputCache[ expr ] !== 'undefined' ) {
                val = outputCache[ expr ];
            } else {
                val = that.form.model.evaluate( expr, 'string', contextPath, index, true );
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
