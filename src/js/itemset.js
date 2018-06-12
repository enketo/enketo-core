'use strict';

/**
 * Updates itemsets
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
 */

var $ = require( 'jquery' );
var utils = require( './utils' );

module.exports = {
    update: function( updated ) {
        var clonedRepeatsPresent;
        var insideRepeat;
        var insideRepeatClone;
        var $nodes;
        var that = this;
        var itemsCache = {};

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        $nodes = this.form.getRelatedNodes( 'data-items-path', '.itemset-template', updated );

        clonedRepeatsPresent = ( this.form.repeatsPresent && this.form.view.$.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

        $nodes.each( function() {
            var $input;
            var $instanceItems;
            var template = this;
            var $template = $( this );
            var inputAttributes = {};

            // Nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                return;
            }

            var newItems = {};
            var prevItems = $template.data();
            var templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
            var $list = $template.parent( 'select, datalist' );

            if ( templateNodeName === 'label' ) {
                var $optionInput = $template.children( 'input' ).eq( 0 );
                [].slice.call( $optionInput[ 0 ].attributes ).forEach( function( attr ) {
                    inputAttributes[ attr.name ] = attr.value;
                } );
                // If this is a ranking widget:
                $input = $optionInput.hasClass( 'ignore' ) ? $optionInput.closest( '.option-wrapper' ).siblings( 'input.rank' ).eq( 0 ) : $optionInput;
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                $input = $list;
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'datalist' ) {
                $input = $list.siblings( 'input:not(.widget)' );
            }
            var $labels = $template.closest( 'label, select, datalist' ).siblings( '.itemset-labels' );
            var itemsXpath = $template.attr( 'data-items-path' );
            var labelType = $labels.attr( 'data-label-type' );
            var labelRef = $labels.attr( 'data-label-ref' );
            // TODO: if translate() becomes official, move determination of labelType to enketo-xslt
            // and set labelRef correct in enketo-xslt
            var matches = utils.parseFunctionFromExpression( labelRef, 'translate' );
            if ( matches.length ) {
                labelRef = matches[ 0 ][ 1 ][ 0 ];
                labelType = 'langs';
            }

            var valueRef = $labels.attr( 'data-value-ref' );

            /**
             * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
             * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
             * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
             * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
             * the nodeset retrieves, Enketo's aproach works well.
             */
            var context = that.form.input.getName( $input );

            /*
             * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
             * It can be safely set to 0 for other branches.
             */
            insideRepeat = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
            insideRepeatClone = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;

            var index = ( insideRepeatClone ) ? that.form.input.getIndex( $input ) : 0;

            if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                $instanceItems = itemsCache[ itemsXpath ];
            } else {
                var safeToTryNative = true;
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
            var $question = $template.closest( '.question' );
            $question.find( templateNodeName ).not( $template ).remove();
            // labels for current <option> elements
            var optionsTranslations = $question.find( '.or-option-translations' ).empty()[ 0 ];
            var optionsFragment = document.createDocumentFragment();
            var optionsTranslationsFragment = document.createDocumentFragment();
            var translations = [];

            $instanceItems.each( function() {
                var item = this;
                /*
                 * Note: $labelRefs could either be
                 * - a single itext reference
                 * - a collection of labels with different lang attributes
                 * - a single label
                 */
                var labels = that.getNodesFromItem( labelRef, item );
                if ( !labels || !labels.length ) {
                    translations = [ { language: '', label: 'error', active: true } ];
                } else {
                    switch ( labelType ) {
                        case 'itext':
                            // Search in the special .itemset-labels created in enketo-transformer for labels with itext ref.
                            translations = $labels.find( '[data-itext-id="' + labels[ 0 ].textContent + '"]' ).get().map( function( label ) {
                                return { language: label.getAttribute( 'lang' ), label: label.textContent, active: label.classList.contains( 'active' ) };
                            } );
                            break;
                        case 'langs':
                            translations = translations.map( function( label ) {
                                var lang = label.getAttribute( 'lang' );
                                var active = lang === that.form.langs.getCurrentLang();
                                return { language: lang, label: label.textContent, active: active };
                            } );
                            break;
                        default:
                            translations = [ { language: '', label: labels && labels.length ? labels[ 0 ].textContent : 'error', active: true } ];
                    }
                }

                // Obtain the value of the secondary instance item found.
                var value = that.getNodeFromItem( valueRef, item ).textContent;

                if ( templateNodeName === 'label' ) {
                    optionsFragment.appendChild( that.createInput( inputAttributes, translations, value ) );
                } else if ( templateNodeName === 'option' ) {
                    var activeLabel = '';
                    if ( translations.length > 1 ) {
                        translations.forEach( function( translation ) {
                            if ( translation.active ) {
                                activeLabel = translation.label;
                            }
                            optionsTranslationsFragment.appendChild( that.createOptionTranslation( translation.language, translation.label, value, !!translation.active ) );
                        } );
                    } else {
                        activeLabel = translations[ 0 ].label;
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
            var currentValue = that.form.model.node( context, index ).getVal()[ 0 ];
            if ( currentValue !== '' ) {
                if ( $input.hasClass( 'rank' ) ) {
                    currentValue = '';
                }
                that.form.input.setVal( context, index, currentValue );
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
    getNodesFromItem: function( expr, context, single ) {
        if ( !expr || !context ) {
            throw new Error( 'Error: could not query instance item, no expression and/or context provided' );
        }
        var type = single ? 9 : 7;
        var evaluateFnName = typeof this.form.model.xml.evaluate !== 'undefined' ? 'evaluate' : 'jsEvaluate';
        var result = this.form.model.xml[ evaluateFnName ]( expr, context, this.form.model.getNsResolver(), type, null );
        var response = [];
        if ( !single ) {
            for ( var j = 0; j < result.snapshotLength; j++ ) {
                response.push( result.snapshotItem( j ) );
            }
        } else {
            response.push( result.singleNodeValue );
        }
        return response;
    },

    getNodeFromItem: function( expr, content ) {
        var nodes = this.getNodesFromItem( expr, content, true );
        return nodes.length ? nodes[ 0 ] : null;
    },

    createOption: function( label, value ) {
        var option = document.createElement( 'option' );
        option.textContent = label;
        option.value = value;
        return option;
    },

    createOptionTranslation: function( language, label, value, active ) {
        var span = document.createElement( 'span' );
        span.textContent = label;
        span.classList.add( 'option-label' );
        if ( active ) {
            span.classList.add( 'active' );
        }
        span.lang = language;
        span.dataset.optionValue = value;
        return span;
    },

    createInput: function( attributes, translations, value ) {
        var that = this;
        var label = document.createElement( 'label' );
        var input = document.createElement( 'input' );
        Object.getOwnPropertyNames( attributes ).forEach( function( attr ) {
            input.setAttribute( attr, attributes[ attr ] );
        } );
        input.value = value;
        label.appendChild( input );
        translations.forEach( function( translation ) {
            label.appendChild( that.createOptionTranslation( translation.language, translation.label, value, translation.active ) );
        } );
        return label;
    }
};
