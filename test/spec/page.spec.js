import loadForm from '../helpers/load-form';
import events from '../../src/js/event';

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

    describe( 'ToC generation', () => {

        const ALL_EN = [ 'Note', 'Trigger', 'Text abc', 'Int abc', 'Int def', 'Group fl label', 'Range abc', 'Range ccc', 'Repeat Group label', 'Last' ];
        const ALL_NL = [ 'Noot', 'Trekker', 'Tekst abc', 'Int abc', 'Int def', 'Groep fl label', 'Reeks abc', 'Reeks ccc', 'Herhaal Groep label', 'Laatste' ];
        const SUB_EN = [ 'Trigger', 'Int abc', 'Range abc' ];
        const SUB_NL = [ 'Trekker', 'Int abc', 'Reeks abc' ];

        it( 'does nothing if there is no container for the ToC in the DOM', () => {
            const form = loadForm( 'pages.xml' );
            form.init();
            const $toc = form.pages.$toc;

            expect( $toc.length ).toEqual( 0 );
        } );

        it( 'builds a ToC using the first visible label on each page', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"/>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( toc ).not.toEqual( null );
            expect( toc.querySelectorAll( 'li' ).length ).toEqual( 10 );
            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( ALL_EN );
        } );

        it( 'updates a ToC when page relevancy changes', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"/>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( ALL_EN );

            // Now make a bunch of pages irrelevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( SUB_EN );
        } );

        it( 'updates a ToC when the language changes', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"></ol>
                <span class="form-language-selector"></span>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( ALL_EN );

            // Switch language
            const langSelector = form.view.html.parentNode.querySelector( '#form-languages' );
            langSelector.value = 'nl';
            langSelector.dispatchEvent( events.Change() );

            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( ALL_NL );

            // Now make a bunch of pages irrelevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( SUB_NL );
        } );

        it( 'uses an abbreviated hint or default [number] if page has no label', () => {
            const form = loadForm( 'pages-nolabel.xml' );
            form.view.$.append( '<ol class="pages-toc__list"/>' );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .toEqual( [ 'hint5678901234567890...', '[2]' ] );

        } );

    } );

} );
