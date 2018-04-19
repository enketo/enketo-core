'use strict';

/**
 * Updates branches
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 */

var $ = require( 'jquery' );

module.exports = {
    update: function( updated, forceClearIrrelevant ) {
        var $nodes;

        if ( !this.form ) {
            throw new Error( 'Branch module not correctly instantiated with form property.' );
        }

        $nodes = this.form.getRelatedNodes( 'data-relevant', '', updated );

        this.updateNodes( $nodes, forceClearIrrelevant );
    },
    updateNodes: function( $nodes, forceClearIrrelevant ) {
        var p;
        var $branchNode;
        var result;
        var insideRepeat;
        var insideRepeatClone;
        var cacheIndex;
        var relevantCache = {};
        var alreadyCovered = [];
        var branchChange = false;
        var that = this;
        var clonedRepeatsPresent;

        clonedRepeatsPresent = ( this.form.repeatsPresent && this.form.view.$.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

        $nodes.each( function() {
            var $node = $( this );
            var context;
            var $parentGroups;
            var pathParts;
            var parentPath;

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
             * Check if the (calculate without form control) node is part of a repeat that has no instances
             */
            pathParts = p.path.split( '/' );
            if ( pathParts.length > 3 ) {
                parentPath = pathParts.splice( 0, pathParts.length - 1 ).join( '/' );
                $parentGroups = that.form.view.$.find( '.or-group[name="' + parentPath + '"],.or-group-data[name="' + parentPath + '"]' )
                    // now remove the groups that have a repeat-info child without repeat instance siblings
                    .filter( function() {
                        var $g = $( this );
                        return $g.children( '.or-repeat' ).length > 0 || $g.children( '.or-repeat-info' ).length === 0;
                    } ); //.eq( index )
                // If the parent doesn't exist in the DOM it means there is a repeat ancestor and there are no instances of that repeat.
                // Hence that relevant does not need to be evaluated (and would fail otherwise because the context doesn't exist).
                if ( $parentGroups.length === 0 ) {
                    return;
                }
            }

            /*
             * Determining ancestry is expensive. Using the knowledge most forms don't use repeats and
             * if they do, they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
             * The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
             * (6-7 seconds of loading time on the bench6 form)
             */
            // TODO: these checks fail miserably for calculated items that do not have a form control
            insideRepeat = clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat' ).length > 0;
            insideRepeatClone = clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat.clone' ).length > 0;

            /* 
             * If the relevant is placed on a group and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available. This same logic is applied in output.js.
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

            if ( that.process( $branchNode, p.path, result, forceClearIrrelevant ) === true ) {
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
     * @param { jQuery } $branchNode [description]
     * @param { string } path Path of branch node
     * @param { boolean } result      result of relevant evaluation
     * @param { =boolean } forceClearIrrelevant Whether to force clearing of irrelevant nodes and descendants
     */
    process: function( $branchNode, path, result, forceClearIrrelevant ) {
        if ( result === true ) {
            return this.enable( $branchNode, path );
        } else {
            return this.disable( $branchNode, path, forceClearIrrelevant );
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
    enable: function( $branchNode, path ) {
        var change = false;

        if ( !this.selfRelevant( $branchNode ) ) {
            change = true;
            $branchNode.removeClass( 'disabled pre-init' );
            // Update calculated items, both individual question or descendants of group
            this.form.calc.update( {
                relevantPath: path
            } );
            this.form.widgets.enable( $branchNode );
            this.activate( $branchNode );
        }
        return change;
    },

    /**
     * Disables and hides a branch node/group
     *
     * @param  {jQuery} $branchNode The jQuery object to hide and disable
     */
    disable: function( $branchNode, path, forceClearIrrelevant ) {
        var virgin = $branchNode.hasClass( 'pre-init' );
        var change = false;

        if ( virgin || this.selfRelevant( $branchNode ) || forceClearIrrelevant ) {
            change = true;
            // if the branch was previously enabled, keep any default values
            if ( !virgin ) {
                if ( this.form.options.clearIrrelevantImmediately || forceClearIrrelevant ) {
                    this.clear( $branchNode, path );
                }
            } else {
                $branchNode.removeClass( 'pre-init' );
            }

            this.deactivate( $branchNode );
        }
        return change;
    },
    /**
     * Clears values from branchnode. 
     * This function is separated so it can be overridden in custom apps.
     * 
     * @param  {[type]} $branchNode [description]
     * @return {boolean}             [description]
     */
    clear: function( $branchNode, path ) {
        // A change event ensures the model is updated
        // An inputupdate event is required to update widgets
        $branchNode.clearInputs( 'change', 'inputupdate.enketo' );
        // Update calculated items if branch is a group
        // We exclude question branches here because those will have been cleared already in the previous line.
        if ( $branchNode.is( '.or-group, .or-group-data' ) ) {
            this.form.calc.update( {
                relevantPath: path
            } );
        }
    },
    setDisabledProperty: function( $branchNode, bool ) {
        var type = $branchNode.prop( 'nodeName' ).toLowerCase();

        if ( type === 'label' ) {
            $branchNode.children( 'input, select, textarea' ).prop( 'disabled', bool );
        } else if ( type === 'fieldset' || type === 'section' ) {
            // TODO: a <section> cannot be disabled like this
            $branchNode.prop( 'disabled', bool );
        } else {
            $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', bool );
        }
    },
    /**
     * Activates form controls.
     * This function is separated so it can be overridden in custom apps.
     * 
     * @param  {[type]} $branchNode [description]
     * @return {[type]}            [description]
     */
    activate: function( $branchNode ) {
        this.setDisabledProperty( $branchNode, false );
    },
    /**
     * Deactivates form controls.
     * This function is separated so it can be overridden in custom apps.
     * 
     * @param  {[type]} $branchNode [description]
     * @return {[type]}             [description]
     */
    deactivate: function( $branchNode ) {
        $branchNode.addClass( 'disabled' );
        this.form.widgets.disable( $branchNode );
        this.setDisabledProperty( $branchNode, true );
    }
};
