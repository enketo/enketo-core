/**
 * @module calculate
 */

import config from 'enketo/config';
import { getAncestors, getSiblingElementsAndSelf } from './dom-utils';
import events from './event';

export default {
    /**
     * Updates calculated items.
     *
     * @param {UpdatedDataNodes} updated - the object containing info on updated data nodes
     * @param {string} [filter] - CSS selector filter.
     * @param ignoreRelevance
     */
    update( updated = {}, filter = '', ignoreRelevance = true ) {
        let nodes;

        if ( !this.form ) {
            throw new Error( 'Calculation module not correctly instantiated with form property.' );
        }

        // Filter is used in custom applications that make a distinction between types of calculations.
        if ( updated.relevantPath ) {
            // Questions that are descendants of a group:
            nodes = this.form.getRelatedNodes( 'data-calculate', `[name^="${updated.relevantPath}/"]${filter}` )
                // Individual questions:
                .add( this.form.getRelatedNodes( 'data-calculate', `[name="${updated.relevantPath}"]${filter}` ) )
                // Individual radiobutton questions with a calculate....:
                .add( this.form.getRelatedNodes( 'data-calculate', `[data-name="${updated.relevantPath}"]${filter}` ) )
                .get();
        } else {
            nodes = this.form.getRelatedNodes( 'data-calculate', filter, updated )
                .get();
        }

        nodes.forEach( control => {
            const name = this.form.input.getName( control );
            const dataNodesObj = this.form.model.node( name );
            const dataNodes = dataNodesObj.getElements();

            const props = {
                name,
                expr: this.form.input.getCalculation( control ),
                dataType: this.form.input.getXmlType( control ),
                relevantExpr: this.form.input.getRelevant( control ),
                index: 0,
                dataNodesObj
            };

            if ( dataNodes.length > 1 ) {

                if ( updated.repeatPath && name.indexOf( updated.repeatPath + '/' ) !== -1 && dataNodes[updated.repeatIndex] ) {
                    /*
                     * If the update was triggered by a datanode inside a repeat
                     * and the dependent node is inside the same repeat, we can prevent the expensive index determination
                     */
                    const dataNodeName = ( name.lastIndexOf( '/' ) !== -1 ) ? name.substring( name.lastIndexOf( '/' ) + 1 ) : name;
                    const dataNode = this.form.model.node( updated.repeatPath, updated.repeatIndex ).getElement().querySelector( dataNodeName );
                    props.index = dataNodes.indexOf( dataNode );
                    this._updateCalc( control, props, ignoreRelevance );
                } else if ( control.type === 'hidden' ) {
                    /*
                     * This case is the consequence of the  decision to place calculated items without a visible form control,
                     * as a separate group (.or-calculated-items, or .or-setvalue-items), instead of in the Form DOM in the locations .
                     * This occurs when update is called with empty updated object and multiple repeats are present.
                     */
                    dataNodes.forEach( ( el, index ) => {
                        const obj = Object.create( props );
                        obj.index = index;
                        this._updateCalc( control, obj, ignoreRelevance );
                    } );
                } else {
                    /*
                     * This occurs when the updated object contains a relevantPath that refers to a repeat and multiple repeats are
                     * present, without calculated items that HAVE a visible form control.
                     */
                    const repeatSiblings = getSiblingElementsAndSelf( control.closest( '.or-repeat' ), '.or-repeat' );
                    if ( repeatSiblings.length === dataNodes.length ) {
                        props.index = repeatSiblings.indexOf( control.closest( '.or-repeat' ) );
                        this._updateCalc( control, props, ignoreRelevance );
                    }
                }
            } else if ( dataNodes.length === 1 ) {
                this._updateCalc( control, props, ignoreRelevance );
            }

        } );
    },

    /**
     * Runs <setvalue> actions.
     *
     * @param {CustomEvent} [event] - the event type that triggered the setvalue action.
     */
    setValue( event ) {
        let index = 0;

        if ( !event ) {
            return;
        }

        if ( !this.form ) {
            throw new Error( 'Setvalue module not correctly instantiated with form property.' );
        }

        let nodes = [];

        if ( event.type === new events.InstanceFirstLoad().type ) {
            // We ignore relevance for the data-instance-first-load, as that will likely never be what users want for a default value.
            // Do not use getRelatedNodes here, because the obtaining (and caching) of nodes inside repeats is (and should be) disabled at the
            // time this event fires.
            //
            // We change the order by first evaluating the non-formcontrol setvalue directives (in document order), and then
            // the ones with form controls.
            // https://github.com/OpenClinica/enketo-express-oc/issues/355#issuecomment-725640823
            nodes = [ ...this.form.view.html.querySelectorAll( `.setvalue [data-setvalue][data-event*="${event.type}"]` ) ].concat(
                this.form.filterRadioCheckSiblings( [ ...this.form.view.html.querySelectorAll( `.question [data-setvalue][data-event*="${event.type}"]` ) ] ) );
        } else if ( event.type === new events.NewRepeat().type ) {
            // Only this event requires specific index targeting through the "updated" object
            nodes = this.form.getRelatedNodes( 'data-setvalue', `[data-event*="${event.type}"]`, event.detail ).get();
        } else if ( event.type === new events.XFormsValueChanged().type ) {
            const question = event.target.closest( '.question' );
            nodes = question ? [ ...question.querySelectorAll( `[data-setvalue][data-event*="${event.type}"]` ) ] : nodes;
        }

        nodes.forEach( setvalueControl => {
            const name = this.form.input.getName( setvalueControl );
            const dataNodesObj = this.form.model.node( name );
            const dataNodes = dataNodesObj.getElements();

            const props = {
                name,
                expr: setvalueControl.dataset.setvalue,
                dataType: this.form.input.getXmlType( setvalueControl ),
                relevantExpr: this.form.input.getRelevant( setvalueControl ),
                index: event.detail && typeof event.detail.repeatIndex !== 'undefined' ? event.detail.repeatIndex : 0,
                dataNodesObj
            };

            if ( dataNodes.length > 1 && event.type !== new events.NewRepeat().type && event.type !== new events.XFormsValueChanged().type ) {
                /*
                 * This case is the consequence of the decision to place setvalue items that are siblings of bind in the XForm
                 * as a separate group (.or-setvalue-items), instead of in the Form DOM in the locations where they belong.
                 * This occurs when update is called when multiple repeats are present.
                 * For now this is only relevant for events that are *not* odk-new-repeat and *not* xforms-value-changed.
                 */
                dataNodes.forEach( ( el, index ) => {
                    const obj = Object.create( props );
                    const control = setvalueControl;
                    obj.index = index;
                    this._updateCalc( control, obj );
                } );

            } else if ( event.type === new events.XFormsValueChanged().type ) {
                // control for xforms-value-changed is located elsewhere, or does not exist.
                const control = this.form.input.find( props.name, props.index );
                this._updateCalc( control, props );
            } else if ( dataNodes[ index ] ) {
                const control = setvalueControl;
                this._updateCalc( control, props );
            } else {
                console.error( 'SetValue called for node that does not exist in model.' );
            }
        } );
    },

    _updateCalc( control, props, ignoreRelevance = true ) {
        const skip =  ignoreRelevance ? this._hasNeverBeenRelevant( control, props ) : !this._isRelevant( props ) ;

        // Not sure if using 'string' is always correct
        const newExpr = this.form.replaceChoiceNameFn( props.expr, 'string', props.name, props.index );

        // It is possible that the fixed expr is '' which causes an error in XPath
        // const xpathType = this.form.input.getInputType( control ) === 'number' ? 'number' : 'string';
        const result = !skip && newExpr ? this.form.model.evaluate( newExpr, 'string', props.name, props.index ) : '';

        // Filter the result set to only include the target node
        props.dataNodesObj.setIndex( props.index );

        const existingModelValue = props.dataNodesObj.getVal();

        // Set the value
        props.dataNodesObj.setVal( result, props.dataType );

        const newModelValue = props.dataNodesObj.getVal();

        // Not the most efficient to use input.setVal here as it will do another lookup
        // of the node, that we already have...
        // We should not use value "result" here because node.setVal() may have done a data type conversion
        if ( control && existingModelValue !== newModelValue ) {
            this.form.input.setVal( control, newModelValue );

            /*
             * We need to specifically call validate on the question itself, because the validationUpdate
             * in the evaluation cascade only updates questions with a _dependency_ on this question.
             */
            if ( control.type !== 'hidden' && config.validateContinuously === true ) {
                this.form.validateInput( control );
            }
        } else {
            // This is okay for a setvalue/xforms-value-changed directive (may be no form control)
            // console.log( 'no form control found' );
        }
    },

    /**
     * Determines relevancy of node by re-evaluating relevant expressions of self and ancestors.
     *
     * @param {*} props - properties of a node
     * @return {boolean} whether the node is relevant
     */
    _isRelevant( props ) {
        let relevant = props.relevantExpr ? this.form.model.evaluate( props.relevantExpr, 'boolean', props.name, props.index ) : true;

        // Only look at ancestors if self is relevant.
        if ( relevant ) {
            const pathParts = props.name.split( '/' );
            /*
             * First determine immediate group parent of node, which will always be in correct location in DOM. This is where
             * we can use the index to be guaranteed to get the correct node.
             * (also for nodes in #calculated-items).
             *
             * Then get all the group parents of that node.
             *
             * TODO: determine index at every level to properly support repeats and nested repeats
             *
             * Note: getting the parents of control wouldn't work for nodes inside #calculated-items!
             */
            const parentPath = pathParts.splice( 0, pathParts.length - 1 ).join( '/' );
            let startElement;

            if ( props.index === 0 ) {
                startElement = this.form.view.html.querySelector( `.or-group[name="${parentPath}"],.or-group-data[name="${parentPath}"]` );
            } else {
                startElement = this.form.view.html.querySelectorAll( `.or-repeat[name="${parentPath}"]` )[ props.index ] ||
                    this.form.view.html.querySelectorAll( `.or-group[name="${parentPath}"],.or-group-data[name="${parentPath}"]` )[ props.index ];
            }
            const ancestorGroups = startElement ? [ startElement ].concat( getAncestors( startElement, '.or-group, .or-group-data' ) ) : [];

            if ( ancestorGroups.length ) {
                // Start at the highest level, and traverse down to the immediate parent group.
                relevant = ancestorGroups.filter( el => el.matches( '[data-relevant]' ) ).map( group => {
                    const nm = this.form.input.getName( group );

                    return {
                        context: nm,
                        // thankfully relevants on repeats are not possible with XLSForm-produced forms
                        index: [ ...this.form.view.html.querySelectorAll( `.or-group[name="${nm}"], .or-group-data[name="${nm}"]` ) ].indexOf( group ), // performance....
                        expr: this.form.input.getRelevant( group )
                    };
                } ).concat( [ {
                    context: props.name,
                    index: props.index,
                    expr: props.relevantExpr
                } ] ).every( item => item.expr ? this.form.model.evaluate( item.expr, 'boolean', item.context, item.index ) : true );
            }
        }

        return relevant;
    },

    _hasNeverBeenRelevant( control, props ){
        if ( control && control.closest( '.pre-init' ) ){
            return true;
        }
        // Check parents including when the calculation has no form control.
        const pathParts = props.name.split( '/' );
        /*
             * First determine immediate group parent of node, which will always be in correct location in DOM. This is where
             * we can use the index to be guaranteed to get the correct node.
             * (also for nodes in #calculated-items).
             *
             * Then get all the group parents of that node.
             *
             * TODO: determine index at every level to properly support repeats and nested repeats
             *
             * Note: getting the parents of control wouldn't work for nodes inside #calculated-items!
             */
        const parentPath = pathParts.splice( 0, pathParts.length - 1 ).join( '/' );
        let startElement;

        if ( props.index === 0 ) {
            startElement = this.form.view.html.querySelector( `.or-group[name="${parentPath}"],.or-group-data[name="${parentPath}"]` );
        } else {
            startElement = this.form.view.html.querySelectorAll( `.or-repeat[name="${parentPath}"]` )[ props.index ] ||
                    this.form.view.html.querySelectorAll( `.or-group[name="${parentPath}"],.or-group-data[name="${parentPath}"]` )[ props.index ];
        }

        return startElement ? !!startElement.closest( '.pre-init' ) : false;
    }

};
