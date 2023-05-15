// @ts-check

import { RefIndexedDOMCollection } from '../../../src/js/dom/collections';

import loadForm from '../../helpers/load-form';

/**
 * @typedef {import('../../../src/js/form').Form} Form
 */

describe('DOM collections', () => {
    describe('indexed by reference', () => {
        /** @type {Form} */
        let form;

        /** @type {HTMLFormElement} */
        let formElement;

        /** @type {RefIndexedDOMCollection} */
        let collection;

        const selector = '.arbitrary-even, .arbitrary-odd';

        beforeEach(() => {
            form = loadForm('collections.xml');
            formElement = form.view.html;

            const repeatInstances = formElement.querySelectorAll('.or-repeat');

            repeatInstances.forEach((repeatInstance, index) => {
                repeatInstance.insertAdjacentHTML(
                    'afterbegin',
                    /* html */ `
                    <span class="arbitrary-${
                        index % 2 === 0 ? 'even' : 'odd'
                    }" data-arbitrary-ref="${repeatInstance.getAttribute(
                        'name'
                    )}/child"></span>
                `
                );
            });

            collection = new RefIndexedDOMCollection(
                'arbitrary-collection',
                form,
                formElement,
                selector,
                'data-arbitrary-ref'
            );

            form.init();
        });

        afterEach(() => {
            form.resetView();

            expect(collection.hasRef('/data/rep/child')).to.be.false;
            expect(collection.hasRef('/data/rep/rep2/child')).to.be.false;
            expect(collection.getElements().length).to.equal(0);
        });

        it('gets all elements matching the specified selector', () => {
            const elements = collection.getElements();

            expect(elements.length).to.equal(2);

            expect(elements).to.deep.equal([
                ...formElement.querySelectorAll(selector),
            ]);
        });

        it('gets an updated list of all matching elements after a repeat instance is added', () => {
            const addOuterRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat-info[data-name="/data/rep"] .add-repeat-btn'
                )
            );

            addOuterRepeatButton?.click();

            let elements = collection.getElements();

            expect(elements.length).to.equal(4);

            expect(elements).to.deep.equal([
                ...formElement.querySelectorAll(selector),
            ]);

            const addInnerRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat[name="/data/rep"]:nth-of-type(2) .or-repeat-info[data-name="/data/rep/rep2"] .add-repeat-btn'
                )
            );

            addInnerRepeatButton?.click();

            elements = collection.getElements();

            expect(elements.length).to.equal(5);
            expect(elements).to.deep.equal([
                ...formElement.querySelectorAll(selector),
            ]);
        });

        it('gets all elements matching the specified selector and reference', () => {
            const elements = collection.getElementsByRef(
                '/data/rep/rep2/child'
            );

            expect(elements.length).to.equal(1);

            expect(elements).to.deep.equal([
                ...formElement.querySelectorAll(
                    '[data-arbitrary-ref="/data/rep/rep2/child"]'
                ),
            ]);
        });

        it('gets an updated list of all matching elements by reference after a repeat instance is added', () => {
            const addOuterRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat-info[data-name="/data/rep"] .add-repeat-btn'
                )
            );

            addOuterRepeatButton?.click();

            let outer = collection.getElementsByRef('/data/rep/child');
            let inner = collection.getElementsByRef('/data/rep/rep2/child');

            expect(outer.length).to.equal(2);
            expect(outer).to.deep.equal([
                ...formElement.querySelectorAll(
                    '[data-arbitrary-ref="/data/rep/child"]'
                ),
            ]);
            expect(inner.length).to.equal(2);
            expect(inner).to.deep.equal([
                ...formElement.querySelectorAll(
                    '[data-arbitrary-ref="/data/rep/rep2/child"]'
                ),
            ]);

            const addInnerRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat[name="/data/rep"]:nth-of-type(2) .or-repeat-info[data-name="/data/rep/rep2"] .add-repeat-btn'
                )
            );

            addInnerRepeatButton?.click();

            outer = collection.getElementsByRef('/data/rep/child');
            inner = collection.getElementsByRef('/data/rep/rep2/child');

            expect(outer.length).to.equal(2);
            expect(outer).to.deep.equal([
                ...formElement.querySelectorAll(
                    '[data-arbitrary-ref="/data/rep/child"]'
                ),
            ]);
            expect(inner.length).to.equal(3);
            expect(inner).to.deep.equal([
                ...formElement.querySelectorAll(
                    '[data-arbitrary-ref="/data/rep/rep2/child"]'
                ),
            ]);
        });

        it('gets the index of matching elements by reference', () => {
            const addOuterRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat-info[data-name="/data/rep"] .add-repeat-btn'
                )
            );

            addOuterRepeatButton?.click();

            const addInnerRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat[name="/data/rep"]:nth-of-type(2) .or-repeat-info[data-name="/data/rep/rep2"] .add-repeat-btn'
                )
            );

            addInnerRepeatButton?.click();

            ['/data/rep/child', '/data/rep/rep2/child'].forEach((ref) => {
                const elements = collection.getElementsByRef(ref);

                elements.forEach((element, index) => {
                    expect(collection.refIndexOf(element, ref)).to.equal(index);
                });
            });
        });

        it('gets the element by reference at the specified index', () => {
            const addOuterRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat-info[data-name="/data/rep"] .add-repeat-btn'
                )
            );

            addOuterRepeatButton?.click();

            const addInnerRepeatButton = /** @type {HTMLElement} */ (
                formElement.querySelector(
                    '.or-repeat[name="/data/rep"]:nth-of-type(2) .or-repeat-info[data-name="/data/rep/rep2"] .add-repeat-btn'
                )
            );

            addInnerRepeatButton?.click();

            ['/data/rep/child', '/data/rep/rep2/child'].forEach((ref) => {
                const elements = collection.getElementsByRef(ref);

                elements.forEach((element, index) => {
                    expect(collection.getElementByRef(ref, index)).to.equal(
                        element
                    );
                });
            });
        });

        it('determines whether a specified ref is present', () => {
            expect(collection.hasRef('/data/rep/child')).to.be.true;
            expect(collection.hasRef('/data/rep/rep2/child')).to.be.true;
            expect(collection.hasRef('/data/rep/rep2/rep3/child')).to.be.false;
        });
    });
});
