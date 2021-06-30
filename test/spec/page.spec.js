import loadForm from '../helpers/load-form';

describe( 'Pages mode', () => {

    describe( 'Initial loading if form includes repeats-as-page', () => {

        it( 'loads to the proper first page', done => {
            const form = loadForm( 'pages.xml' );
            form.init();

            // something asynchronous happening, validation probably
            setTimeout( () => {
                const firstQuestion = form.view.html.querySelector( '.question' );
                const currentInModule = form.pages.current;
                const currentInView = form.view.html.querySelector( '.current' );
                expect( currentInModule ).toEqual( firstQuestion );
                expect( currentInView ).toEqual( firstQuestion );
                done();
            }, 500 );

        } );

        it( 'loads to the proper first page if the form contains only a repeat and nothing outside it', () => {
            const form = loadForm( 'repeat-only-pages.xml' );
            form.init();

            expect( form.pages.current ).not.toEqual( null );
            expect( form.pages.current.classList.contains( 'current' ) ).toBe( true );
            expect( form.pages.current ).toEqual( form.view.html.querySelector( '.or-repeat' ) );
        } );

    } );

    describe( 'Flip to page on multipages form', () => {

        it( 'flip to second page', () => {
            const form = loadForm( 'pages-comment.xml' );
            form.init();

            const currentPage = form.pages.current;
            const pageTwoTextAreaHiddenComment = form.view.html.querySelector( '[data-for="/data/item2"]' );
            const pageComment = form.view.html.querySelector( 'input[name="/data/item2"]' ).closest( '[role="page"]' );
            const pageTwoTextAreaCommentAncestor = pageTwoTextAreaHiddenComment.closest( '[role="comment"]' );
    
            form.pages.flipToPageContaining( [ pageTwoTextAreaCommentAncestor ] );
            expect( currentPage ).not.toEqual( form.pages.current );
            expect( pageComment ).toEqual( form.pages.current );

        } );

    } );

} );
