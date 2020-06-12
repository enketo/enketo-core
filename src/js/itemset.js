/**
 * Updates itemsets.
 *
 * @module itemset
 */

import { parseFunctionFromExpression } from './utils';
import dialog from 'enketo/dialog';
import { closestAncestorUntil, getChildren, getSiblingElements, elementDataStore as data } from './dom-utils';
import events from './event';
import { t } from 'enketo/translator';

/**
 * This function tries to determine whether an XPath expression for a nodeset from an external instance is static.
 * Hopefully in the future it can do this properly, but for now it considers any expression
 * with a non-numeric (position) predicate to be dynamic.
 * This function relies on external instances themselves to be static.
 *
 * @static
 * @param {string} expr - XPath expression to analyze
 * @return {boolean} Whether expression contains a predicate
 */
function isStaticItemsetFromSecondaryInstance( expr ) {
    const refersToInstance = /^\s*instance\(.+\)/.test( expr );
    if ( !refersToInstance ) {
        return false;
    }
    const containsPredicate = /\[.+\]/.test( expr );
    if ( !containsPredicate ) {
        return true;
    }
    const containsNumericPredicate = /\[\d+\]/.test( expr );

    return containsNumericPredicate;
}

export { isStaticItemsetFromSecondaryInstance };

export default {
    /**
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated = {} ) {
        const that = this;
        const fragmentsCache = {};
        let nodes;

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        if ( updated.relevantPath ) {
            // Questions that are descendants of a group:
            nodes  = this.form.getRelatedNodes( 'data-items-path', '.itemset-template' ).get()
                .filter( template => {
                    return template.querySelector( `[type="checkbox"][name^="${updated.relevantPath}/"]` ) // checkboxes, ancestor relevant
                     || template.querySelector( `[type="radio"][data-name^="${updated.relevantPath}/"]` ) //  radiobuttons, ancestor relevant
                     || template.parentElement.matches( `select[name^="${updated.relevantPath}/"]` ) // select minimal, ancestor relevant
                     || template.parentElement.parentElement.querySelector( `input[list][name^="${updated.relevantPath}/"]` ) // autocomplete, ancestor relevant
                     || template.querySelector( `[type="checkbox"][name="${updated.relevantPath}"]` ) // checkboxes, self relevant
                     || template.querySelector( `[type="radio"][data-name="${updated.relevantPath}"]` ) //  radiobuttons, self relevant
                     || template.parentElement.matches( `select[name="${updated.relevantPath}"]` ) // select minimal, self relevant
                     || template.parentElement.parentElement.querySelector( `input[list][name="${updated.relevantPath}"]` ); // autocomplete, self relevant
                } );

            // TODO: missing case: static shared itemlist in repeat

        } else {
            nodes = this.form.getRelatedNodes( 'data-items-path', '.itemset-template', updated )
                .get();
        }

        const clonedRepeatsPresent = this.form.repeatsPresent && this.form.view.html.querySelector( '.or-repeat.clone' );
        const alerts = [];

        nodes.forEach( template => {
            const shared = template.parentElement.parentElement.matches( '.or-repeat-info' );
            const inputAttributes = {};

            // Nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( closestAncestorUntil( template, '.disabled', '.or' ) ) {
                return;
            }

            const newItems = {};
            const prevItems = data.get( template, 'items' ) || {};
            const templateNodeName = template.nodeName.toLowerCase();
            const list = template.parentElement.matches( 'select, datalist' ) ? template.parentElement : null;

            let input;
            if ( templateNodeName === 'label' ) {
                const optionInput = getChildren( template, 'input' )[ 0 ];
                [].slice.call( optionInput.attributes ).forEach( attr => {
                    inputAttributes[ attr.name ] = attr.value;
                } );
                // If this is a ranking widget:
                input = optionInput.classList.contains( 'ignore' ) ? getSiblingElements( optionInput.closest( '.option-wrapper' ), 'input.rank' )[ 0 ] : optionInput;
            } else if ( list && list.nodeName.toLowerCase() === 'select' ) {
                input = list;
            } else if ( list && list.nodeName.toLowerCase() === 'datalist' ) {
                if ( shared ) {
                    // only the first input, is that okay?
                    input = that.form.view.html.querySelector( `input[name="${list.dataset.name}"]` );
                } else {
                    input = getSiblingElements( list, 'input:not(.widget)' )[ 0 ];
                }
            }

            const labelsContainer = getSiblingElements( template.closest( 'label, select, datalist' ), '.itemset-labels' )[ 0 ];
            const itemsXpath = template.dataset.itemsPath;
            let labelType = labelsContainer.dataset.labelType;
            let labelRef = labelsContainer.dataset.labelRef;
            // TODO: if translate() becomes official, move determination of labelType to enketo-xslt
            // and set labelRef correct in enketo-xslt
            const matches = parseFunctionFromExpression( labelRef, 'translate' );
            if ( matches.length ) {
                labelRef = matches[ 0 ][ 1 ][ 0 ];
                labelType = 'langs';
            }

            const valueRef = labelsContainer.dataset.valueRef;

            /**
             * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
             * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
             * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
             * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
             * the nodeset retrieves, Enketo's aproach works well.
             */
            // Shared datalists are under .or-repeat-info. Context is not relevant as these are static lists (without relative nodes).
            const context = that.form.input.getName( input );
            /*
             * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat and not shared.
             * It can be safely set to 0 for other branches.
             */
            const index = ( !shared && clonedRepeatsPresent && closestAncestorUntil( input, '.or-repeat.clone', '.or' ) ) ? that.form.input.getIndex( input ) : 0;
            const safeToTryNative = true;
            // Caching has no advantage here. This is a very quick query (natively).
            const instanceItems = this.form.model.evaluate( itemsXpath, 'nodes', context, index, safeToTryNative );

            // This property allows for more efficient 'itemschanged' detection
            newItems.length = instanceItems.length;
            // TODO: This may cause problems for large itemsets. Use md5 instead?
            newItems.text = instanceItems.map( item => item.textContent ).join( '' );

            if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                return;
            }

            data.put( template, 'items', newItems );

            /**
             * Remove current items before rebuilding a new itemset from scratch.
             */
            // the current <option> and <input> elements
            // datalist will catch the shared datalists inside .or-repeat-info
            const question = template.closest( '.question, datalist' );
            [ ...question.querySelectorAll( templateNodeName ) ].filter( el => el !== template ).forEach( el => el.remove() );
            // labels for current <option> elements
            const next = question.nextElementSibling;
            // next is a somewhat fragile match for option-translations belonging to a shared datalist in
            // .or-repeat-info if there are multiple shared datalists.
            const optionsTranslations = next && next.matches( '.or-option-translations' ) ? next : question.querySelector( '.or-option-translations' );
            if ( optionsTranslations ) {
                [ ...optionsTranslations.children ].forEach( child => child.remove() );
            }
            let optionsFragment = document.createDocumentFragment();
            let optionsTranslationsFragment = document.createDocumentFragment();
            let translations = [];
            const cacheKey = `${context}:${itemsXpath}`;

            if ( fragmentsCache[ cacheKey ] ) {
                // important: leave cache intact by cloning
                optionsFragment = fragmentsCache[ cacheKey ].optionsFragment.cloneNode( true );
                optionsTranslationsFragment = fragmentsCache[ cacheKey ].optionsTranslationsFragment.cloneNode( true );
            } else {
                instanceItems.forEach( item => {
                    /*
                     * Note: $labelRefs could either be
                     * - a single itext reference
                     * - a collection of labels with different lang attributes
                     * - a single label
                     */
                    const labels = that.getNodesFromItem( labelRef, item );
                    if ( !labels || !labels.length ) {
                        translations = [ { language: '', label: 'error', active: true } ];
                    } else {
                        switch ( labelType ) {
                            case 'itext':
                                // Search in the special .itemset-labels created in enketo-transformer for labels with itext ref.
                                translations = [ ...labelsContainer.querySelectorAll( `[data-itext-id="${labels[ 0 ].textContent}"]` ) ].map( label => {
                                    const language = label.getAttribute( 'lang' );
                                    const type = label.nodeName;
                                    const src = label.src;
                                    const text = label.textContent;
                                    const active = label.classList.contains( 'active' );
                                    const alt = label.alt;

                                    return { language, type, text, active, src, alt };
                                } );
                                break;
                            case 'langs':
                                translations = labels.map( label => {
                                    const lang = label.getAttribute( 'lang' );
                                    // Two falsy values should set active to true.
                                    const active = ( !lang && !that.form.langs.currentLang ) || ( lang === that.form.langs.currentLang );

                                    return { language: lang, type: 'span', text: label.textContent, active };
                                } );
                                break;
                            default:
                                translations = [ { language: '', type: 'span', text: labels && labels.length ? labels[ 0 ].textContent : 'error', active: true } ];
                        }
                    }
                    // Obtain the value of the secondary instance item found.
                    const value = that.getNodeFromItem( valueRef, item ).textContent;
                    /**
                     * #510 Show warning if select_multiple value has spaces
                     */
                    const multiple = ( inputAttributes[ 'data-type-xml' ] == 'select' ) && ( inputAttributes[ 'type' ] == 'checkbox' ) || ( list && list.multiple );
                    if ( multiple && ( value.indexOf( ' ' ) > -1 ) ) {
                        alerts[ alerts.length ] = t( 'alert.valuehasspaces.multiple', { value: value } );
                    }
                    if ( templateNodeName === 'label' ) {
                        optionsFragment.appendChild( that.createInput( inputAttributes, translations, value ) );
                    } else if ( templateNodeName === 'option' ) {
                        let activeLabel = '';
                        if ( translations.length > 1 ) {
                            translations.forEach( translation => {
                                if ( translation.active ) {
                                    activeLabel = translation.text;
                                }
                                optionsTranslationsFragment.appendChild( that.createOptionTranslation( translation, value ) );
                            } );
                        } else {
                            activeLabel = translations[ 0 ].text;
                        }
                        optionsFragment.appendChild( that.createOption( activeLabel, value ) );
                    }

                } );
                if ( isStaticItemsetFromSecondaryInstance( itemsXpath ) ) {
                    fragmentsCache[ cacheKey ] = {
                        optionsFragment: optionsFragment.cloneNode( true ),
                        optionsTranslationsFragment: optionsTranslationsFragment.cloneNode( true )
                    };
                }
            }

            template.parentNode.appendChild( optionsFragment );
            if ( optionsTranslations ) {
                optionsTranslations.appendChild( optionsTranslationsFragment );
            }

            /**
             * Attempt to populate inputs with current value in model (except for ranking input)
             * Note that if the current value is not empty and the new itemset does not
             * include (an) item(s) with this/se value(s), this will clear/update the model and
             * this will trigger a dataupdate event. This may call this update function again.
             */
            // It is not necessary to do this for default values in static itemsets because setAllVals takes care of this.

            let currentValue = that.form.model.node( context, index ).getVal();
            if ( currentValue !== '' ) {

                if ( input.classList.contains( 'rank' ) ) {
                    currentValue = '';
                }
                that.form.input.setVal( input, currentValue, events.Change() );
            }

            if ( list || input.classList.contains( 'rank' ) ) {
                input.dispatchEvent( events.ChangeOption() );
            }

        } );
        if ( alerts.length > 0 ) {
            /**
             * We're assuming the enketo-core-consuming app has a dialog that supports some basic HTML rendering
             */
            dialog.alert( alerts.join( '<br>' ) );
        }
    },

    /**
     * Minimal XPath evaluation helper that queries from a single item context.
     *
     * @param {string} expr - The XPath expression
     * @param {string} context - context path
     * @param {boolean} single - whether to only return a single (first) node
     * @return {Array<Element>} found nodes
     */
    getNodesFromItem( expr, context, single ) {
        if ( !expr ) {
            throw new Error( 'Error: could not query instance item, no expression provided' );
        }
        const type = single ? 9 : 7;
        const evaluateFnName = typeof this.form.model.xml.evaluate !== 'undefined' ? 'evaluate' : 'jsEvaluate';
        const result = this.form.model.xml[ evaluateFnName ]( expr, context, this.form.model.getNsResolver(), type, null );
        const response = [];
        if ( !single ) {
            for ( let j = 0; j < result.snapshotLength; j++ ) {
                response.push( result.snapshotItem( j ) );
            }
        } else {
            response.push( result.singleNodeValue );
        }

        return response;
    },

    /**
     * @param {string} expr - XPath expression
     * @param {string} context - evalation context path
     * @return {Element|null} found nodes
     */
    getNodeFromItem( expr, context ) {
        const nodes = this.getNodesFromItem( expr, context, true );

        return nodes.length ? nodes[ 0 ] : null;
    },

    /**
     * Creates a HTML option element
     *
     * @param {string} label - option label
     * @param {string} value - option value
     * @return {Element} created option
     */
    createOption( label, value ) {
        const option = document.createElement( 'option' );
        option.textContent = label;
        option.value = value;

        return option;
    },

    /**
     * Creates an option translation <span> element
     *
     * @param {object} translation - translation object
     * @param {string} [translation.type] - type of element to create, defaults to span
     * @param {string} [translation.text] - translation text
     * @param {string} value - option value
     * @return {Element} created element
     */
    createOptionTranslation( translation, value ) {
        const el = document.createElement( translation.type || 'span' );
        if ( translation.text ) {
            el.textContent = translation.text;
            el.classList.add( 'option-label' );
        }
        el.classList.toggle( 'active', translation.active );
        if ( translation.language ) {
            el.lang = translation.language;
        }
        el.dataset.optionValue = value;
        if ( translation.src ) {
            el.src = translation.src;
            el.alt = translation.alt;
        }

        return el;
    },

    /**
     * Creates an input HTML element
     *
     * @param {Array<object>} attributes - attributes to add to input
     * @param {Array<object>} translations - translation to add
     * @param {string} value - option value
     * @return {Element} label element (wrapper)
     */
    createInput( attributes, translations, value ) {
        const that = this;
        const label = document.createElement( 'label' );
        const input = document.createElement( 'input' );
        Object.getOwnPropertyNames( attributes ).forEach( attr => {
            input.setAttribute( attr, attributes[ attr ] );
        } );
        input.value = value;
        label.appendChild( input );
        translations.forEach( translation => {
            label.appendChild( that.createOptionTranslation( translation, value ) );
        } );

        return label;
    }
};
