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
import { getSiblingElements, getChildren, getSiblingElementsAndSelf } from './dom-utils';
import { isStaticItemsetFromSecondaryInstance } from './itemset';
import config from 'enketo/config';
const disableFirstRepeatRemoval = config.repeatOrdinals === true;

export default {
    /**
     * Initializes all Repeat Groups in form (only called once).
     */
    init() {
        const that = this;
        let $repeatInfos;

        this.staticLists = [];

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

        $repeatInfos.reverse()
            .each( function() {
                // don't do nested repeats here, they will be dealt with recursively
                if ( !$( this ).closest( '.or-repeat' ).length ) {
                    that.updateDefaultFirstRepeatInstance( this );
                }
            } )
            // If there is no repeat-count attribute, check how many repeat instances
            // are in the model, and update view if necessary.
            .get()
            .forEach( that.updateViewInstancesFromModel.bind( this ) );

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

        return true;
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
     *
     * @param {Element} repeatInfo - repeatInfo element
     * @return {number} length of repeat series in model
     */
    updateViewInstancesFromModel( repeatInfo ) {
        const repeatPath = repeatInfo.dataset.name;
        // All we need is to find out in which series we are.
        const repeatSeriesIndex = this.getIndex( repeatInfo );
        const repInModelSeries = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
        const repInViewSeries = getSiblingElements( repeatInfo, '.or-repeat' );
        // First rep is already included (by XSLT transformation)
        if ( repInModelSeries.length > repInViewSeries.length ) {
            this.add( repeatInfo, repInModelSeries.length - repInViewSeries.length, 'model' );
            // Now check the repeat counts of all the descendants of this repeat and its new siblings
            // Note: not tested with triple-nested repeats, but probably taking the better safe-than-sorry approach,
            // so should be okay except for performance.
            getSiblingElements( repeatInfo, '.or-repeat' )
                .reduce( ( acc, current ) => acc.concat( [ ...current.querySelectorAll( '.or-repeat-info:not([data-repeat-count])' ) ] ), [] )
                .forEach( this.updateViewInstancesFromModel.bind( this ) );
        }

        return repInModelSeries.length;
    },
    /**
     * [updateDefaultFirstRepeatInstance description]
     *
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateDefaultFirstRepeatInstance( repeatInfo ) {
        const repeatPath = repeatInfo.dataset.name;
        if ( !this.form.model.data.instanceStr && !this.templates[ repeatPath ].classList.contains( 'or-appearance-minimal' ) ) {
            const repeatSeriesIndex = this.getIndex( repeatInfo );
            const repeatSeriesInModel = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex );
            if ( repeatSeriesInModel.length === 0 ) {
                this.add( repeatInfo, 1, 'magic' );
            }

            getSiblingElements( repeatInfo, '.or-repeat' )
                .reduce( ( acc, current ) => acc.concat( [ ...current.querySelectorAll( '.or-repeat-info:not([data-repeat-count])' ) ] ), [] )
                .forEach( this.updateDefaultFirstRepeatInstance.bind( this ) );
        }
    },
    /**
     * [updateRepeatInstancesFromCount description]
     *
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateRepeatInstancesFromCount( repeatInfo ) {
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
        let numRepsInCount = this.form.model.evaluate( repCountPath, 'number', this.form.model.getRepeatCommentSelector( repPath ), this.getInfoIndex( repeatInfo ), true );
        numRepsInCount = isNaN( numRepsInCount ) ? 0 : numRepsInCount;
        const numRepsInView = getSiblingElements( repeatInfo, `.or-repeat[name="${repPath}"]` ).length;
        let toCreate = numRepsInCount - numRepsInView;

        if ( toCreate > 0 ) {
            this.add( repeatInfo, toCreate, 'count' );
        } else if ( toCreate < 0 ) {
            toCreate = Math.abs( toCreate ) >= numRepsInView ? -numRepsInView + ( disableFirstRepeatRemoval ? 1 : 0 ) : toCreate;
            for ( ; toCreate < 0; toCreate++ ) {
                const $last = $( repeatInfo ).siblings( '.or-repeat' ).last();
                this.remove( $last, 0 );
            }
        }
        // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
        // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
        getSiblingElementsAndSelf( repeatInfo, '.or-repeat' )
            .reduce( ( acc, current ) => acc.concat( getChildren( current, '.or-group, .or-group-data' ) ), [] )
            .reduce( ( acc, current ) => acc.concat( getChildren( current, '.or-repeat-info[data-repeat-count]' ) ), [] )
            .forEach( this.updateRepeatInstancesFromCount.bind( this ) );
    },
    /**
     * Checks whether repeat count value has been updated and updates repeat instances
     * accordingly.
     *
     * @param {UpdatedDataNodes} updated - The object containing info on updated data nodes.
     */
    countUpdate( updated = {} ) {
        const repeatInfos = this.form.getRelatedNodes( 'data-repeat-count', '.or-repeat-info', updated ).get();
        repeatInfos.forEach( this.updateRepeatInstancesFromCount.bind( this ) );
    },
    /**
     * Clone a repeat group/node.
     *
     * @param {Element} repeatInfo - A repeatInfo element.
     * @param {number=} toCreate - Number of clones to create.
     * @param {string=} trigger - The trigger ('magic', 'user', 'count', 'model')
     * @return {boolean} Cloning success/failure outcome.
     */
    add( repeatInfo, toCreate = 1, trigger = 'user' ) {
        if ( !repeatInfo ) {
            console.error( 'Nothing to clone' );

            return false;
        }

        let repeatIndex;
        const repeatPath = repeatInfo.dataset.name;

        let repeats = getSiblingElements( repeatInfo, '.or-repeat' );
        let clone = this.templates[ repeatPath ].cloneNode( true );

        // Determine the index of the repeat series.
        let repeatSeriesIndex = this.getIndex( repeatInfo );
        let modelRepeatSeriesLength = this.form.model.getRepeatSeries( repeatPath, repeatSeriesIndex ).length;
        // Determine the index of the repeat inside its series
        const prevSibling = repeatInfo.previousElementSibling;
        let repeatIndexInSeries = prevSibling && prevSibling.classList.contains( 'or-repeat' ) ?
            Number( prevSibling.querySelector( '.repeat-number' ).textContent ) : 0;

        // Add required number of repeats
        for ( let i = 0; i < toCreate; i++ ) {
            // Fix names of radio button groups
            clone.querySelectorAll( '.option-wrapper' ).forEach( this.fixRadioName );
            this.processDatalists( clone.querySelectorAll( 'datalist' ), repeatInfo );

            // Insert the clone
            repeatInfo.parentElement.insertBefore( clone, repeatInfo );

            if ( repeatIndexInSeries > 0 ) {
                // Also add the clone class for all 2+ numbers as this is
                // used for performance optimization in several places.
                clone.classList.add( 'clone' );
            }

            // Update the repeat number
            clone.querySelector( '.repeat-number' ).textContent = repeatIndexInSeries + 1;

            // Update the variable containing the view repeats in the current series.
            repeats.push( clone );

            // Create a repeat in the model if it doesn't already exist
            if ( repeats.length > modelRepeatSeriesLength ) {
                this.form.model.addRepeat( repeatPath, repeatSeriesIndex );
                modelRepeatSeriesLength++;
            }

            // This is the index of the new repeat in relation to all other repeats of the same name,
            // even if they are in different series.
            repeatIndex = repeatIndex || this.getIndex( clone );

            const updated = {
                repeatIndex,
                repeatPath,
                trigger,
                cloned: true
            };

            // The odk-new-repeat event (before the event that triggers re-calculations etc)
            if ( trigger === 'user' || trigger === 'count' ) {
                clone.dispatchEvent( events.NewRepeat( updated ) );
            }
            // This will trigger setting default values, calculations, readonly, relevancy, language updates, and automatic page flips.
            clone.dispatchEvent( events.AddRepeat( updated ) );

            // Initialize widgets in clone after default values have been set
            if ( this.form.widgetsInitialized ) {
                this.form.widgets.init( $( clone ), this.form.options );
            }
            // now create the first instance of any nested repeats if necessary
            clone.querySelectorAll( '.or-repeat-info:not([data-repeat-count])' )
                .forEach( this.updateDefaultFirstRepeatInstance.bind( this ) );

            clone = this.templates[ repeatPath ].cloneNode( true );

            repeatIndex++;
            repeatIndexInSeries++;
        }

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
    fixRadioName( element ) {
        const random = Math.floor( ( Math.random() * 10000000 ) + 1 );
        element.querySelectorAll( 'input[type="radio"]' )
            .forEach( el => {
                el.setAttribute( 'name', random );
            } );
    },
    fixDatalistId( element ) {
        const newId = element.id + Math.floor( ( Math.random() * 10000000 ) + 1 );
        element.parentNode.querySelector( `input[list="${element.id}"]` ).setAttribute( 'list', newId );
        element.id = newId;
    },
    processDatalists( datalists, repeatInfo ) {
        datalists.forEach( datalist => {
            const template = datalist.querySelector( '.itemset-template[data-items-path]' );
            const expr = template ? template.dataset.itemsPath : null;

            if ( !isStaticItemsetFromSecondaryInstance( expr ) ) {
                this.fixDatalistId( datalist );
            } else {
                const id = datalist.id;
                const inputs = getSiblingElements( datalist, 'input[list]' );
                const input = inputs.length ? inputs[ 0 ] : null;

                if ( input ) {
                    // For very long static datalists, a huge performance improvement can be achieved, by using the
                    // same datalist for all repeat instances that use it.
                    if ( this.staticLists.includes( id ) ) {
                        datalist.remove();
                    } else {
                        // Let all identical input[list] questions amongst all repeat instances use the same
                        // datalist by moving it under repeatInfo.
                        // It will survive removal of all repeat instances.
                        const parent = datalist.parentElement;
                        const name = input.name;

                        const dl = parent.querySelector( 'datalist' );
                        const detachedList = parent.removeChild( dl );
                        detachedList.setAttribute( 'data-name', name );
                        repeatInfo.appendChild( detachedList );

                        const translations = parent.querySelector( '.or-option-translations' );
                        const detachedTranslations = parent.removeChild( translations );
                        detachedTranslations.setAttribute( 'data-name', name );
                        repeatInfo.appendChild( detachedTranslations );

                        const labels = parent.querySelector( '.itemset-labels' );
                        const detachedLabels = parent.removeChild( labels );
                        detachedLabels.setAttribute( 'data-name', name );
                        repeatInfo.appendChild( detachedLabels );

                        this.staticLists.push( id );
                        //input.classList.add( 'shared' );
                    }
                }
            }
        } );
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
