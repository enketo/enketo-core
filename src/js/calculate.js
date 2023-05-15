/**
 * @module calculate
 */

import config from 'enketo/config';
import { getAncestors, getSiblingElementsAndSelf } from './dom-utils';
import events from './event';
import { getCurrentPosition } from './geolocation';

/**
 * @typedef {import('./form').Form} Form
 */

export default {
    /**
     * @type {Form}
     */
    // @ts-expect-error - this will be populated during form init, but assigning
    // its type here improves intellisense.
    form: null,

    /** @type {WeakMap<HTMLElement, boolean>} */
    preInitRelevance: new WeakMap(),

    init() {
        if (!this.form) {
            throw new Error(
                'Calculation module not correctly instantiated with form property.'
            );
        }

        if (!this.form.features.calculate) {
            this.update = () => {};
            this.performAction = () => {};

            return;
        }

        this.initialized = false;
        this.preInitRelevance = new WeakMap();
        this.update();
        this.initialized = true;
    },

    /**
     * Updates calculated items.
     *
     * @param {UpdatedDataNodes} updated - the object containing info on updated data nodes
     * @param {string} [filter] - CSS selector filter
     * @param {boolean} [emptyNonRelevant] - Whether to empty non-relevant calculation nodes
     */
    update(updated = {}, filter = '', emptyNonRelevant = false) {
        let nodes;

        // Filter is used in custom applications that make a distinction between types of calculations.
        if (updated.relevantPath) {
            // Questions that are descendants of a group:
            nodes = this.form
                .getRelatedNodes(
                    'data-calculate',
                    `[name^="${updated.relevantPath}/"]${filter}`
                )
                // Individual questions:
                .add(
                    this.form.getRelatedNodes(
                        'data-calculate',
                        `[name="${updated.relevantPath}"]${filter}`
                    )
                )
                // Individual radiobutton questions with a calculate....:
                .add(
                    this.form.getRelatedNodes(
                        'data-calculate',
                        `[data-name="${updated.relevantPath}"]${filter}`
                    )
                )
                .get();
        } else {
            nodes = this.form
                .getRelatedNodes('data-calculate', filter, updated)
                .get();
        }

        nodes.forEach((control) => {
            const name = this.form.input.getName(control);
            const dataNodesObj = this.form.model.node(name);
            const dataNodes = dataNodesObj.getElements();

            const props = {
                name,
                expr: this.form.input.getCalculation(control),
                dataType: this.form.input.getXmlType(control),
                relevantExpr: this.form.input.getRelevant(control),
                index: 0,
                dataNodesObj,
            };

            if (dataNodes.length > 1) {
                if (
                    updated.repeatPath &&
                    name.indexOf(`${updated.repeatPath}/`) !== -1 &&
                    dataNodes[updated.repeatIndex]
                ) {
                    /*
                     * If the update was triggered by a datanode inside a repeat
                     * and the dependent node is inside the same repeat, we can prevent the expensive index determination
                     */
                    const dataNodeName =
                        name.lastIndexOf('/') !== -1
                            ? name.substring(name.lastIndexOf('/') + 1)
                            : name;
                    const childNodeList = this.form.model
                        .node(updated.repeatPath, updated.repeatIndex)
                        .getElement()
                        .querySelectorAll(dataNodeName);
                    const dataNode = Array.from(childNodeList).filter((node) =>
                        dataNodes.includes(node)
                    )[0];
                    props.index = dataNodes.indexOf(dataNode);

                    if (props.index > -1) {
                        this._updateCalc(control, props, emptyNonRelevant);
                    }
                } else if (control.type === 'hidden') {
                    /*
                     * This case is the consequence of the  decision to place calculated items without a visible form control,
                     * as a separate group (.or-calculated-items, or .or-setvalue-items, or .or-setgeopoint-items), instead of in the Form DOM in the locations .
                     * This occurs when update is called with empty updated object and multiple repeats are present.
                     */
                    dataNodes.forEach((el, index) => {
                        const obj = Object.create(props);
                        obj.index = index;
                        this._updateCalc(control, obj, emptyNonRelevant);
                    });
                } else {
                    /*
                     * This occurs when the updated object contains a relevantPath that refers to a repeat and multiple repeats are
                     * present, without calculated items that HAVE a visible form control.
                     */
                    const repeatSiblings = getSiblingElementsAndSelf(
                        control.closest('.or-repeat'),
                        '.or-repeat'
                    );
                    if (repeatSiblings.length === dataNodes.length) {
                        props.index = repeatSiblings.indexOf(
                            control.closest('.or-repeat')
                        );
                        this._updateCalc(control, props, emptyNonRelevant);
                    }
                }
            } else if (dataNodes.length === 1) {
                this._updateCalc(control, props, emptyNonRelevant);
            }
        });
    },

    /**
     * @param {'setvalue' | 'setgeopoint'} action - the action being performed.
     * @param {CustomEvent} [event] - the event type that triggered the action.
     */
    _getNodesForAction(action, event) {
        if (event.type === new events.InstanceFirstLoad().type) {
            // We ignore relevance for the data-instance-first-load, as that will likely never be what users want for a default value.
            // Do not use getRelatedNodes here, because the obtaining (and caching) of nodes inside repeats is (and should be) disabled at the
            // time this event fires.
            //
            // We change the order by first evaluating the non-formcontrol actions (in document order), and then
            // the ones with form controls.
            // https://github.com/OpenClinica/enketo-express-oc/issues/355#issuecomment-725640823
            return [
                ...this.form.view.html.querySelectorAll(
                    `.non-form-control-action[data-${action}].odk-instance-first-load`
                ),
            ].concat(
                this.form.filterRadioCheckSiblings([
                    ...this.form.view.html.querySelectorAll(
                        `.form-control-action[data-${action}].odk-instance-first-load`
                    ),
                ])
            );
        }
        if (event.type === new events.NewRepeat().type) {
            // Only this event requires specific index targeting through the "updated" object
            // We change the order by first evaluating the non-formcontrol actions (in document order), and then
            // the ones with form controls.
            // https://github.com/OpenClinica/enketo-express-oc/issues/355#issuecomment-725640823
            // https://github.com/OpenClinica/enketo-express-oc/issues/419
            return this.form
                .getRelatedNodes(
                    `data-${action}`,
                    '.non-form-control-action.odk-new-repeat',
                    event.detail
                )
                .get()
                .concat(
                    this.form
                        .getRelatedNodes(
                            `data-${action}`,
                            '.form-control-action.odk-new-repeat',
                            event.detail
                        )
                        .get()
                );
        }
        if (event.type === new events.XFormsValueChanged().type) {
            const question = event.target.closest('.question');

            return question
                ? [
                      ...question.querySelectorAll('.xforms-value-changed'),
                  ].filter((el) => el.dataset[action] != null)
                : [];
        }

        return [];
    },

    /**
     * Runs actions.
     *
     * @param {'setvalue' | 'setgeopoint'} action - the action to perform.
     * @param {CustomEvent} [event] - the event type that triggered the action.
     */
    performAction(action, event) {
        if (!event) {
            return;
        }

        const nodes = this._getNodesForAction(action, event);

        nodes.forEach((actionControl) => {
            const name = this.form.input.getName(actionControl);
            const dataNodesObj = this.form.model.node(name);
            const dataNodes = dataNodesObj.getElements();

            const props = {
                name,
                dataType: this.form.input.getXmlType(actionControl),
                relevantExpr: this.form.input.getRelevant(actionControl),
                index:
                    event.detail &&
                    typeof event.detail.repeatIndex !== 'undefined'
                        ? event.detail.repeatIndex
                        : 0,
                dataNodesObj,
                type: action,
            };

            if (action === 'setvalue') {
                props.expr = actionControl.dataset.setvalue;
            }

            if (
                dataNodes.length > 1 &&
                event.type !== new events.NewRepeat().type &&
                event.type !== new events.XFormsValueChanged().type
            ) {
                /*
                 * This case is the consequence of the decision to place action elements that are siblings of bind in the XForm
                 * as a separate group (.or-setvalue-items, .or-setgeopoint-items), instead of in the Form DOM in the locations where they belong.
                 * This occurs when update is called when multiple repeats are present.
                 * For now this is only relevant for events that are *not* odk-new-repeat and *not* xforms-value-changed.
                 */
                dataNodes.forEach((el, index) => {
                    const obj = Object.create(props);
                    const control = actionControl;
                    obj.index = index;
                    this._updateCalc(control, obj);
                });
            } else if (event.type === new events.XFormsValueChanged().type) {
                // Control for xforms-value-changed is located elsewhere, or does not exist.
                // First we test if the control can be found by looking for the same index as the trigger
                let control = this.form.input.find(props.name, props.index);
                if (!control) {
                    // In case the trigger was inside a repeat, but the target is not.
                    props.index = 0;
                    control = this.form.input.find(props.name, 0);
                }
                this._updateCalc(control, props);
            } else if (dataNodes[props.index]) {
                const control = actionControl;
                this._updateCalc(control, props);
            } else {
                console.error(
                    'performAction called for node that does not exist in model.'
                );
            }
        });
    },
    /**
     * Updates a calculation.
     *
     * @param {Element} control - view element containing calculation
     * @param {*} props - properties of a calculation element
     * @param {boolean} [emptyNonRelevant] - Whether to set the calculation result to empty if non-relevant
     */
    _updateCalc(control, props, emptyNonRelevant) {
        if (
            !emptyNonRelevant &&
            props.type !== 'setvalue' &&
            props.type !== 'setgeopoint' &&
            this._hasNeverBeenRelevant(control, props) &&
            !this._isRelevant(props)
        ) {
            return;
        }

        if (props.type === 'setgeopoint') {
            const options = {
                enableHighAccuracy: true,
                maximumAge: 0,
            };

            getCurrentPosition(options)
                .then(({ geopoint }) => {
                    this._updateValue(control, props, geopoint);
                })
                .catch(() => {
                    this._updateValue(control, props, '');
                });

            return;
        }

        const empty = emptyNonRelevant ? !this._isRelevant(props) : false;

        // Not sure if using 'string' is always correct
        const newExpr = this.form.replaceChoiceNameFn(
            props.expr,
            'string',
            props.name,
            props.index
        );

        // It is possible that the fixed expr is '' which causes an error in XPath
        // const xpathType = this.form.input.getInputType( control ) === 'number' ? 'number' : 'string';
        const result =
            !empty && newExpr
                ? this.form.model.evaluate(
                      newExpr,
                      'string',
                      props.name,
                      props.index
                  )
                : '';

        // Filter the result set to only include the target node
        this._updateValue(control, props, result);
    },

    /**
     * Updates a control's value after a calculation.
     *
     * @param {Element} control - view element containing calculation
     * @param {*} props - properties of a calculation element
     * @param {*} result - result of a calculation
     */
    _updateValue(control, props, result) {
        // Filter the result set to only include the target node
        props.dataNodesObj.setIndex(props.index);

        const existingModelValue = props.dataNodesObj.getVal();

        // Set the value
        props.dataNodesObj.setVal(result, props.dataType);

        const newModelValue = props.dataNodesObj.getVal();

        // This is okay for an xforms-value-changed action (may be no form control)
        if (!control) {
            return;
        }

        // Not the most efficient to use input.setVal here as it will do another lookup
        // of the node, that we already have...
        // We should not use value "result" here because node.setVal() may have done a data type conversion

        if (existingModelValue !== newModelValue) {
            this.form.input.setVal(control, newModelValue);

            /*
             * We need to specifically call validate on the question itself, because the validationUpdate
             * in the evaluation cascade only updates questions with a _dependency_ on this question.
             */
            if (
                control.type !== 'hidden' &&
                config.validateContinuously === true
            ) {
                this.form.validateInput(control);
            }
        }
    },

    /**
     * Determines relevancy of node by re-evaluating relevant expressions of self and ancestors.
     *
     * @param {*} props - properties of a node
     * @return {boolean} whether the node is relevant
     */
    _isRelevant(props) {
        if (!this.form.features.relevant) {
            return true;
        }

        const { groups, repeats } = this.form.collections;
        const { relevantExpr, name, index } = props;

        let relevant = relevantExpr
            ? this.form.model.evaluate(relevantExpr, 'boolean', name, index)
            : true;

        /** @type {HTMLElement | null} */
        let startElement = null;

        // Only look at ancestors if self is relevant.
        if (relevant) {
            const pathParts = name.split('/');
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
            const parentPath = pathParts
                .splice(0, pathParts.length - 1)
                .join('/');

            if (index === 0) {
                startElement = groups.getElementByRef(parentPath);
            } else {
                startElement =
                    repeats.getElementByRef(parentPath, index) ||
                    groups.getElementByRef(parentPath, index);
            }

            const ancestorGroups = startElement
                ? [startElement].concat(
                      getAncestors(
                          startElement,
                          '.or-group[data-relevant], .or-group-data[data-relevant]'
                      )
                  )
                : [];

            if (ancestorGroups.length) {
                // Start at the highest level, and traverse down to the immediate parent group.
                relevant = ancestorGroups
                    .map((ancestor) => {
                        const isRepeat =
                            ancestor.classList.contains('or-repeat');
                        const collection = isRepeat ? repeats : groups;
                        const path = this.form.input.getName(ancestor);
                        const index = collection.refIndexOf(ancestor, path);

                        return {
                            element: ancestor,
                            context: path,
                            // thankfully relevants on repeats are not possible with XLSForm-produced forms
                            index,
                            expr: this.form.input.getRelevant(ancestor),
                        };
                    })
                    .concat([
                        {
                            context: props.name,
                            index: props.index,
                            expr: props.relevantExpr,
                        },
                    ])
                    .every((item) => {
                        const { element, expr, context, index } = item;

                        const preInitRelevance =
                            this.preInitRelevance.get(element);

                        if (preInitRelevance != null) {
                            return preInitRelevance;
                        }

                        const result = item.expr
                            ? this.form.model.evaluate(
                                  expr,
                                  'boolean',
                                  context,
                                  index
                              )
                            : true;

                        if (element != null && !this.initialized) {
                            this.preInitRelevance.set(element, result);
                        }

                        return result;
                    });
            }
        }

        return relevant;
    },

    _hasNeverBeenRelevant(control, props) {
        if (!this.form.features.relevant) {
            return false;
        }

        if (control && control.closest('.pre-init')) {
            return true;
        }

        const { name, index } = props;

        // Check parents including when the calculation has no form control.
        const pathParts = name.split('/');
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
        const parentPath = pathParts.splice(0, pathParts.length - 1).join('/');

        /** @type {HTMLElement | null} */
        let startElement = null;

        const { groups, repeats } = this.form.collections;

        if (index === 0) {
            startElement = groups.getElementByRef(parentPath);
        } else {
            startElement =
                repeats.getElementByRef(parentPath, index) ||
                groups.getElementByRef(parentPath, index);
        }

        return startElement ? startElement.closest('.pre-init') != null : false;
    },
};
