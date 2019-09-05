/**
 * Repeat module.
 *
 * Two important concepts are used:
 * 1. The first XLST-added repeat view is cloned to serve as a template of that repeat.
 * 2. Each repeat series has a sibling .or-repeat-info element that stores info that is relevant to that series.
 *
 * Note that with nested repeats you may have many more series of repeats than templates, because a nested repeat
 * may have multiple series.
 *
 * @module repeat
 */

import $ from 'jquery';
import events from './event';
import { t } from 'enketo/translator';
import dialog from 'enketo/dialog';

import config from 'enketo/config';
const disableFirstRepeatRemoval = config.repeatOrdinals === true;

export default {
    /**
     * Initializes all Repeat Groups in form (only called once).
     * @param  {Form} form the parent form object
     */
    init() {
        const that = this;
        let $repeatInfos;

        if ( !this.form ) {
            throw new Error( 'Repeat module not correctly instantiated with form property.' );
        }

        $repeatInfos = this.form.view.$.find( '.or-repeat-info' );
        this.templates = {};
        // Add repeat numbering elements
        $repeatInfos
            .siblings( '.or-repeat' )
            .prepend( '<span class="repeat-number"></span>' )
            // add empty class for calculation-only repeats
            .addBack()
            .filter( function() {
                // remove whitespace
                if ( this.firstChild && this.firstChild.nodeType === 3 ) {
                    this.firstChild.textContent = '';
                }
                return !this.querySelector( '.question' );
            } )
            .addClass( 'empty' );
        // Add repeat buttons
        $repeatInfos.filter( '*:not([data-repeat-fixed]):not([data-repeat-count])' )
            .append( '<button type="button" class="btn btn-default add-repeat-btn"><i class="icon icon-plus"> </i></button>' )
            .siblings( '.or-repeat' )
            .append( `<div class="repeat-buttons"><button type="button" ${disableFirstRepeatRemoval ? ' disabled ' : ' '}class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>` );
        /**
         * The model also requires storing repeat templates for repeats that do not have a jr:template.
         * Since the model has no knowledge of which node is a repeat, we direct this here.
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
        $repeatInfos.siblings( '.or-repeat' ).reverse().each( function() {
            const templateEl = this.cloneNode( true );
            const xPath = templateEl.getAttribute( 'name' );
            this.remove();
            $( templateEl ).removeClass( 'contains-current current' ).find( '.current' ).removeClass( 'current' );
            that.templates[ xPath ] = templateEl;
        } );

        $repeatInfos.filter( '*:not([data-repeat-count])' ).reverse()
            .each( function() {
                // don't do nested repeats here, they will be dealt with recursively
                if ( !$( this ).closest( '.or-repeat' ).length ) {
                    that.updateDefaultFirstRepeatInstance( null, this );
                }
            } )
            // If there is no repeat-count attribute, check how many repeat instances
            // are in the model, and update view if necessary.
            .each( that.updateViewInstancesFromModel.bind( this ) );

        // delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
        this.form.view.$.on( 'click', 'button.add-repeat-btn:enabled', function() {
            // Create a clone
            that.add( $( this ).closest( '.or-repeat-info' )[ 0 ] );
            // Prevent default
            return false;
        } );
        this.form.view.$.on( 'click', 'button.remove:enabled', function() {
            that.confirmDelete( this.closest( '.or-repeat' ) );
            //prevent default
            return false;
        } );

        this.countUpdate();
    },
    // Make this function overwritable
    confirmDelete( repeatEl ) {
        const that = this;
        dialog.confirm( { heading: t( 'confirm.repeatremove.heading' ), msg: t( 'confirm.repeatremove.msg' ) } )
            .then( confirmed => {
                if ( confirmed ) {
                    //remove clone
                    that.remove( $( repeatEl ) );
                }
            } )
            .catch( console.error );
    },
    /*
     * Obtains the absolute index of the provided repeat or repeat-info element
     * The goal of this function is to make non-nested repeat index determination as fast as possible.
     */
    getIndex( el ) {
        if ( !el || !this.form.repeatsPresent ) {
            return 0;
        }
        let checkEl = el.parentElement.closest( '.or-repeat' );
        const info = el.classList.contains( 'or-repeat-info' );
        let count = info ? 1 : Number( el.querySelector( '.repeat-number' ).textContent );
        let name;
        while ( checkEl ) {
            while ( checkEl.previousElementSibling && checkEl.previousElementSibling.matches( '.or-repeat' ) ) {
                checkEl = checkEl.previousElementSibling;
                if ( info ) {
                    count++;
                } else {
                    name = name || el.getAttribute( 'name' );
                    count += checkEl.querySelectorAll( `.or-repeat[name="${name}"]` ).length;
                }
            }
            const parent = checkEl.parentElement;
            checkEl = parent ? parent.closest( '.or-repeat' ) : null;
        }
        return count - 1;
    },
    /*
     * Obtains the absolute index of the provided repeat-info element
     */
    getInfoIndex( repeatInfo ) {
        if ( !this.form.repeatsPresent ) {
            return 0;
        }
        if ( !repeatInfo || !repeatInfo.classList.contains( 'or-repeat-info' ) ) {
            return null;
        }
        const name = repeatInfo.dataset.name;
        return [ ...repeatInfo.closest( 'form.or' ).querySelectorAll( `.or-repeat-info[data-name="${name}"]` ) ].indexOf( repeatInfo );
    },
    /**
     * [updateViewInstancesFromModel description]
     * @param {number} idx - not used but part of jQuery.each
     * @param {Element} repeatInfo - repeatInfo element
     * @return {number}
     */
    updateViewInstancesFromModel( idx, repeatInfo ) {
        const that = this;
        const $repeatInfo = $( repeatInfo );
        const repeatPath = repeatInfo.dataset.name;
        // All we need is to find out in which series we are.
        const repeatSeriesIndex = this.getIndex( repeatInfo );
        const repInModelSeries = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
        const repInViewSeries = $repeatInfo.siblings( '.or-repeat' );
        // First rep is already included (by XSLT transformation)
        if ( repInModelSeries.length > repInViewSeries.length ) {
            this.add( repeatInfo, repInModelSeries.length - repInViewSeries.length );
            // Now check the repeat counts of all the descendants of this repeat and its new siblings
            // Note: not tested with triple-nested repeats, but probably taking the better safe-than-sorry approach,
            // so should be okay except for performance.
            $repeatInfo.siblings( '.or-repeat' )
                .find( '.or-repeat-info:not([data-repeat-count])' )
                .each( function() {
                    that.updateViewInstancesFromModel( null, this );
                } );
        }
        return repInModelSeries.length;
    },
    /**
     * [updateDefaultFirstRepeatInstance description]
     * @param {number} idx - not used but part of jQuery.each
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateDefaultFirstRepeatInstance( idx, repeatInfo ) {
        let repeatSeriesIndex;
        let repeatSeriesInModel;
        const that = this;
        const $repeatInfo = $( repeatInfo );
        const repeatPath = repeatInfo.dataset.name;
        if ( !that.form.model.data.instanceStr && !this.templates[ repeatPath ].classList.contains( 'or-appearance-minimal' ) ) {
            repeatSeriesIndex = this.getIndex( repeatInfo );
            repeatSeriesInModel = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
            if ( repeatSeriesInModel.length === 0 ) {
                // explicitly provide a count, so that byCountUpdate is passed to the addrepeat event
                this.add( repeatInfo, 1 );
            }
            $repeatInfo.siblings( '.or-repeat' )
                .find( '.or-repeat-info:not([data-repeat-count])' )
                .each( that.updateDefaultFirstRepeatInstance.bind( that ) );
        }
    },
    /**
     * [updateRepeatInstancesFromCount description]
     *
     * @param {number} idx - not used but part of jQuery.each
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateRepeatInstancesFromCount( idx, repeatInfo ) {
        const that = this;
        let $last;
        let numRepsInCount;
        const $repeatInfo = $( repeatInfo );
        const repCountPath = repeatInfo.dataset.repeatCount || '';

        if ( !repCountPath ) {
            return;
        }

        /*
         * We cannot pass an .or-repeat context to model.evaluate() if the number or repeats in a series is zero.
         * However, but we do still need a context for nested repeats where the count of the nested repeat
         * is determined in a node inside the parent repeat. To do so we use the repeat comment in model as context.
         */
        const repPath = repeatInfo.dataset.name;
        const repCountNode = this.form.model.evaluate( repCountPath, 'node', this.form.model.getRepeatCommentSelector( repPath ), this.getInfoIndex( repeatInfo ), true );

        if ( repCountNode ) {
            numRepsInCount = Number( repCountNode.textContent );
        } else {
            console.error( 'Unexpectedly, could not obtain repeat count node' );
        }

        numRepsInCount = isNaN( numRepsInCount ) ? 0 : numRepsInCount;
        const numRepsInView = $repeatInfo.siblings( `.or-repeat[name="${repPath}"]` ).length;
        let toCreate = numRepsInCount - numRepsInView;

        if ( toCreate > 0 ) {
            that.add( repeatInfo, toCreate );
        } else if ( toCreate < 0 ) {
            toCreate = Math.abs( toCreate ) >= numRepsInView ? -numRepsInView + ( disableFirstRepeatRemoval ? 1 : 0 ) : toCreate;
            for ( ; toCreate < 0; toCreate++ ) {
                $last = $repeatInfo.siblings( '.or-repeat' ).last();
                this.remove( $last, 0 );
            }
        }
        // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
        // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
        $repeatInfo.siblings( '.or-repeat' )
            .children( '.or-group, .or-group-data' )
            .children( '.or-repeat-info[data-repeat-count]' )
            .each( that.updateRepeatInstancesFromCount.bind( that ) );
    },
    /**
     * Checks whether repeat count value has been updated and updates repeat instances
     * accordingly.
     *
     * @param {UpdatedDataNodes} updated - The object containing info on updated data nodes.
     */
    countUpdate( updated ) {
        let $repeatInfos;
        updated = updated || {};
        $repeatInfos = this.form.getRelatedNodes( 'data-repeat-count', '.or-repeat-info', updated );
        $repeatInfos.each( this.updateRepeatInstancesFromCount.bind( this ) );
    },
    /**
     * Clone a repeat group/node.
     *
     * @param {Element} repeatInfo - A repeatInfo element.
     * @param {number=} count - Number of clones to create.
     * @return {boolean} Cloning success/failure outcome.
     */
    add( repeatInfo, count ) {
        let $repeats;
        let $clone;
        let repeatIndex;
        let repeatSeriesIndex;
        let repeatPath;
        let i;
        const that = this;
        const $repeatInfo = $( repeatInfo );
        const byCountUpdate = !!count;
        let modelRepeatSeriesLength;

        count = count || 1;

        if ( !repeatInfo ) {
            console.error( 'Nothing to clone' );
            return false;
        }

        repeatPath = repeatInfo.dataset.name;
        $repeats = $repeatInfo.siblings( '.or-repeat' );

        $clone = $( this.templates[ repeatPath ] ).clone();

        // Determine the index of the repeat series.
        repeatSeriesIndex = this.getIndex( repeatInfo );
        modelRepeatSeriesLength = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex ).length;
        // Determine the index of the repeat inside its series
        const prevSibling = repeatInfo.previousElementSibling;
        let repeatIndexInSeries = prevSibling && prevSibling.classList.contains( 'or-repeat' ) ?
            Number( prevSibling.querySelector( '.repeat-number' ).textContent ) : 0;

        // Add required number of repeats
        for ( i = 0; i < count; i++ ) {
            // Fix names of radio button groups
            $clone.find( '.option-wrapper' ).each( this.fixRadioNames );
            $clone.find( 'datalist' ).each( this.fixDatalistIds );

            // Insert the clone
            $clone.insertBefore( repeatInfo );

            if ( repeatIndexInSeries > 0 ) {
                // Also add the clone class for all 2+ numbers as this is
                // used for performance optimization in several places.
                $clone.addClass( 'clone' );
            }

            // Update the repeat number
            $clone[ 0 ].querySelector( '.repeat-number' ).textContent = repeatIndexInSeries + 1;

            // Update the variable containing the view repeats in the current series.
            $repeats = $repeats.add( $clone );

            // Create a repeat in the model if it doesn't already exist
            if ( $repeats.length > modelRepeatSeriesLength ) {
                this.form.model.addRepeat( repeatPath, repeatSeriesIndex );
                modelRepeatSeriesLength++;
            }
            // This is the index of the new repeat in relation to all other repeats of the same name,
            // even if they are in different series.
            repeatIndex = repeatIndex || this.getIndex( $clone[ 0 ] );
            // This will trigger setting default values, calculations, readonly, relevancy, language updates, and automatic page flips.
            $clone[ 0 ].dispatchEvent( events.AddRepeat( [ repeatIndex, byCountUpdate ] ) );
            // Initialize widgets in clone after default values have been set
            if ( this.form.widgetsInitialized ) {
                this.form.widgets.init( $clone, this.form.options );
            } else {
                // Upon inital formload the eventhandlers for calculated items have not yet been set.
                // Calculations have already been initialized before the repeat clone(s) were created.
                // Therefore, we manually trigger a calculation update for the cloned repeat.
                that.form.calc.update( {
                    repeatPath,
                    repeatIndex
                } );
            }
            // now create the first instance of any nested repeats if necessary
            $clone.find( '.or-repeat-info:not([data-repeat-count])' ).each( this.updateDefaultFirstRepeatInstance.bind( this ) );

            $clone = $( this.templates[ repeatPath ] ).clone();

            repeatIndex++;
            repeatIndexInSeries++;
        }

        // number the repeats
        //this.numberRepeats( repeatInfo );
        // enable or disable + and - buttons
        this.toggleButtons( repeatInfo );

        return true;
    },
    remove( $repeat, delay ) {
        const that = this;
        const $next = $repeat.next( '.or-repeat, .or-repeat-info' );
        const repeatPath = $repeat.attr( 'name' );
        const repeatIndex = this.getIndex( $repeat[ 0 ] );
        const repeatInfo = $repeat.siblings( '.or-repeat-info' )[ 0 ];

        delay = typeof delay !== 'undefined' ? delay : 600;

        $repeat.hide( delay, () => {
            $repeat.remove();
            that.numberRepeats( repeatInfo );
            that.toggleButtons( repeatInfo );
            // Trigger the removerepeat on the next repeat or repeat-info(always present)
            // so that removerepeat handlers know where the repeat was removed
            $next[ 0 ].dispatchEvent( events.RemoveRepeat() );
            // Now remove the data node
            that.form.model.node( repeatPath, repeatIndex ).remove();
        } );
    },
    fixRadioNames( index, element ) {
        $( element ).find( 'input[type="radio"]' )
            .attr( 'name', Math.floor( ( Math.random() * 10000000 ) + 1 ) );
    },
    fixDatalistIds( index, element ) {
        const newId = element.id + Math.floor( ( Math.random() * 10000000 ) + 1 );
        element.parentNode.querySelector( `input[list="${element.id}"]` ).setAttribute( 'list', newId );
        element.id = newId;
    },
    toggleButtons( repeatInfo ) {
        $( repeatInfo )
            .siblings( '.or-repeat' )
            .children( '.repeat-buttons' )
            .find( 'button.remove' )
            .prop( 'disabled', false )
            .first()
            .prop( 'disabled', disableFirstRepeatRemoval );
    },
    numberRepeats( repeatInfo ) {
        $( repeatInfo )
            .siblings( '.or-repeat' )
            .each( ( idx, repeat ) => {
                $( repeat ).children( '.repeat-number' ).text( idx + 1 );
            } );
    }
};
