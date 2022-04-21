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
});
