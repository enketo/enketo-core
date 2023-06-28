import loadForm from '../helpers/load-form';

describe('Pages mode', () => {
    describe('Initial loading if form includes repeats-as-page', () => {
        /** @type {import('sinon').SinonSandbox} */
        let sandbox;

        /** @type {SinonFakeTimers} */
        let timers;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            timers = sandbox.useFakeTimers();
        });

        afterEach(() => {
            timers.runAll();

            timers.clearTimeout();
            timers.clearInterval();
            timers.restore();
            sandbox.restore();
        });

        it('loads to the proper first page', () => {
            const form = loadForm('pages.xml');
            form.init();

            // something asynchronous happening, validation probably
            const firstQuestion = form.view.html.querySelector('.question');
            const currentInModule = form.pages.current;
            const currentInView = form.view.html.querySelector('.current');

            timers.runAll();

            expect(currentInModule).to.equal(firstQuestion);
            expect(currentInView).to.equal(firstQuestion);
        });

        it('loads to the proper first page if the form contains only a repeat and nothing outside it', () => {
            const form = loadForm('repeat-only-pages.xml');
            form.init();

            expect(form.pages.current).not.to.equal(null);
            expect(form.pages.current.classList.contains('current')).to.equal(
                true
            );
            expect(form.pages.current).to.equal(
                form.view.html.querySelector('.or-repeat')
            );
        });
    });

    describe('Flip to page on multipages form', () => {
        it('flip to second page', () => {
            const form = loadForm('pages-comment.xml');
            form.init();

            const currentPage = form.pages.current;
            const pageTwoTextAreaHiddenComment = form.view.html.querySelector(
                '[data-for="/data/item2"]'
            );
            const pageComment = form.view.html
                .querySelector('input[name="/data/item2"]')
                .closest('[role="page"]');
            const pageTwoTextAreaCommentAncestor =
                pageTwoTextAreaHiddenComment.closest('[role="comment"]');

            form.pages.flipToPageContaining([pageTwoTextAreaCommentAncestor]);
            expect(currentPage).not.to.equal(form.pages.current);
            expect(pageComment).to.equal(form.pages.current);
        });
    });

    // TODO: this should be in toc.spec.js, but the functionality is not
    // implemented there either, and it may be confusing to test functionality
    // of one module in the test module for another.
    describe('Table of contents page navigation', () => {
        it('navigates to a page by table of contents', () => {
            const form = loadForm('widgets_on_pages.xml');
            const tocList = document.createElement('ol');

            tocList.classList.add('pages-toc__list');

            form.view.html.append(tocList);
            form.init();

            const question = form.view.html.querySelectorAll('.question')[2];

            expect(question.classList.contains('current')).to.equal(false);

            const tocLink = tocList.querySelector('li[tocid="3"] a');

            tocLink.click();

            expect(question.classList.contains('current')).to.equal(true);
        });
    });
});
