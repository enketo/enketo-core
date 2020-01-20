import loadForm from '../helpers/load-form';

describe( 'Pages mode', () => {

    describe( 'Initial loading if form includes repeats-as-page', () => {

        it( 'loads to the proper first page', () => {
            const form = loadForm( 'pages.xml' );
            form.init();

            expect( form.pages.current ).toEqual( form.view.html.querySelector( '.question' ) );
        } );

        it( 'loads to the proper first page if the form contains only a repeat and nothing outside it', () => {
            const form = loadForm( 'repeat-only-pages.xml' );
            form.init();

            expect( form.pages.current ).not.toEqual( null );
            expect( form.pages.current.classList.contains( 'current' ) ).toBe( true );
            expect( form.pages.current ).toEqual( form.view.html.querySelector( '.or-repeat' ) );
        } );

    } );

} );
