'use strict';

/**
 * Updates branches
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 */

var $ = require( 'jquery' );

module.exports = {
    update: function( updated, forceClearIrrelevant ) {
        var p;
        var $branchNode;
        var result;
        var insideRepeat;
        var insideRepeatClone;
        var cacheIndex;
        var $nodes;
        var relevantCache = {};
        var alreadyCovered = [];
        var branchChange = false;
        var that = this;
        var clonedRepeatsPresent;

        if ( !this.form ) {
            throw new Error( 'Branch module not correctlsy instantiated with form property.' );
        }

        $nodes = this.form.getRelatedNodes( 'data-relevant', '', updated );

        clonedRepeatsPresent = ( this.form.repeatsPresent && this.form.view.$.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

        $nodes.each( function() {
            var $node = $( this );
            var context;

            //note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
            if ( $.inArray( $node.attr( 'name' ), alreadyCovered ) !== -1 ) {
                return;
            }

            // since this result is almost certainly not empty, closest() is the most efficient
            $branchNode = $node.closest( '.or-branch' );

            p = {};
            cacheIndex = null;

            p.relevant = that.form.input.getRelevant( $node );
            p.path = that.form.input.getName( $node );

            if ( $branchNode.length !== 1 ) {
                if ( $node.parentsUntil( '.or', '#or-calculated-items' ).length === 0 ) {
                    console.error( 'could not find branch node for ', $( this ) );
                }
                return;
            }
            /*
             * Determining ancestry is expensive. Using the knowledge most forms don't use repeats and
             * if they do, they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
             * The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
             * (6-7 seconds of loading time on the bench6 form)
             */
            insideRepeat = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
            insideRepeatClone = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;
            /* 
             * If the relevant is placed on a group and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available.
             */
            if ( $node.children( '.or-repeat-info[data-name="' + p.path + '"]' ).length && !$node.children( '.or-repeat[name="' + p.path + '"]' ).length ) {
                context = null;
            } else {
                context = p.path;
            }
            /*
             * Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
             * It can be safely set to 0 for other branches.
             */
            p.ind = ( context && insideRepeatClone ) ? that.form.input.getIndex( $node ) : 0;
            /*
             * Caching is only possible for expressions that do not contain relative paths to nodes.
             * So, first do a *very* aggresive check to see if the expression contains a relative path.
             * This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
             * expression, which may prove to be incorrect.
             */
            if ( p.relevant.indexOf( '..' ) === -1 ) {
                if ( !insideRepeat ) {
                    cacheIndex = p.relevant;
                } else {
                    // The path is stripped of the last nodeName to record the context.
                    // This might be dangerous, but until we find a bug, it helps in those forms where one group contains
                    // many sibling questions that each have the same relevant.
                    cacheIndex = p.relevant + '__' + p.path.substring( 0, p.path.lastIndexOf( '/' ) ) + '__' + p.ind;
                }
            }
            if ( cacheIndex && typeof relevantCache[ cacheIndex ] !== 'undefined' ) {
                result = relevantCache[ cacheIndex ];
            } else {
                result = that.evaluate( p.relevant, context, p.ind );
                relevantCache[ cacheIndex ] = result;
            }

            if ( !insideRepeat ) {
                alreadyCovered.push( $( this ).attr( 'name' ) );
            }

            if ( that.process( $branchNode, result, forceClearIrrelevant ) === true ) {
                branchChange = true;
            }
        } );

        if ( branchChange ) {
            this.form.view.$.trigger( 'changebranch' );
        }
    },
    /**
     * Evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
     *
     * @param  {string} expr        [description]
     * @param  {string} contextPath [description]
     * @param  {number} index       [description]
     * @return {boolean}             [description]
     */
    evaluate: function( expr, contextPath, index ) {
        var result = this.form.model.evaluate( expr, 'boolean', contextPath, index );
        return result;
    },
    /**
     * Processes the evaluation result for a branch
     *
     * @param  {jQuery} $branchNode [description]
     * @param  {boolean} result      [description]
     */
    process: function( $branchNode, result, forceClearIrrelevant ) {
        if ( result === true ) {
            return this.enable( $branchNode );
        } else {
            return this.disable( $branchNode, forceClearIrrelevant );
        }
    },

    /**
     * Checks whether branch currently has 'relevant' state
     *
     * @param  {jQuery} $branchNode [description]
     * @return {boolean}             [description]
     */
    selfRelevant: function( $branchNode ) {
        return !$branchNode.hasClass( 'disabled' ) && !$branchNode.hasClass( 'pre-init' );
    },

    /**
     * Enables and reveals a branch node/group
     *
     * @param  {jQuery} $branchNode The jQuery object to reveal and enable
     */
    enable: function( $branchNode ) {
        var type;
        var change = false;

        if ( !this.selfRelevant( $branchNode ) ) {
            change = true;
            $branchNode.removeClass( 'disabled pre-init' );

            this.form.widgets.enable( $branchNode );

            type = $branchNode.prop( 'nodeName' ).toLowerCase();

            if ( type === 'label' ) {
                $branchNode.children( 'input, select, textarea' ).prop( 'disabled', false );
            } else if ( type === 'fieldset' || type === 'section' ) {
                $branchNode.prop( 'disabled', false );
                /*
                 * A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503
                 * where the file inputs end up in a weird partially enabled state.
                 * Refresh the state by disabling and enabling the file inputs again.
                 */
                $branchNode.find( '*:not(.or-branch) input[type="file"]:not([data-relevant])' )
                    .prop( 'disabled', true )
                    .prop( 'disabled', false );
            } else {
                $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', false );
            }
        }
        return change;
    },
    /**
     * Disables and hides a branch node/group
     *
     * @param  {jQuery} $branchNode The jQuery object to hide and disable
     */
    disable: function( $branchNode, forceClearIrrelevant ) {
        var type = $branchNode.prop( 'nodeName' ).toLowerCase();
        var virgin = $branchNode.hasClass( 'pre-init' );
        var change = false;

        if ( virgin || this.selfRelevant( $branchNode ) || forceClearIrrelevant ) {
            change = true;
            $branchNode.addClass( 'disabled' );
            this.form.widgets.disable( $branchNode );
            // if the branch was previously enabled
            if ( !virgin ) {
                if ( this.form.options.clearIrrelevantImmediately || forceClearIrrelevant ) {
                    // A change event ensures the model is updated
                    // An inputupdate event is required to update widgets
                    $branchNode.clearInputs( 'change', 'inputupdate.enketo' );
                }
                // all remaining fields marked as invalid can now be marked as valid
                $branchNode.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                    this.setValid( $( this ) );
                } );
            } else {
                $branchNode.removeClass( 'pre-init' );
            }

            if ( type === 'label' ) {
                $branchNode.children( 'input, select, textarea' ).prop( 'disabled', true );
            } else if ( type === 'fieldset' || type === 'section' ) {
                // TODO: a <section> cannot be disabled like this
                $branchNode.prop( 'disabled', true );
            } else {
                $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', true );
            }
        }
        return change;
    }

};
