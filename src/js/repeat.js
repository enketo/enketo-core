'use strict';

/**
 * Repeats module.
 * 
 * Two important concepts are used:
 * 1. The first XLST-added repeat view is cloned to serve as a template of that repeat.
 * 2. Each repeat series has a sibling .or-repeat-info element that stores info that is relevant to that series.
 *
 * Note that with nested repeats you may have many more series of repeats than templates, because a nested repeat
 * may have multiple series.
 */

var $ = require( 'jquery' );
var config = require( 'enketo-config' );

module.exports = {
    /**
     * Initializes all Repeat Groups in form (only called once).
     * @param  {Form} form the parent form object
     */
    init: function() {
        var that = this;
        var $repeatInfos;

        if ( !this.form ) {
            throw new Error( 'Repeat module not correctly instantiated with form property.' );
        }

        $repeatInfos = this.form.view.$.find( '.or-repeat-info' );
        this.templates = {};
        $repeatInfos.siblings( '.or-repeat' )
            .prepend( '<span class="repeat-number"></span>' );
        $repeatInfos.filter( '*:not([data-repeat-fixed]):not([data-repeat-count])' ).siblings( '.or-repeat' )
            .append( '<div class="repeat-buttons"><button type="button" class="btn btn-default repeat"><i class="icon icon-plus"> </i></button>' +
                '<button type="button" disabled class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>' );

        /**
         * The model also requires storing repeat templates for repeats that do not have a jr:template.
         * Since the model has no knowledge of which node is a repeat, we do this here.
         */
        this.form.model.extractFakeTemplates( $repeatInfos.map( function() {
            return this.dataset.name;
        } ).get() );

        /**
         * Clone all repeats to serve as templates
         * in reverse document order to properly deal with nested repeat templates
         *
         * Widgets not yet initialized. Values not yet set.
         */
        $repeatInfos.siblings( '.or-repeat' ).clone().reverse().each( function() {
            var $templateEl = $( this );
            var xPath = $templateEl.attr( 'name' );
            that.templates[ xPath ] = $templateEl;
        } );

        $repeatInfos.filter( '*:not([data-repeat-count])' ).each( function() {
            // If there is no repeat-count attribute, check how many repeat instances 
            // are in the model, and update view if necessary.
            that.updateViewInstancesFromModel( $( this ) );

        } );

        // delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
        this.form.view.$.on( 'click', 'button.repeat:enabled', function() {
            // Create a clone
            that.clone( $( this ).closest( '.or-repeat' ).siblings( '.or-repeat-info' ).eq( 0 ) );
            // Prevent default
            return false;
        } );
        this.form.view.$.on( 'click', 'button.remove:enabled', function() {
            //remove clone
            that.remove( $( this ).closest( '.or-repeat.clone' ) );
            //prevent default
            return false;
        } );

        this.countUpdate();
    },
    updateViewInstancesFromModel: function( $repeatInfo ) {
        var that = this;
        var repeatPath = $repeatInfo.data( 'name' );
        // All we need is to find out in which series we are.
        var repeatSeriesIndex = this.form.view.$.find( '.or-repeat-info[data-name="' + repeatPath + '"]' ).index( $repeatInfo );
        var repInModelSeries = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
        var repInViewSeries = $repeatInfo.siblings( '.or-repeat' );
        // First rep is already included (by XSLT transformation)
        if ( repInModelSeries.length > repInViewSeries.length ) {
            this.clone( $repeatInfo, repInModelSeries.length - repInViewSeries.length );
            // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
            // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
            $repeatInfo.siblings( '.or-repeat' )
                .children( '.or-group, .or-group-data' )
                .children( '.or-repeat-info:not([data-repeat-count])' )
                .each( function() {
                    that.updateViewInstancesFromModel( $( this ) );
                } );
        }
    },
    updateRepeatInstancesFromCount: function( $info ) {
        var that = this;
        var $last = $info.siblings( '.or-repeat' ).last();
        var repCountPath = $info.data( 'repeatCount' ) || '';
        var name = $info.data( 'name' );
        var index = this.form.view.$.find( '.or-repeat[name="' + name + '"]' ).index( $last );
        var numRepsInView = $info.siblings( '.or-repeat[name="' + name + '"]' ).length;
        var numRepsInCount;
        var toCreate;
        // Don't pass context if the context is gone because all repeats in a series have been deleted.
        if ( index === -1 ) {
            name = null;
            index = null;
        }
        numRepsInCount = ( repCountPath.length > 0 ) ? this.form.model.evaluate( repCountPath, 'number', name, index, true ) : 0;
        numRepsInCount = isNaN( numRepsInCount ) ? 0 : numRepsInCount;
        toCreate = numRepsInCount - numRepsInView;

        if ( toCreate > 0 ) {
            that.clone( $info, toCreate );
        } else if ( toCreate < 0 ) {
            // temporary undocumented way to disable ability to remove first repeat
            toCreate = Math.abs( toCreate ) >= numRepsInView ? -numRepsInView + ( config.repeatOrdinals === true ? 1 : 0 ) : toCreate;
            for ( ; toCreate < 0; toCreate++ ) {
                $last = $info.siblings( '.or-repeat' ).last();
                this.remove( $last, 0 );
            }
        }
        // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
        // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
        $info.siblings( '.or-repeat' )
            .children( '.or-group, .or-group-data' )
            .children( '.or-repeat-info[data-repeat-count]' )
            .each( function() {
                that.updateRepeatInstancesFromCount( $( this ) );
            } );
    },
    /**
     * Checks whether repeat count value has been updated and updates repeat instances
     * accordingly.
     * 
     * @param  {[type]} updated [description]
     * @return {[type]}         [description]
     */
    countUpdate: function( updated ) {
        var $repeatInfos;
        var that = this;

        updated = updated || {};
        $repeatInfos = this.form.getRelatedNodes( 'data-repeat-count', '.or-repeat-info', updated );

        $repeatInfos.each( function() {
            that.updateRepeatInstancesFromCount( $( this ) );
        } );
    },
    /**s
     * clone a repeat group/node
     * @param   {jQuery} $node node to clone
     * @param   {number=} count number of clones to create
     * @return  {boolean}       [description]
     */
    clone: function( $info, count ) {
        var $repeats;
        var $clone;
        var $repeatsToUpdate;
        var repeatIndex;
        var repeatSeriesIndex;
        var repeatPath;
        var i;
        var that = this;
        var byCountUpdate = !!count;
        var modelRepeatSeries;

        count = count || 1;

        if ( $info.length !== 1 ) {
            console.error( 'Nothing to clone' );
            return false;
        }

        repeatPath = $info.data( 'name' );
        $repeats = $info.siblings( '.or-repeat' );

        // Add clone class to allow some simplistic performance optimization elsewhere.
        $clone = this.templates[ repeatPath ].clone().addClass( 'clone' );
        // Determine the index of the repeat series.
        repeatSeriesIndex = this.form.view.$.find( '.or-repeat-info[data-name="' + repeatPath + '"]' ).index( $info );

        // Add required number of repeats
        for ( i = 0; i < count; i++ ) {
            // Fix names of radio button groups
            $clone.find( '.option-wrapper' ).each( this.fixRadioNames );
            // Insert the clone
            $clone.insertBefore( $info );
            // Update the variable containing the view repeats in the current series.
            $repeats = $repeats.add( $clone );
            // TODO: not efficient, could be incremental
            modelRepeatSeries = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
            // Create a repeat in the model if it doesn't already exist
            if ( $repeats.length > modelRepeatSeries.length ) {
                this.form.model.cloneRepeat( repeatPath, repeatSeriesIndex );
            }
            // This is the index of the new repeat in relation to all other repeats of the same name,
            // even if they are in different series.
            repeatIndex = repeatIndex || this.form.view.$.find( '.or-repeat[name="' + repeatPath + '"]' ).index( $clone );
            // This will trigger setting default values and automatic page flips.
            $clone.trigger( 'addrepeat', [ repeatIndex, byCountUpdate ] );
            // Initialize widgets in clone after default values have been set
            if ( this.form.widgetsInitialized ) {
                this.form.widgets.init( $clone );
            } else {
                // Upon inital formload the eventhandlers for calculated items have not yet been set.
                // Calculations have already been initialized before the repeat clone(s) were created.
                // Therefore, we manually trigger a calculation update for the cloned repeat.
                that.form.calc.update( {
                    repeatPath: repeatPath,
                    repeatIndex: repeatIndex
                } );
            }

            $clone = this.templates[ repeatPath ].clone().addClass( 'clone' );
            repeatIndex++;
        }

        $repeatsToUpdate = $repeats.add( $repeats.find( '.or-repeat' ) );
        // number the repeats
        this.numberRepeats( $repeatsToUpdate );
        // enable or disable + and - buttons
        this.toggleButtons( $repeatsToUpdate );

        return true;
    },
    remove: function( $repeat, delay ) {
        var that = this;
        var $prev = $repeat.prev( '.or-repeat' );
        var repeatPath = $repeat.attr( 'name' );
        var repeatIndex = this.form.view.$.find( '.or-repeat[name="' + repeatPath + '"]' ).index( $repeat );
        var $siblings = $repeat.siblings( '.or-repeat' );

        delay = typeof delay !== 'undefined' ? delay : 600;

        $repeat.hide( delay, function() {
            $repeat.remove();
            that.numberRepeats( $siblings );
            that.toggleButtons( $siblings );
            // Trigger the removerepeat on the previous repeat (always present)
            // so that removerepeat handlers know where the repeat was removed
            $prev.trigger( 'removerepeat' );
            // Now remove the data node
            that.form.model.node( repeatPath, repeatIndex ).remove();
        } );
    },
    fixRadioNames: function( index, element ) {
        $( element ).find( 'input[type="radio"]' )
            .attr( 'name', Math.floor( ( Math.random() * 10000000 ) + 1 ) );
    },
    toggleButtons: function( $repeats ) {
        var $repeat;
        var $repSiblingsAndSelf;

        $repeats = ( !$repeats || $repeats.length === 0 ) ? $() : $repeats;

        $repeats.each( function() {
            $repeat = $( this );
            $repSiblingsAndSelf = $repeat.siblings( '.or-repeat' ).addBack();
            //first switch everything off and remove hover state
            $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.repeat, button.remove' ).prop( 'disabled', true );

            //then enable the appropriate ones
            $repSiblingsAndSelf.last().children( '.repeat-buttons' ).find( 'button.repeat' ).prop( 'disabled', false );
            $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.remove' ).not( ':first' ).prop( 'disabled', false );
        } );
    },
    numberRepeats: function( $repeats ) {
        $repeats.each( function() {
            var $repSiblings;
            var qtyRepeats;
            var i;
            var $repeat = $( this );
            // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
            if ( $repeat.prev( '.or-repeat' ).length === 0 ) {
                $repSiblings = $( this ).siblings( '.or-repeat' );
                qtyRepeats = $repSiblings.length + 1;
                if ( qtyRepeats > 1 ) {
                    $repeat.find( '.repeat-number' ).text( '1' );
                    i = 2;
                    $repSiblings.each( function() {
                        $( this ).find( '.repeat-number' ).eq( 0 ).text( i );
                        i++;
                    } );
                } else {
                    $repeat.find( '.repeat-number' ).eq( 0 ).empty();
                }
            }
        } );
    }
};
