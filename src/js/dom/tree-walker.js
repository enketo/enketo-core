// @ts-check

/**
 * @typedef {TreeWalker & { set currentNode(node: Node); get currentNode():  Comment }} CommentTreeWalker
 */

export const commentTreeWalker = /** @type {CommentTreeWalker} */ (
    document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT)
);

/**
 * @typedef FindMarkerCommentsOptions
 * @property {number} [maxItems]
 * @property {Element | null} [startElement]
 */

/**
 * @typedef {import('./collections').RefIndexedDOMCollection} RefIndexedDOMCollection
 */

/**
 * @typedef {import('../form-model').FormModel} FormModel
 */

/**
 * Finds comments which have been added to the DOM as markers to locate
 * associated form features, e.g. view elements of a certain role/type and ref (@see {@link RefIndexedDOMCollection}) or insertion points for repeat instance model elements (@see {@link FormModel['getRepeatCommentNode']}).
 *
 * @param {Element} parentElement
 * @param {(commentValue: string) => boolean} filter
 * @param {FindMarkerCommentsOptions} [options]
 */
export const findMarkerComments = (parentElement, filter, options = {}) => {
    const { maxItems, startElement } = options;
    const initialCurrentNode = commentTreeWalker.currentNode;

    commentTreeWalker.currentNode = startElement ?? parentElement;

    /** @type {Comment[]} */
    const comments = [];

    while (commentTreeWalker.nextNode() != null) {
        const comment = commentTreeWalker.currentNode;

        if (!parentElement.contains(comment)) {
            break;
        }

        if (filter(comment.data)) {
            comments.push(comment);

            if (maxItems != null && comments.length === maxItems) {
                break;
            }
        }
    }

    commentTreeWalker.currentNode = initialCurrentNode;

    return comments;
};

/**
 * @param {Element} element
 * @param {string} value
 * @param {number} index
 */
export const findMarkerComment = (element, value, index) => {
    // const comments = findMarkerComments(
    //     element,
    //     (commentValue) => commentValue === value,
    //     { maxItems: index + 1 }
    // );

    // return comments[index];
    const initialCurrentNode = commentTreeWalker.currentNode;

    commentTreeWalker.currentNode = element;

    let found = -1;

    /** @type {Comment | null} */
    let result = null;

    while (found < index && commentTreeWalker.nextNode() != null) {
        const comment = /** @type {Comment} */ (commentTreeWalker.currentNode);

        if (comment.data === value) {
            found += 1;

            if (found === index) {
                result = comment;

                break;
            }
        }
    }

    commentTreeWalker.currentNode = initialCurrentNode;

    return result;
};
