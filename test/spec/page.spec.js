'use strict';
var loadForm = require( '../helpers/loadForm' );

describe( 'Pages mode', function() {

    describe( 'Initial loading if form includes repeats-as-page', function() {

        it( 'loads to the proper first page', function() {
            var form = loadForm( 'pages.xml' );
            form.init();

            expect( form.pages.$current[ 0 ] ).toEqual( form.view.html.querySelector( '.question' ) );
        } );

    } );

    describe( 'ToC generation', function() {

        const ALL_EN = [ 'Note', 'Trigger', 'Text abc', 'Int abc', 'Int def', 'Group fl label', 'Range abc', 'Range ccc', 'Repeat Group label', 'Last' ];
        const ALL_NL = [ 'Noot', 'Trekker', 'Tekst abc', 'Int abc', 'Int def', 'Groep fl label', 'Reeks abc', 'Reeks ccc', 'Herhaal Groep label', 'Laatste' ];
        const SUB_EN = [ 'Trigger', 'Int abc', 'Range abc' ];
        const SUB_NL = [ 'Trekker', 'Int abc', 'Reeks abc' ];

        it( 'does nothing if there is no container for the ToC in the DOM', function() {
            var form = loadForm( 'pages.xml' );
            form.init();
            var $toc = form.pages.$toc;

            expect( $toc.length ).toEqual( 0 );
        } );

        it( 'builds a ToC using the first visible label on each page', function() {
            var form = loadForm( 'pages.xml' );
            form.view.$.append( '<ol class="page-toc"/>' );
            form.init();
            var $toc = form.pages.$toc;

            expect( $toc.length ).toEqual( 1 );
            expect( $toc.find( 'li' ).length ).toEqual( 10 );
            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( ALL_EN );
        } );

        it( 'updates a ToC when page relevancy changes', function() {
            var form = loadForm( 'pages.xml' );
            form.view.$.append( '<ol class="page-toc"/>' );
            form.init();
            var $toc = form.pages.$toc;

            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( ALL_EN );

            // Now make a bunch of pages irrelevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( SUB_EN );
        } );

        it( 'updates a ToC when the language changes', function() {
            var form = loadForm( 'pages.xml' );
            form.view.$.append( '<ol class="page-toc"/>' );
            form.init();
            var $toc = form.pages.$toc;

            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( ALL_EN );

            // Switch language
            var langSelector = form.view.html.parentNode.querySelector( '#form-languages' );
            langSelector.value = 'nl';
            langSelector.dispatchEvent( new Event( 'change' ) );

            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( ALL_NL );

            // Now make a bunch of pages irrelevant
            form.view.$.find( '[name="/pages/tr"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $toc.find( 'li' ).get().map( li => li.textContent ) )
                .toEqual( SUB_NL );
        } );

    } );

} );
