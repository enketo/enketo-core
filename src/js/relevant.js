/**
 * @module relevant
 *
 * @description Updates branches
 */

import config from 'enketo/config';
import events from './event';
import { closestAncestorUntil, getChild, getChildren } from './dom-utils';

/**
 * @typedef RelevanceState
 * @property {boolean} isParentNonRelevant
 * @property {boolean} isSelfNonRelevant
 * @property {string} [nonRelevantValue]
 */

/** @type {Map<Element, RelevanceState>} */
const relevanceState = new Map();

/**
 * Determines whether a model node is relevant, and not a descendant of any
 * non-relevant parent. For backwards-compatibility, this always returns `true`
 * when `config.excludeNonRelevant` is off.
 *
 * @param {Element} node
 */
export const isNodeRelevant = (node) => {
    if (!config.excludeNonRelevant) {
        return true;
    }

    const state = relevanceState.get(node);

    return !state?.isParentNonRelevant && !state?.isSelfNonRelevant;
};

/**
 * @param {Element} element
 * @param {string} nonRelevantValue
 */
export const setNonRelevantValue = (element, nonRelevantValue) => {
    relevanceState.set(element, {
        ...relevanceState.get(element),
        nonRelevantValue,
    });
};

/**
 * @param {Element} element
 */
export const getNonRelevantValue = (element) => relevanceState.get(element);

/**
 * Used to preserve known repeat context in a chain of computations. This helps to
 * identify repeat context for nodes with no view control, and improves performance
 * in certain cases.
 *
 * @typedef RelevantDataNodesOptions
 * @property {number} [repeatIndex]
 * @property {string} [repeatPath]
 */

export default {
    /**
     * @param {UpdatedDataNodes | null} [updated] - The object containing info on updated data nodes.
     * @param {boolean} [forceClearNonRelevant] -  whether to empty the values of non-relevant nodes
     */
    update(updated, forceClearNonRelevant = config.forceClearNonRelevant) {
        if (!this.form) {
            throw new Error(
                'Branch module not correctly instantiated with form property.'
            );
        }

        const nodes = this.form
            .getRelatedNodes('data-relevant', '', updated)
            .get();

        this.updateNodes(nodes, forceClearNonRelevant, updated ?? {});
    },

    /**
     * @param {Array<Element>} nodes - Nodes to update
     * @param {boolean} [forceClearNonRelevant] - whether to empty the values of non-relevant nodes
     * @param {RelevantDataNodesOptions} [options]
     */
    updateNodes(nodes, forceClearNonRelevant = false, options = {}) {
        let branchChange = false;
        const relevantCache = {};
        const alreadyCovered = [];
        const clonedRepeatsPresent =
            this.form.repeatsPresent &&
            this.form.view.html.querySelector('.or-repeat.clone');

        nodes.forEach((node) => {
            // Note that node.getAttribute('name') is not the same as p.path for repeated radiobuttons!
            if (alreadyCovered.includes(node.getAttribute('name'))) {
                return;
            }

            // Since this result is almost certainly not empty, closest() is the most efficient
            const branchNode = node.closest('.or-branch');

            const p = {};
            let cacheIndex = null;

            p.relevant = this.form.input.getRelevant(node);
            p.path = this.form.input.getName(node);

            if (!branchNode) {
                if (
                    !closestAncestorUntil(
                        node.parentsUntil(node, '#or-calculated-items', '.or')
                    )
                ) {
                    console.error('could not find branch node for ', node);
                }

                return;
            }

            const { repeatIndex } = options;
            let { repeatPath } = options;

            if (this.form.repeatsPresent) {
                if (repeatPath == null) {
                    repeatPath = this.form.nodePathToRepeatPath[p.path];
                }

                if (repeatPath == null) {
                    for (const prefix of this.form.repeatPathPrefixes) {
                        if (p.path.startsWith(prefix)) {
                            repeatPath = prefix.substring(0, prefix.length - 1);

                            break;
                        }
                    }

                    this.form.nodePathToRepeatPath[p.path] = repeatPath ?? null;
                }

                /*
                 * Check if the (calculate without form control) node is part of a repeat that has no instances
                 */
                const pathParts = p.path.split('/');
                if (pathParts.length > 3 && repeatPath == null) {
                    const parentPath = pathParts
                        .splice(0, pathParts.length - 1)
                        .join('/');
                    const parentGroups = [
                        ...this.form.view.html.querySelectorAll(
                            `.or-group[name="${parentPath}"],.or-group-data[name="${parentPath}"]`
                        ),
                    ]
                        // now remove the groups that have a repeat-info child without repeat instance siblings
                        .filter(
                            (group) =>
                                getChild(group, '.or-repeat') ||
                                !getChild(group, '.or-repeat-info')
                        );
                    // If the parent doesn't exist in the DOM it means there is a repeat ancestor and there are no instances of that repeat.
                    // Hence that relevant does not need to be evaluated (and would fail otherwise because the context doesn't exist).
                    if (parentGroups.length === 0) {
                        return;
                    }
                }
            }

            /*
             * Determining ancestry is expensive. Using the knowledge most forms don't use repeats and
             * if they do, they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
             * The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
             * (6-7 seconds of loading time on the bench6 form)
             */
            const insideRepeat =
                repeatPath != null && p.path.startsWith(`${repeatPath}`);
            const repeatParent = clonedRepeatsPresent
                ? branchNode.closest('.or-repeat')
                : null;

            /**
             * Determines the current repeat index position for nodes with no view control.
             *
             * @see {RelevantDataNodesOptions}
             */
            const hiddenInputRepeatIndex =
                repeatParent == null &&
                typeof repeatIndex === 'number' &&
                repeatPath != null &&
                p.path.startsWith(`${repeatPath}/`)
                    ? repeatIndex
                    : null;

            const insideRepeatClone =
                hiddenInputRepeatIndex > 0 ||
                (clonedRepeatsPresent &&
                    branchNode.closest('.or-repeat.clone'));

            /*
             * If the relevant is placed on a group and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available. This same logic is applied in output.js.
             */
            let context = p.path;
            if (
                (getChild(node, `.or-repeat-info[data-name="${p.path}"]`) &&
                    !getChild(node, `.or-repeat[name="${p.path}"]`)) ||
                // Special cases below for model nodes with no visible form control: if repeat instance removed or if
                // no instances at all (e.g. during load with `jr:count="0"`)
                (insideRepeat &&
                    repeatParent == null &&
                    (options.removed ||
                        this.form.view.html.querySelector(
                            `.or-repeat[name="${CSS.escape(repeatPath)}"]`
                        ) == null))
            ) {
                context = null;
            }

            /*
             * Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
             * It can be safely set to 0 for other branches.
             */
            p.ind =
                hiddenInputRepeatIndex ??
                (context && insideRepeatClone
                    ? this.form.input.getIndex(node)
                    : 0);

            /*
             * Caching is only possible for expressions that do not contain relative paths to nodes.
             * So, first do a *very* aggresive check to see if the expression contains a relative path.
             * This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
             * expression, which may prove to be incorrect.
             */
            if (p.relevant.indexOf('..') === -1) {
                if (!insideRepeat) {
                    cacheIndex = p.relevant;
                } else {
                    // The path is stripped of the last nodeName to record the context.
                    // This might be dangerous, but until we find a bug, it helps in those forms where one group contains
                    // many sibling questions that each have the same relevant.
                    cacheIndex = `${p.relevant}__${p.path.substring(
                        0,
                        p.path.lastIndexOf('/')
                    )}__${p.ind}`;
                }
            }
            let result;
            if (
                cacheIndex &&
                typeof relevantCache[cacheIndex] !== 'undefined'
            ) {
                result = relevantCache[cacheIndex];
            } else {
                result = this.evaluate(p.relevant, context, p.ind);
                relevantCache[cacheIndex] = result;
            }

            if (!insideRepeat) {
                alreadyCovered.push(node.getAttribute('name'));
            }

            if (
                this.process(
                    branchNode,
                    p.path,
                    result,
                    forceClearNonRelevant,
                    {
                        ...options,
                        repeatIndex: p.ind,
                        repeatPath,
                    }
                ) === true
            ) {
                branchChange = true;
            }
        });

        if (branchChange) {
            this.form.view.$.trigger('changebranch');
        }
    },
    /**
     * Evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
     *
     * @param {string} expr - relevant XPath expression to evaluate
     * @param {string} contextPath - Path of the context node
     * @param {number} index - index of context node
     * @return {boolean} result of evaluation
     */
    evaluate(expr, contextPath, index) {
        const result = this.form.model.evaluate(
            expr,
            'boolean',
            contextPath,
            index
        );

        return result;
    },
    /**
     * Processes the evaluation result for a branch
     *
     * @param {Element} branchNode - branch node
     * @param {string} path - path of branch node
     * @param {boolean} result - result of relevant evaluation
     * @param {boolean} [forceClearNonRelevant] - whether to empty the values of non-relevant nodes
     * @param {RelevantDataNodesOptions} [options]
     */
    process(
        branchNode,
        path,
        result,
        forceClearNonRelevant = false,
        options = {}
    ) {
        if (result === true) {
            return this.enable(branchNode, path, options);
        }
        return this.disable(branchNode, path, forceClearNonRelevant, options);
    },

    /**
     * Checks whether branch currently has 'relevant' state
     *
     * @param {Element} branchNode - branch node
     * @return {boolean} whether branch is currently relevant
     */
    selfRelevant(branchNode) {
        return (
            !branchNode.classList.contains('disabled') &&
            !branchNode.classList.contains('pre-init')
        );
    },

    /**
     * @typedef ToggleNonRelevantModleNodesOptions
     * @property {number} [repeatIndex]
     * @property {number} [repeatPath]
     * @property {boolean} setRelevant
     */

    /**
     * @typedef {import('./nodeset').Nodeset} NodeSet
     */

    /**
     * @typedef RepeatInfo
     * @property {number} repeatIndex
     * @property {string} repeatPath
     */

    /**
     * @param {HTMLElement} branchNode
     * @param {string} path
     * @param {ToggleNonRelevantModleNodesOptions} options
     */
    toggleNonRelevantModelNodes(branchNode, path, options) {
        if (config.excludeNonRelevant) {
            const { setRelevant } = options;

            branchNode.dataset.isNonRelevant = String(!setRelevant);

            const { repeatIndex, repeatPath } = options;

            const isRepeatChild =
                repeatPath && path.startsWith(`${repeatPath}/`);
            const hasRepeatData = isRepeatChild && repeatIndex != null;

            const closestRepeat = branchNode.parentNode?.closest('.or-repeat');
            const checkRepeatIndex =
                repeatIndex == null && closestRepeat != null;

            /** @type {NodeSet | null} */
            let nodeSet = null;

            /** @type {RepeatInfo | null} */
            let repeatInfo = null;

            if (checkRepeatIndex) {
                const repeatIndex = this.form.input.getIndex(branchNode);

                nodeSet = this.form.model.node(path, repeatIndex);
                repeatInfo = nodeSet.getClosestRepeat();
            } else if (hasRepeatData) {
                repeatInfo = {
                    repeatIndex,
                    repeatPath,
                };
            }

            if (nodeSet == null) {
                nodeSet = this.form.model.node(
                    path,
                    isRepeatChild ? repeatIndex : null
                );
            }

            const referencedModelNodes = new Set(nodeSet.getElements());

            const modelNodes = nodeSet
                .getElements()
                .flatMap((node) => [
                    ...referencedModelNodes,
                    ...node.querySelectorAll('*'),
                ])
                .filter((node) => {
                    const isNodeNonRelevant = !isNodeRelevant(node);

                    return isNodeNonRelevant === setRelevant;
                });

            if (modelNodes.length === 0) {
                return;
            }

            /** @type {Element[]} */
            const updatedElements = [];

            for (const node of modelNodes) {
                const isLeafNode = node.children.length === 0;
                const isReferencedNode = referencedModelNodes.has(node);
                const currentValue = isLeafNode
                    ? node.textContent ||
                      (relevanceState.get(node)?.currentValue ??
                          node.textContent)
                    : null;
                const currentRelevanceState = relevanceState.get(node);
                const isParentNonRelevant = Boolean(
                    currentRelevanceState?.isParentNonRelevant
                );
                const isSelfNonRelevant = Boolean(
                    currentRelevanceState?.isSelfNonRelevant
                );

                if (setRelevant) {
                    if (
                        isLeafNode &&
                        (isReferencedNode || !isSelfNonRelevant)
                    ) {
                        node.textContent = currentValue;
                    }

                    relevanceState.set(node, {
                        isParentNonRelevant: isReferencedNode
                            ? isParentNonRelevant
                            : false,
                        isSelfNonRelevant: isReferencedNode
                            ? false
                            : isSelfNonRelevant,
                        currentValue,
                        nonRelevantValue: isReferencedNode
                            ? null
                            : currentValue,
                    });
                } else {
                    if (isLeafNode) {
                        node.textContent = '';
                    }

                    relevanceState.set(node, {
                        isParentNonRelevant: isReferencedNode
                            ? isParentNonRelevant
                            : true,
                        isSelfNonRelevant: isReferencedNode
                            ? true
                            : isSelfNonRelevant,
                        currentValue,
                        nonRelevantValue: currentValue,
                    });
                }

                if (isLeafNode) {
                    updatedElements.unshift(node);
                }
            }

            if (updatedElements.length > 0) {
                this.form.model.events.dispatchEvent(
                    events.DataUpdate({
                        nodes: updatedElements.map(({ nodeName }) => nodeName),
                        ...repeatInfo,
                    })
                );
            }
        }
    },

    /**
     * Enables and reveals a branch node/group
     *
     * @param {Element} branchNode - The Element to reveal and enable
     * @param {string} path - path of branch node
     * @param {RelevantDataNodesOptions} options
     * @return {boolean} whether the relevant changed as a result of this action
     */
    enable(branchNode, path, options) {
        let change = false;

        if (!this.selfRelevant(branchNode)) {
            change = true;
            branchNode.classList.remove('disabled', 'pre-init');
            this.toggleNonRelevantModelNodes(branchNode, path, {
                ...options,
                setRelevant: true,
            });
            // Update calculated items, both individual question or descendants of group
            this.form.calc.update({
                relevantPath: path,
            });
            this.form.itemset.update({
                relevantPath: path,
            });
            // Update outputs that are children of branch
            // TODO this re-evaluates all outputs in the form which is not efficient!
            this.form.output.update();
            this.form.widgets.enable(branchNode);
            this.activate(branchNode);
        }

        return change;
    },

    /**
     * Disables and hides a branch node/group
     *
     * @param {Element} branchNode - The element to hide and disable
     * @param {string} path - path of branch node
     * @param {boolean} forceClearNonRelevant - whether to empty the values of non-relevant nodes
     * @param {RelevantDataNodesOptions} options
     * @return {boolean} whether the relevancy changed as a result of this action
     */
    disable(branchNode, path, forceClearNonRelevant, options) {
        const neverEnabled = branchNode.classList.contains('pre-init');
        let changed = false;

        if (
            neverEnabled ||
            this.selfRelevant(branchNode) ||
            forceClearNonRelevant
        ) {
            changed = true;

            if (forceClearNonRelevant) {
                this.clear(branchNode, path);
            }

            this.toggleNonRelevantModelNodes(branchNode, path, {
                ...options,
                setRelevant: false,
            });
            this.deactivate(branchNode);
        }

        return changed;
    },
    /**
     * Clears values from branchnode.
     * This function is separated so it can be overridden in custom apps.
     *
     * @param {Element} branchNode - branch node
     * @param {string} path - path of branch node
     */
    clear(branchNode, path) {
        // A change event ensures the model is updated
        // An inputupdate event is required to update widgets
        this.form.input.clear(
            branchNode,
            events.Change(),
            events.InputUpdate()
        );

        // Update calculated items if branch is a group
        // We exclude question branches here because those will have been cleared already in the previous line.
        if (branchNode.matches('.or-group, .or-group-data')) {
            this.form.calc.update(
                {
                    relevantPath: path,
                },
                '',
                true
            );
        }
    },
    /**
     * @param {Element} branchNode - branch node
     * @param {boolean} bool - value to set disabled property to
     */
    setDisabledProperty(branchNode, bool) {
        const type = branchNode.nodeName.toLowerCase();

        if (type === 'label') {
            getChildren(branchNode, 'input, select, textarea').forEach(
                (el) => (el.disabled = bool)
            );
        } else if (type === 'fieldset' || type === 'section') {
            // TODO: a <section> cannot be disabled like this
            branchNode.disabled = bool;
        } else {
            branchNode
                .querySelectorAll('fieldset, input, select, textarea')
                .forEach((el) => (el.disabled = bool));
        }
    },
    /**
     * Activates form controls.
     * This function is separated so it can be overridden in custom apps.
     *
     * @param {Element} branchNode - branch node
     */
    activate(branchNode) {
        this.setDisabledProperty(branchNode, false);
    },
    /**
     * Deactivates form controls.
     * This function is separated so it can be overridden in custom apps.
     *
     * @param {Element} branchNode - branch node
     */
    deactivate(branchNode) {
        branchNode.classList.add('disabled');
        this.form.widgets.disable(branchNode);
        this.setDisabledProperty(branchNode, true);
    },
};
