/**
 * Updates itemsets
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 */

import $ from 'jquery';

import { parseFunctionFromExpression } from './utils';

export default {
    update( updated = {} ) {
        const that = this;
        const itemsCache = {};
        let $nodes;

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        if ( updated.relevantPath ) {
            // Questions that are descendants of a group:
            $nodes = this.form.getRelatedNodes( 'data-items-path', `[name^="${updated.relevantPath}/"]` )
                .add( this.form.getRelatedNodes( 'data-items-path', `[name^="${updated.relevantPath}/"] ~ datalist > .itemset-template` ) )
                // Individual questions (autocomplete)
                .add( this.form.getRelatedNodes( 'data-items-path', `[name="${updated.relevantPath}"]` ) )
                .add( this.form.getRelatedNodes( 'data-items-path', `[name="${updated.relevantPath}"] ~ datalist > .itemset-template` ) )
                // Individual radiobutton questions with an itemset...:
                .add( this.form.getRelatedNodes( 'data-items-path', `[data-name="${updated.relevantPath}"]` ) )
                .add( this.form.getRelatedNodes( 'data-items-path', `[data-name="${updated.relevantPath}"] ~ datalist > .itemset-template` ) );
        } else {
            $nodes = this.form.getRelatedNodes( 'data-items-path', '.itemset-template', updated );
        }

        const clonedRepeatsPresent = this.form.repeatsPresent && this.form.view.html.querySelector( '.or-repeat.clone' );

        $nodes.each( function() {
            let $input;
            let $instanceItems;
            const template = this;
            const $template = $( this );
            const inputAttributes = {};

            // Nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                return;
            }

            const newItems = {};
            const prevItems = $template.data();
            const templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
            const $list = $template.parent( 'select, datalist' );

            if ( templateNodeName === 'label' ) {
                const $optionInput = $template.children( 'input' ).eq( 0 );
                [].slice.call( $optionInput[ 0 ].attributes ).forEach( attr => {
                    inputAttributes[ attr.name ] = attr.value;
                } );
                // If this is a ranking widget:
                $input = $optionInput.hasClass( 'ignore' ) ? $optionInput.closest( '.option-wrapper' ).siblings( 'input.rank' ).eq( 0 ) : $optionInput;
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                $input = $list;
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'datalist' ) {
                $input = $list.siblings( 'input:not(.widget)' );
            }
            const $labels = $template.closest( 'label, select, datalist' ).siblings( '.itemset-labels' );
            const itemsXpath = $template.attr( 'data-items-path' );
            let labelType = $labels.attr( 'data-label-type' );
            let labelRef = $labels.attr( 'data-label-ref' );
            // TODO: if translate() becomes official, move determination of labelType to enketo-xslt
            // and set labelRef correct in enketo-xslt
            const matches = parseFunctionFromExpression( labelRef, 'translate' );
            if ( matches.length ) {
                labelRef = matches[ 0 ][ 1 ][ 0 ];
                labelType = 'langs';
            }

            const valueRef = $labels.attr( 'data-value-ref' );

            /**
             * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
             * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
             * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
             * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
             * the nodeset retrieves, Enketo's aproach works well.
             */
            const context = that.form.input.getName( $input[ 0 ] );

            /*
             * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
             * It can be safely set to 0 for other branches.
             */
            const insideRepeat = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
            const insideRepeatClone = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;
            const index = ( insideRepeatClone ) ? that.form.input.getIndex( $input[ 0 ] ) : 0;

            if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                $instanceItems = itemsCache[ itemsXpath ];
            } else {
                const safeToTryNative = true;
                $instanceItems = $( that.form.model.evaluate( itemsXpath, 'nodes', context, index, safeToTryNative ) );
                if ( !insideRepeat ) {
                    itemsCache[ itemsXpath ] = $instanceItems;
                }
            }

            // This property allows for more efficient 'itemschanged' detection
            newItems.length = $instanceItems.length;
            // TODO: This may cause problems for large itemsets. Use md5 instead?
            newItems.text = $instanceItems.text();

            if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                return;
            }

            $template.data( newItems );

            /**
             * Remove current items before rebuilding a new itemset from scratch.
             */
            // the current <option> and <input> elements
            const $question = $template.closest( '.question' );
            $question.find( templateNodeName ).not( $template ).remove();
            // labels for current <option> elements
            const optionsTranslations = $question.find( '.or-option-translations' ).empty()[ 0 ];
            const optionsFragment = document.createDocumentFragment();
            const optionsTranslationsFragment = document.createDocumentFragment();
            let translations = [];

            $instanceItems.each( function() {
                const item = this;
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
                            translations = $labels.find( `[data-itext-id="${labels[ 0 ].textContent}"]` ).get().map( label => {
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
            let currentValue = that.form.model.node( context, index ).getVal();
            if ( currentValue !== '' ) {
                if ( $input.hasClass( 'rank' ) ) {
                    currentValue = '';
                }
                that.form.input.setVal( $input[ 0 ], currentValue );
                $input.trigger( 'change' );
            }

            if ( $list.length > 0 || $input.hasClass( 'rank' ) ) {
                $input.trigger( 'changeoption' );
            }

        } );
    },

    /**
     * Minimal XPath evaluation helper that queries from a single item context.
     */
    getNodesFromItem( expr, context, single ) {
        if ( !expr || !context ) {
            throw new Error( 'Error: could not query instance item, no expression and/or context provided' );
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

    getNodeFromItem( expr, content ) {
        const nodes = this.getNodesFromItem( expr, content, true );
        return nodes.length ? nodes[ 0 ] : null;
    },

    createOption( label, value ) {
        const option = document.createElement( 'option' );
        option.textContent = label;
        option.value = value;
        return option;
    },

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
