import loadForm from '../helpers/load-form';

describe( 'Pages mode', () => {

    describe( 'Initial loading if form includes repeats-as-page', () => {

        it( 'loads to the proper first page', () => {
            const form = loadForm( 'pages.xml' );
            form.init();

            expect( form.pages.$current[ 0 ] ).toEqual( form.view.html.querySelector( '.question' ) );
        } );

        it( 'loads to the proper first page if the form contains only a repeat and nothing outside it', () => {
            const form = loadForm( 'repeat-only-pages.xml' );
            form.init();

            expect( form.pages.$current.length ).toEqual( 1 );
            expect( form.pages.$current.hasClass( 'current' ) ).toBe( true );
            expect( form.pages.$current[ 0 ] ).toEqual( form.view.html.querySelector( '.or-repeat' ) );
        } );

    } );

} );
