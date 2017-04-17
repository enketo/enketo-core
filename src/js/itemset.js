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
            var $htmlItem, $htmlItemLabels, /**@type {string}*/ value, currentValue, $instanceItems, index, context,
                $template, newItems, prevItems, templateNodeName, $input, $labels, itemsXpath, labelType, labelRef, valueRef;
            var $list;

            $template = $( this );

            // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                return;
            }

            newItems = {};
            prevItems = $template.data();
            templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
            $list = $template.parent( 'select, datalist' );

            if ( templateNodeName === 'label' ) {
                $input = $template.children( 'input' ).eq( 0 );
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                $input = $list;
            } else if ( $list.prop( 'nodeName' ).toLowerCase() === 'datalist' ) {
                $input = $list.siblings( 'input:not(.widget)' );
            }
            $labels = $template.closest( 'label, select, datalist' ).siblings( '.itemset-labels' );
            itemsXpath = $template.attr( 'data-items-path' );
            labelType = $labels.attr( 'data-label-type' );
            labelRef = $labels.attr( 'data-label-ref' );
            valueRef = $labels.attr( 'data-value-ref' );

            /**
             * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
             * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
             * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
             * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
             * the nodeset retrieves, Enketo's aproach works well.
             */
            context = that.form.input.getName( $input );

            /*
             * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
             * It can be safely set to 0 for other branches.
             */
            insideRepeat = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
            insideRepeatClone = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;

            index = ( insideRepeatClone ) ? that.form.input.getIndex( $input ) : 0;

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
            // This may cause problems for large itemsets. Use md5 instead?
            newItems.text = $instanceItems.text();

            if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                return;
            }

            $template.data( newItems );

            /**
             * Remove current items before rebuilding a new itemset from scratch.
             */
            // the current <option> and <input> elements
            $template.closest( '.question' )
                .find( templateNodeName ).not( $template ).remove();
            // labels for current <option> elements
            $template.parent( 'select' ).siblings( '.or-option-translations' ).empty();

            $instanceItems.each( function() {
                var $item = $( this );
                var $labelRefs;
                var labelRefNodename;
                var matches;

                $htmlItem = $( '<root/>' );

                // Create a single <option> or <input> element for the (single) instance item.
                $template
                    .clone().appendTo( $htmlItem )
                    .removeClass( 'itemset-template' )
                    .addClass( 'itemset' )
                    .removeAttr( 'data-items-path' );

                // Determine which labels belong to the <option> or <input> element.
                matches = utils.parseFunctionFromExpression( labelRef, 'translate' );
                labelRefNodename = matches.length ? matches[ 0 ][ 1 ][ 0 ] : labelRef + ':eq(0)';
                $labelRefs = $item.children( labelRefNodename );
                /** 
                 * Note: $labelRefs could either be
                 * - a single itext reference
                 * - a collection of labels with different lang attributes
                 * - a single label
                 */
                if ( labelType !== 'itext' && $labelRefs.length > 0 ) {
                    // labels with different lang attributes
                    labelType = 'langs';
                }
                switch ( labelType ) {
                    case 'itext':
                        // Search in the special .itemset-labels created in enketo-transformer for labels with itext ref.
                        $htmlItemLabels = $labels.find( '[data-itext-id="' + $labelRefs.eq( 0 ).text() + '"]' ).clone();
                        break;
                    case 'langs':
                        $htmlItemLabels = $();
                        // Turn the item elements into label spans that <option> and <input> uses.
                        $labelRefs.each( function() {
                            var lang = this.getAttribute( 'lang' );
                            var langAttr = lang ? ' lang="' + this.getAttribute( 'lang' ) + '"' : '';
                            var active = !lang || lang === that.form.langs.getCurrentLang() ? ' active' : '';
                            var span = '<span class="option-label' + active + '"' + langAttr + '>' + this.textContent + '</span>';
                            $htmlItemLabels = $htmlItemLabels.add( span );
                        } );
                        break;
                    default:
                        // Create a single span without language.
                        $htmlItemLabels = $( '<span class="option-label active" lang="">' + $labelRefs.eq( 0 ).text() + '</span>' );
                }

                // Obtain the value of the secondary instance item found.
                value = $item.children( valueRef ).text();

                // Set the value of the new <option> or <input>.
                $htmlItem.find( '[value]' ).attr( 'value', value );

                if ( templateNodeName === 'label' ) {
                    $htmlItem.find( 'input' )
                        .after( $htmlItemLabels );
                    // Add the <input> (which is the first child of <root>).
                    $labels.before( $htmlItem.find( ':first' ) );
                } else if ( templateNodeName === 'option' ) {
                    //if ( $htmlItemLabels.length === 1 ) {
                    $htmlItem.find( 'option' ).text( $htmlItemLabels.filter( '.active' ).eq( 0 ).text() );
                    //}
                    $htmlItemLabels
                        .attr( 'data-option-value', value )
                        .attr( 'data-itext-id', '' )
                        .appendTo( $labels.siblings( '.or-option-translations' ) );
                    // Add the <option> (which is the first child of <root>).
                    $template.siblings().addBack().last().after( $htmlItem.find( ':first' ) );
                }
            } );

            /**
             * Attempt to populate inputs with current value in model.
             * Note that if the current value is not empty and the new itemset does not 
             * include (an) item(s) with this/se value(s), this will clear/update the model and
             * this will trigger a dataupdate event. This may call this update function again.
             */
            currentValue = that.form.model.node( context, index ).getVal()[ 0 ];
            if ( currentValue !== '' ) {
                that.form.input.setVal( context, index, currentValue );
                $input.trigger( 'change' );
            }

            if ( $list.length > 0 ) {
                // populate labels (with current language) 
                // TODO: is this actually required?
                // that.langs.setSelect( $list );
                // update widget
                $input.trigger( 'changeoption' );
            }

        } );
    }
};
