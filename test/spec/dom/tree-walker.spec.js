// @ts-check

import {
    findMarkerComment,
    findMarkerComments,
} from '../../../src/js/dom/tree-walker';

describe('DOM tree walker functionality', () => {
    describe('Comment markers', () => {
        /** @type {HTMLFormElement} */
        let formElement;

        beforeEach(() => {
            const range = document.createRange();

            // This is a pared down representation of a real form's current DOM
            // structure, with IDs added for test clarity/simplicity.
            const { firstElementChild } =
                range.createContextualFragment(/* html */ `
                    <form class="or">
                        <section
                            class="or-group-data"
                            name="/data/foo"
                            id="group-foo">
                            <!--groups:/data/foo-->

                            <section
                                class="or-repeat"
                                name="/data/foo"
                                id="repeat-foo-0">
                                <!--repeats:/data/foo-->

                                <section
                                    class="or-group"
                                    name="/data/foo/bar"
                                    id="group-foo-0-bar">
                                    <!--groups:/data/foo/bar-->

                                    <h4>
                                        <span class="question-label active">Foo Bar</span>
                                    </h4>

                                    <section
                                        class="or-repeat"
                                        name="/data/foo/bar"
                                        id="repeat-foo-0-bar-0">
                                        <!--repeats:/data/foo/bar-->

                                        <input type="text" name="/data/foo/bar/q1" data-type-xml="string">
                                    </section>

                                    <section
                                        class="or-repeat"
                                        name="/data/foo/bar"
                                        id="repeat-foo-0-bar-1">
                                        <!--repeats:/data/foo/bar-->

                                        <input type="text" name="/data/foo/bar/q1" data-type-xml="string">
                                    </section>

                                    <div
                                        class="or-repeat-info"
                                        data-name="/data/foo/bar"
                                        id="repeat-info-foo-0-bar">
                                        <!--repeatInfos:/data/foo/bar-->

                                        <button type="button" class="btn btn-default add-repeat-btn">
                                            <i class="icon icon-plus"></i>
                                        </button>
                                    </div>
                                </section>
                            </section>

                            <section
                                class="or-repeat"
                                name="/data/foo"
                                id="repeat-foo-1">
                                <!--repeats:/data/foo-->

                                <section
                                    class="or-group"
                                    name="/data/foo/bar"
                                    id="group-foo-1-bar">
                                    <!--groups:/data/foo/bar-->

                                    <h4>
                                        <span class="question-label active">Foo Bar</span>
                                    </h4>

                                    <section
                                        class="or-repeat"
                                        name="/data/foo/bar"
                                        id="repeat-foo-1-bar-0">
                                        <!--repeats:/data/foo/bar-->

                                        <input type="text" name="/data/foo/bar/q1" data-type-xml="string">
                                    </section>

                                    <section
                                        class="or-repeat"
                                        name="/data/foo/bar"
                                        id="repeat-foo-1-bar-1">
                                        <!--repeats:/data/foo/bar-->

                                        <input type="text" name="/data/foo/bar/q1" data-type-xml="string">
                                    </section>

                                    <div
                                        class="or-repeat-info"
                                        data-name="/data/foo/bar"
                                        id="repeat-info-foo-1-bar">
                                        <!--repeatInfos:/data/foo/bar-->

                                        <button type="button" class="btn btn-default add-repeat-btn">
                                            <i class="icon icon-plus"></i>
                                        </button>
                                    </div>
                                </section>
                            </section>
                        </section>
                    </form>
                `);

            formElement = /** @type {HTMLFormElement} */ (firstElementChild);
        });

        const commentCollectionCases = [
            {
                comparison: 'equals',
                predicateValue: 'repeats:/data/foo/bar',
                expectedParentIds: [
                    'repeat-foo-0-bar-0',
                    'repeat-foo-0-bar-1',
                    'repeat-foo-1-bar-0',
                    'repeat-foo-1-bar-1',
                ],
            },

            {
                startElementSelector: '#group-foo-1-bar',
                comparison: 'equals',
                predicateValue: 'repeats:/data/foo/bar',
                expectedParentIds: ['repeat-foo-1-bar-0', 'repeat-foo-1-bar-1'],
            },

            {
                comparison: 'starts with',
                predicateValue: 'groups:',
                expectedParentIds: [
                    'group-foo',
                    'group-foo-0-bar',
                    'group-foo-1-bar',
                ],
            },
        ];

        commentCollectionCases.forEach(
            ({
                startElementSelector = 'form.or',
                comparison,
                predicateValue,
                expectedParentIds,
            }) => {
                const descriptionParentIds = expectedParentIds
                    .map((id) => `${id}`)
                    .join(', ');

                it(`finds all comments within or after ${startElementSelector} whose value ${comparison} ${predicateValue} in parents ${descriptionParentIds}`, () => {
                    const startElement = /** @type {HTMLElement} */ (
                        formElement.querySelector(startElementSelector) ??
                            formElement.closest(startElementSelector)
                    );

                    const comments = findMarkerComments(
                        formElement,
                        (commentValue) => {
                            switch (comparison) {
                                case 'equals':
                                    return commentValue === predicateValue;

                                case 'starts with':
                                    return commentValue.startsWith(
                                        predicateValue
                                    );

                                default:
                                    return false;
                            }
                        },
                        { startElement }
                    );

                    const parentIds = comments.map(
                        ({ parentElement }) => parentElement?.id
                    );

                    expect(parentIds).to.deep.equal(expectedParentIds);
                });
            }
        );

        const indexedCommentCases = [
            {
                commentValue: 'groups:/data/foo',
                index: 0,
                expectedParentId: 'group-foo',
            },
            {
                commentValue: 'groups:/data/foo/bar',
                index: 0,
                expectedParentId: 'group-foo-0-bar',
            },
            {
                commentValue: 'groups:/data/foo/bar',
                index: 1,
                expectedParentId: 'group-foo-1-bar',
            },
            {
                commentValue: 'repeats:/data/foo',
                index: 1,
                expectedParentId: 'repeat-foo-1',
            },
            {
                commentValue: 'repeats:/data/foo',
                index: 0,
                expectedParentId: 'repeat-foo-0',
            },
            {
                commentValue: 'repeats:/data/foo/bar',
                index: 3,
                expectedParentId: 'repeat-foo-1-bar-1',
            },
            {
                commentValue: 'repeats:/data/foo/bar',
                index: 2,
                expectedParentId: 'repeat-foo-1-bar-0',
            },
            {
                commentValue: 'repeatInfos:/data/foo/bar',
                index: 1,
                expectedParentId: 'repeat-info-foo-1-bar',
            },
            {
                commentValue: 'repeatInfos:/data/foo/bar',
                index: 0,
                expectedParentId: 'repeat-info-foo-0-bar',
            },
        ];

        indexedCommentCases.forEach(
            ({ commentValue, index, expectedParentId }) => {
                it(`finds comment <!--${commentValue}--> within parent #${expectedParentId}`, () => {
                    const comment = findMarkerComment(
                        formElement,
                        commentValue,
                        index
                    );

                    if (comment == null) {
                        throw new Error('Expected to find a comment');
                    }

                    expect(comment.data).to.equal(commentValue);

                    const { parentElement } = comment;

                    if (parentElement == null) {
                        throw new Error('Expected to find a parent element');
                    }

                    expect(parentElement.id).to.equal(expectedParentId);
                });
            }
        );
    });
});
