import $ from 'jquery';
import types from './types';
import event from './event';
import { getXPath } from './dom-utils';
import { isNodeRelevant, setNonRelevantValue } from './relevant';

/**
 * @typedef NodesetFilter
 * @property {boolean} onlyLeaf
 * @property {boolean} noEmpty
 */

/**
 * Class dealing with nodes and nodesets of the XML instance
 *
 * @class
 * @param {string} [selector] - SimpleXPath or jQuery selector
 * @param {number} [index] - The index of the target node with that selector
 * @param {NodesetFilter} [filter] - Filter object for the result nodeset
 * @param {FormModel} model - Instance of FormModel
 */
const Nodeset = function (selector, index, filter, model) {
    const defaultSelector = model.hasInstance ? '/model/instance[1]//*' : '//*';

    this.model = model;
    this.originalSelector = selector;
    this.selector =
        typeof selector === 'string' && selector.length > 0
            ? selector
            : defaultSelector;
    filter = typeof filter !== 'undefined' && filter !== null ? filter : {};
    this.filter = filter;
    this.filter.onlyLeaf =
        typeof filter.onlyLeaf !== 'undefined' ? filter.onlyLeaf : false;
    this.filter.noEmpty =
        typeof filter.noEmpty !== 'undefined' ? filter.noEmpty : false;
    this.index = index;
};

/**
 * @return {Element} Single node
 */
Nodeset.prototype.getElement = function () {
    return this.getElements()[0];
};

/**
 * @return {Array<Element>} List of nodes
 */
Nodeset.prototype.getElements = function () {
    let nodes;
    let /** @type {string} */ val;

    // cache evaluation result
    if (!this._nodes) {
        this._nodes = this.model.evaluate(
            this.selector,
            'nodes-ordered',
            null,
            null,
            true
        );
        // noEmpty automatically excludes non-leaf nodes
        if (this.filter.noEmpty === true) {
            this._nodes = this._nodes.filter((node) => {
                val = node.textContent;

                return node.children.length === 0 && val.trim().length > 0;
            });
        }
        // this may still contain empty leaf nodes
        else if (this.filter.onlyLeaf === true) {
            this._nodes = this._nodes.filter(
                (node) => node.children.length === 0
            );
        }
    }

    nodes = this._nodes;

    if (typeof this.index !== 'undefined' && this.index !== null) {
        nodes =
            typeof nodes[this.index] === 'undefined' ? [] : [nodes[this.index]];
    }

    return nodes;
};

/**
 * Sets the index of the Nodeset instance
 *
 * @param {number} [index] - The 0-based index
 */
Nodeset.prototype.setIndex = function (index) {
    this.index = index;
};

/**
 * Sets data node values.
 *
 * @param {(string|Array<string>)} [newVals] - The new value of the node.
 * @param {string} [xmlDataType] - XML data type of the node
 *
 * @return {null|UpdatedDataNodes} `null` is returned when the node is not found or multiple nodes were selected,
 *                       otherwise an object with update information is returned.
 */
Nodeset.prototype.setVal = function (newVals, xmlDataType) {
    let /** @type {string} */ newVal;
    let updated;
    let customData;

    const curVal = this.getVal();

    if (typeof newVals !== 'undefined' && newVals !== null) {
        newVal = Array.isArray(newVals)
            ? newVals.join(' ')
            : newVals.toString();
    } else {
        newVal = '';
    }

    newVal = this.convert(newVal, xmlDataType);

    const strVal = String(newVal);
    const targets = this.getElements();

    if (targets.length === 1 && strVal !== curVal.toString()) {
        const target = targets[0];
        // First change the value so that it can be evaluated in XPath (validated).
        if (isNodeRelevant(target)) {
            target.textContent = strVal;
        } else {
            setNonRelevantValue(target, strVal);
        }

        // then return validation result
        updated = this.getClosestRepeat();
        updated.nodes = [target.nodeName];

        customData = this.model.getUpdateEventData(target, xmlDataType);
        updated = customData ? $.extend({}, updated, customData) : updated;

        this.model.events.dispatchEvent(event.DataUpdate(updated));

        // add type="file" attribute for file references
        if (xmlDataType === 'binary') {
            if (newVal.length > 0) {
                target.setAttribute('type', 'file');
                // The src attribute if for default binary values (added by enketo-transformer)
                // As soon as the value changes this attribute can be removed to clean up.
                target.removeAttribute('src');
            } else {
                target.removeAttribute('type');
            }
        }

        return updated;
    }
    if (targets.length > 1) {
        console.error(
            'nodeset.setVal expected nodeset with one node, but received multiple'
        );

        return null;
    }
    if (targets.length === 0) {
        console.warn(
            `Data node: ${this.selector} with null-based index: ${this.index} not found. Ignored.`
        );

        return null;
    }

    return null;
};

/**
 * Obtains the data value of the first node.
 *
 * @return {string|undefined} data value of first node or `undefined` if zero nodes
 */
Nodeset.prototype.getVal = function () {
    const nodes = this.getElements();

    return nodes.length ? nodes[0].textContent : undefined;
};

/**
 * Note: If repeats have not been cloned yet, they are not considered a repeat by this function
 *
 * @return {{repeatPath: string, repeatIndex: number}|{}} Empty object for nothing found
 */
Nodeset.prototype.getClosestRepeat = function () {
    let el = this.getElement();
    let { nodeName } = el;

    while (
        nodeName &&
        nodeName !== 'instance' &&
        !(
            el.nextElementSibling && el.nextElementSibling.nodeName === nodeName
        ) &&
        !(
            el.previousElementSibling &&
            el.previousElementSibling.nodeName === nodeName
        )
    ) {
        el = el.parentElement;
        nodeName = el ? el.nodeName : null;
    }

    return !nodeName || nodeName === 'instance'
        ? {}
        : {
              repeatPath: getXPath(el, 'instance'),
              repeatIndex: this.model.determineIndex(el),
          };
};

/**
 * Remove a repeat node
 */
Nodeset.prototype.remove = function () {
    const dataNode = this.getElement();

    if (dataNode) {
        const { nodeName } = dataNode;
        const repeatPath = getXPath(dataNode, 'instance');
        let repeatIndex = this.model.determineIndex(dataNode);
        const removalEventData = this.model.getRemovalEventData(dataNode);

        if (!this.model.templates[repeatPath]) {
            // This allows the model itseldataNodeout requiring the controller to call .extractFakeTemplates()
            // to extract non-jr:templates by assuming that node.remove() would only called for a repeat.
            this.model.extractFakeTemplates([repeatPath]);
        }
        // warning: jQuery.next() to be avoided to support dots in the nodename
        let nextNode = dataNode.nextElementSibling;

        dataNode.remove();
        this._nodes = null;

        // For internal use
        this.model.events.dispatchEvent(
            event.DataUpdate({
                nodes: null,
                repeatPath,
                repeatIndex,
                removed: true, // Introduced to handle relevance on model nodes with no form controls (calculates)
            })
        );

        // For all next sibling repeats to update formulas that use e.g. position(..)
        // For internal use
        while (nextNode && nextNode.nodeName === nodeName) {
            nextNode = nextNode.nextElementSibling;

            this.model.events.dispatchEvent(
                event.DataUpdate({
                    nodes: null,
                    repeatPath,
                    repeatIndex: repeatIndex++,
                })
            );
        }

        // For external use, if required with custom data.
        this.model.events.dispatchEvent(event.Removed(removalEventData));
    } else {
        console.error(
            `could not find node ${this.selector} with index ${this.index} to remove `
        );
    }
};

/**
 * Convert a value to a specified data type (though always stringified)
 *
 * @param {string} [x] - Value to convert
 * @param {string} [xmlDataType] - XML data type
 * @return {string} - String representation of converted value
 */
Nodeset.prototype.convert = (x, xmlDataType) => {
    if (x.toString() === '') {
        return x;
    }
    if (
        typeof xmlDataType !== 'undefined' &&
        xmlDataType !== null &&
        typeof types[xmlDataType.toLowerCase()] !== 'undefined' &&
        typeof types[xmlDataType.toLowerCase()].convert !== 'undefined'
    ) {
        return types[xmlDataType.toLowerCase()].convert(x);
    }

    return x;
};

/**
 * @param {string} constraintExpr - The XPath expression
 * @param {string} requiredExpr - The XPath expression
 * @param {string} xmlDataType - XML data type
 * @return {Promise} promise that resolves with a ValidateInputResolution object
 */
Nodeset.prototype.validate = function (
    constraintExpr,
    requiredExpr,
    xmlDataType
) {
    const that = this;
    const result = {};

    // Avoid checking constraint if required is invalid
    return this.validateRequired(requiredExpr)
        .then((passed) => {
            result.requiredValid = passed;

            return passed === false
                ? null
                : that.validateConstraintAndType(constraintExpr, xmlDataType);
        })
        .then((passed) => {
            result.constraintValid = passed;

            return result;
        });
};

/**
 * Validate a value with an XPath Expression and /or xml data type
 *
 * @param {string} [expr] - The XPath expression
 * @param {string} [xmlDataType] - XML data type
 * @return {Promise} wrapping a boolean indicating if the value is valid or not; error also indicates invalid field, or problem validating it
 */
Nodeset.prototype.validateConstraintAndType = function (expr, xmlDataType) {
    const that = this;
    let value;

    if (
        !xmlDataType ||
        typeof types[xmlDataType.toLowerCase()] === 'undefined'
    ) {
        xmlDataType = 'string';
    }

    // This one weird trick results in a small validation performance increase.
    // Do not obtain *the value* if the expr is empty and data type is string, select, select1, binary knowing that this will always return true.
    if (
        !expr &&
        (xmlDataType === 'string' ||
            xmlDataType === 'select' ||
            xmlDataType === 'select1' ||
            xmlDataType === 'binary')
    ) {
        return Promise.resolve(true);
    }

    value = that.getVal();

    if (value.toString() === '') {
        return Promise.resolve(true);
    }

    return Promise.resolve()
        .then(() => types[xmlDataType.toLowerCase()].validate(value))
        .then((typeValid) => {
            if (!typeValid) {
                return false;
            }
            const exprValid = expr
                ? that.model.evaluate(
                      expr,
                      'boolean',
                      that.originalSelector,
                      that.index
                  )
                : true;

            return exprValid;
        });
};

// TODO: rename to isTrue?
/**
 * @param {string} [expr] - The XPath expression
 * @return {boolean} Whether node is required
 */
Nodeset.prototype.isRequired = function (expr) {
    return !expr || expr.trim() === 'false()'
        ? false
        : expr.trim() === 'true()' ||
              this.model.evaluate(
                  expr,
                  'boolean',
                  this.originalSelector,
                  this.index
              );
};

/**
 * Validates if requiredness is fulfilled.
 *
 * @param {string} [expr] - The XPath expression
 * @return {Promise<boolean>} Promise that resolves with a boolean
 */
Nodeset.prototype.validateRequired = function (expr) {
    const that = this;

    // if the node has a value or there is no required expression
    if (!expr || this.getVal()) {
        return Promise.resolve(true);
    }

    // if the node does not have a value and there is a required expression
    return Promise.resolve().then(
        () =>
            // if the expression evaluates to true, the field is required, and the function returns false.
            !that.isRequired(expr)
    );
};

export { Nodeset };
