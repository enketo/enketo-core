import loadForm from '../helpers/load-form';
import events from '../../src/js/event';

describe( 'ToC for pages mode', () => {
    describe( 'ToC generation', () => {

        const ALL_EN = [ 'Note', 'Trigger', 'Text abc', 'Int abc', 'Int def', 'Text def', 'Int dgg', 'Text dgg', 'Range abc', 'Text ddd', 'Text eee', 'Range ccc', 'Range ccc', 'Last' ];
        const ALL_NL = [ 'Noot', 'Trekker', 'Tekst abc', 'Int abc', 'Int def', 'Tekst def', 'int dgg', 'Tekst dgg', 'Reeks abc', 'Tekst ddd', 'Tekst ddd', 'Reeks ccc', 'Reeks ccc', 'Laatste' ];
        const SUB_EN = [ 'Trigger', 'Int abc', 'Range abc', 'Text ddd', 'Text eee' ];
        const SUB_NL = [ 'Trekker', 'Int abc', 'Reeks abc', 'Tekst ddd', 'Tekst ddd' ];

        it( 'does nothing if there is no container for the ToC in the DOM', () => {
            const form = loadForm( 'pages.xml' );
            form.init();
            const $toc = form.pages.$toc;

            expect( $toc.length ).to.equal( 0 );
        } );

        it( 'builds a ToC that contains labels of question', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"/>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( toc ).not.to.equal( null );
            expect( toc.querySelectorAll( 'li[role="pageLink"]' ).length ).to.equal( 14 );
            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( ALL_EN );
        } );

        it( 'updates a ToC when page relevancy changes', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"/>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( ALL_EN );

            // Now make a bunch of pages non-relevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( SUB_EN );
        } );

        it( 'updates a ToC when the language changes', () => {
            const form = loadForm( 'pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ol class="pages-toc__list"></ol>
                <span class="form-language-selector"></span>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( ALL_EN );

            // Switch language
            const langSelector = form.view.html.parentNode.querySelector( '#form-languages' );
            langSelector.value = 'nl';
            langSelector.dispatchEvent( events.Change() );

            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( ALL_NL );

            // Now make a bunch of pages non-relevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( [ ...toc.querySelectorAll( 'li[role="pageLink"]' ) ].map( li => li.textContent ) )
                .to.deep.equal( SUB_NL );
        } );

        it( 'uses an abbreviated hint or default [number] if page has no label', () => {
            const form = loadForm( 'pages-nolabel.xml' );
            form.view.$.append( '<ol class="pages-toc__list"/>' );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( [ ...toc.querySelectorAll( 'li' ) ].map( li => li.textContent ) )
                .to.deep.equal( [ 'hint5678901234567890...', '[2]' ] );

        } );

        it( 'builds a ToC with group as ToC item', () => {
            const form = loadForm( 'groups-pages.xml' );
            form.view.html.after( document.createRange().createContextualFragment(
                `<ul class="pages-toc__list"/>`
            ) );
            form.init();
            const toc = form.pages.$toc[ 0 ];

            expect( toc ).not.to.equal( null );
            expect( toc.textContent ).to.equal( 'agroup onebcdegroup threefgthree-twohi' );

        } );

    } );
} );
