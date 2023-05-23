// @ts-check

import { commentTreeWalker, findMarkerComments } from './tree-walker';

/**
 * @typedef {import('./tree-walker').CommentTreeWalker} CommentTreeWalker
 */

/**
 * @typedef {import('../form').Form} Form
 */

/**
 * @typedef {TreeWalker & { currentNode: ProcessingInstruction }} ProcessingInstructionTreeWalker
 */

const BREAK = Symbol('BREAK');

/**
 * @typedef {typeof BREAK} Break
 */

/** @type {Set<string>} */
let activeIds = new Set();

/** @type {Set<RefIndexedDOMCollection>} */
let collections = new Set();

/**
 * Provides consistent, efficient access to common operations on DOM collections which:
 *
 * - Have an identifiable role or type
 * - Have been transformed by Enketo Transformer to have a known attribute name
 *   whose value is a stable model nodeset reference, where existing form logic
 *   is concerned with:
 *     - finding elements of a given role by a given reference
 *     - identifying the presence of said reference in a form, or in another
 *       element's hierarchy
 * - Are indexed by their [containing] repeat instance on forms with repeats,
 *   where existing form logic is concerned with:
 *     - determining their current index position
 *     - finding an element with a given role/reference at a specified index
 *       position
 *
 * These collections are looked up, and cached, by their role/type, as well as
 * by their model nodeset reference. For forms with repeat functionality, their
 * repeat index positions are also cached, invalidating caches of repeats and
 * their descendants when instances are added or removed. For forms without
 * repet functionality, each collection is cached for the duration of form entry.
 *
 * @package - exported only for unit tests
 * @template {string} [CollectionID=string]
 */
export class RefIndexedDOMCollection {
    /**
     * @param {CollectionID} id
     * @param {Form} form
     * @param {HTMLElement} rootElement
     * @param {string} selector
     * @param {string} [refAttr]
     */
    constructor(id, form, rootElement, selector, refAttr) {
        if (activeIds.has(id)) {
            throw new Error(
                `The id parameter must be unique per form, "${id}" is already used`
            );
        }

        collections.add(this);

        /** @type {string} */
        this.id = id;

        /** @type {Form} */
        this.form = form;

        /** @type {HTMLElement} */
        this.rootElement = rootElement;

        /** @type {string} */
        this.prefix = `${id}:`;

        /** @type {string} */
        this.selector = selector;

        /** @type {string | null} */
        this.refAttr = refAttr ?? null;

        /** @type {Set<string>} */
        this.refs = new Set();

        /** @type {Set<string>} */
        this.repeatDescendantRefs = new Set();

        /** @type {Set<string>} */
        this.topLevelGroupRefs = new Set();

        /**
         * @private
         * @type {Map<string, WeakMap<HTMLElement, number>>}
         */
        this.refIndexCache = new Map([['', new WeakMap()]]);

        /**
         * @private
         * @type {Map<string, HTMLElement[]>}
         */
        this.refElementsCache = new Map();

        const { refs } = this;

        const elements = /** @type {NodeListOf<HTMLElement>} */ (
            rootElement.querySelectorAll(selector)
        );
        const firstElement = elements[0];

        const isNoop =
            firstElement == null || firstElement.parentElement == null;

        /** @type {boolean} */
        this.isNoop = isNoop;

        /** @type {HTMLElement} */
        this.startElement = isNoop
            ? rootElement
            : /** @type {HTMLElement} */ (
                  firstElement?.previousElementSibling ?? rootElement
              );

        /** @type {HTMLElement} */
        this.startElementContainer = isNoop
            ? rootElement
            : this.startElement.closest('.or-group') ?? rootElement;

        const elementName = firstElement?.nodeName.toLowerCase();

        /**
         * @private
         * @type {'nextElementSibling' | 'parentElement'}
         */
        this.commentToElementKey =
            elementName === 'input' ? 'nextElementSibling' : 'parentElement';

        /**
         * Inserts `comment` into the DOM so `element` can be efficiently found
         * with a tree walker. In most cases `comment` is prepended to `element`
         * so it will be included in clones. The exception is for input
         * elements, which are not supposed to have child elements.
         *
         * @type {(element: HTMLElement, comment: Comment) => void}
         */
        const insert =
            elementName === 'input'
                ? (element, comment) => {
                      element.before(comment);
                  }
                : (element, comment) => {
                      element.prepend(comment);
                  };

        const isFormStatic = form.initialized
            ? !form.features.repeat
            : rootElement.querySelector('.or-repeat') == null;

        elements.forEach((element) => {
            const ref = refAttr == null ? '' : element.getAttribute(refAttr);

            if (ref == null) {
                return;
            }

            if (!this.refs.has(ref)) {
                refs.add(ref);

                if (!isFormStatic && element.closest('.or-repeat') != null) {
                    this.repeatDescendantRefs.add(ref);
                    this.refIndexCache.set(ref, new WeakMap());
                } else {
                    this.refElementsCache.set(ref, [element]);
                    this.refIndexCache.set(ref, new WeakMap([[element, 0]]));
                }
            }

            const comment = document.createComment(`${id}:${ref}`);

            insert(element, comment);
        });

        /** @type {boolean} */
        this.isStatic =
            this.isNoop ||
            (form.initialized
                ? !form.features.repeat
                : rootElement.querySelector('.or-repeat') == null) ||
            this.repeatDescendantRefs.size === 0;
    }

    reset() {
        this.isNoop = true;
        this.isStatic = true;
        this.refs = new Set();
        this.repeatDescendantRefs = new Set();
        this.topLevelGroupRefs = new Set();
        this.refIndexCache = new Map([['', new WeakMap()]]);
        this.refElementsCache = new Map();
        this.rootElement = document.createElement('no-op');
    }
    /**
     * @param {string} repeatPath
     */

    invalidate(repeatPath) {
        if (this.isNoop || this.isStatic) {
            return;
        }

        this.refElementsCache.delete('');
        this.refIndexCache.set('', new WeakMap());

        let affectedRefs = Array.from(this.repeatDescendantRefs);

        if (repeatPath != null) {
            const prefix = `${repeatPath}/`;

            affectedRefs = affectedRefs.filter((ref) => {
                const isAffected = ref === repeatPath || ref.startsWith(prefix);

                return isAffected;
            });
        }

        for (const ref of affectedRefs) {
            this.refElementsCache.delete(ref);
            this.refIndexCache.set(ref, new WeakMap());
        }
    }

    /**
     * @param {string} ref
     */
    hasRef(ref) {
        return this.refs.has(ref);
    }

    /**
     * @private
     * @param {(element: HTMLElement, index: number) => Break | void} callback
     * @param {{ matchRef?: string | null }} [options]
     */
    walk(callback, options = {}) {
        const { isNoop, prefix, rootElement } = this;

        if (isNoop) {
            return;
        }

        const { matchRef } = options;
        let index = 0;
        let { startElement, startElementContainer } = this;

        if (!startElementContainer.isConnected) {
            startElementContainer = rootElement;
            this.startElementContainer = startElementContainer;
        }

        if (!startElement.isConnected) {
            startElement = startElementContainer.isConnected
                ? startElementContainer
                : this.rootElement;

            this.startElement = startElement;
        }

        const matchData = matchRef ? `${prefix}${matchRef}` : null;
        const comments = findMarkerComments(
            rootElement,
            matchData == null
                ? (commentData) => commentData.startsWith(prefix)
                : (commentData) => commentData === matchData,
            { startElement }
        );

        const { commentToElementKey } = this;

        for (const comment of comments) {
            const element = /** @type {HTMLElement} */ (
                comment[commentToElementKey]
            );
            const result = callback(element, index);

            if (result === BREAK) {
                break;
            }

            index += 1;
        }
    }

    /**
     * @private
     * @param {{ cacheIndexes?: boolean; matchRef?: string | null; }} [options]
     */
    collect(options = {}) {
        const { cacheIndexes = false, matchRef } = options;

        /** @type {HTMLElement[]} */
        const elements = [];

        this.walk(
            (element, index) => {
                elements.push(element);

                if (cacheIndexes) {
                    this.setRefIndexCache(element, index);
                }
            },
            { matchRef }
        );

        return elements;
    }

    /**
     * @private
     * @param {HTMLElement} element
     * @param {{ cacheIndexes?: boolean; matchRef?: string | null; }} [options]
     */
    getIndex(element, options = {}) {
        const { matchRef, cacheIndexes = matchRef != null } = options;
        let result = -1;

        this.walk(
            (item, index) => {
                if (cacheIndexes) {
                    this.setRefIndexCache(item, index, matchRef ?? '');
                }

                if (item === element) {
                    result = index;

                    return BREAK;
                }
            },
            { matchRef }
        );

        return result;
    }

    getElements() {
        return this.getElementsByRef('');
    }

    getElement(index = 0) {
        return this.getElements()[index];
    }

    /**
     * @param {string} ref
     */
    getElementsByRef(ref) {
        if (this.isNoop) {
            return [];
        }

        let elements = this.refElementsCache.get(ref);

        if (elements == null) {
            const cacheIndexes = ref !== '' || this.refAttr == null;
            const matchRef = ref || null;

            elements = this.collect({
                cacheIndexes,
                matchRef,
            });

            this.refElementsCache.set(ref, elements);
        }

        return elements;
    }

    /**
     * @param {string} ref
     */
    getElementByRef(ref, index = 0) {
        return this.getElementsByRef(ref)[index];
    }

    /**
     * @param {HTMLElement} element
     */
    indexOf(element) {
        if (this.isNoop) {
            return 0;
        }

        return this.getIndex(element);
    }

    /**
     * @param {HTMLElement} element
     * @param {number} index
     * @param {string} [ref]
     */
    setRefIndexCache(
        element,
        index,
        ref = this.refAttr == null
            ? ''
            : element.getAttribute(this.refAttr) ?? ''
    ) {
        let cache = this.refIndexCache.get(ref);

        if (cache == null) {
            cache = new WeakMap();

            this.refIndexCache.set(ref, cache);
        }

        cache.set(element, index);
    }

    /**
     * @param {HTMLElement} element
     * @param {string} ref
     */
    refIndexOf(element, ref) {
        if (this.isNoop) {
            return 0;
        }

        let index = this.refIndexCache.get(ref)?.get(element);

        if (
            index == null ||
            (index === -1 && this.rootElement.contains(element))
        ) {
            index = this.getIndex(element, {
                matchRef: ref,
            });

            this.setRefIndexCache(element, index);
        }

        return index;
    }
}

/**
 * Initializes collections of stable or highly cacheable DOM elements. @see {@link RefIndexedDOMCollection}
 *
 * @param {Form} form
 */
export const initCollections = (form) => {
    const rootElement = form.view.html;

    commentTreeWalker.currentNode = rootElement;

    while (commentTreeWalker.nextNode() != null) {
        // Perhaps counterintuitively, performing an initial walk can sometimes improve form load time by ~500ms for large forms!
    }

    const actions = {
        valueChanged: form.features.valueChangedAction
            ? new RefIndexedDOMCollection(
                  'valueChangedActions',
                  form,
                  rootElement,
                  '.xforms-value-changed',
                  'name'
              )
            : null,
    };
    const groups = new RefIndexedDOMCollection(
        'groups',
        form,
        rootElement,
        '.or-group, .or-group-data',
        'name'
    );
    const refTargetContainers = new RefIndexedDOMCollection(
        'refTargetContainers',
        form,
        rootElement,
        '.contains-ref-target',
        'data-contains-ref-target'
    );
    const repeats = new RefIndexedDOMCollection(
        'repeats',
        form,
        rootElement,
        '.or-repeat',
        'name'
    );
    const repeatInfos = new RefIndexedDOMCollection(
        'repeatInfos',
        form,
        rootElement,
        '.or-repeat-info',
        'data-name'
    );

    return {
        actions,
        groups,
        refTargetContainers,
        repeats,
        repeatInfos,
    };
};

/**
 * @param {string} repeatPath
 */
export const invalidateRepeatCaches = (repeatPath) => {
    for (const collection of collections) {
        collection.invalidate(repeatPath);
    }
};

export const resetCollections = () => {
    for (const collection of collections) {
        collection.reset();
    }

    activeIds = new Set();
    collections = new Set();
};
