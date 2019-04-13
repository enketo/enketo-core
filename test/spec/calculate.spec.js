import loadForm from '../helpers/load-form';
import dialog from '../../src/js/fake-dialog';
import events from '../../src/js/event';

describe( 'calculate functionality', () => {

    beforeAll( () => {
        dialog.confirm = () => Promise.resolve( true );
    } );

    it( 'updates inside multiple repeats when repeats become relevant', () => {
        const form = loadForm( 'repeat-relevant-calculate.xml' );
        form.init();

        // This triggers a form.calc.update with this object: { relevantPath: '/data/rg' };
        form.view.$.find( '[name="/data/yn"]' ).prop( 'checked', true ).trigger( 'change' );

        expect( form.model.node( '/data/rg/row' ).getElements().map( node => node.textContent ).join( ',' ) ).toEqual( '1,2,3' );
        expect( form.view.$.find( '[name="/data/rg/row"]' )[ 0 ].value ).toEqual( '1' );
        expect( form.view.$.find( '[name="/data/rg/row"]' )[ 1 ].value ).toEqual( '2' );
        expect( form.view.$.find( '[name="/data/rg/row"]' )[ 2 ].value ).toEqual( '3' );
    } );

    it( 'updates inside multiple repeats a repeat is removed and position(..) changes', ( done ) => {
        const form = loadForm( 'repeat-relevant-calculate.xml' );
        form.init();

        form.view.$.find( '[name="/data/yn"]' ).prop( 'checked', true ).trigger( 'change' );

        // remove first repeat to the calculation in both remaining repeats needs to be updated.
        form.view.html.querySelector( '.btn.remove' ).click();

        setTimeout( () => {
            expect( form.model.node( '/data/rg/row' ).getElements().map( node => node.textContent ).join( ',' ) ).toEqual( '1,2' );
            expect( form.view.$.find( '[name="/data/rg/row"]' )[ 0 ].value ).toEqual( '1' );
            expect( form.view.$.find( '[name="/data/rg/row"]' )[ 1 ].value ).toEqual( '2' );
            done();
        }, 650 );

    } );

    it( 'updates a calculation for node if calc refers to node filtered with predicate', () => {
        const form = loadForm( 'count-repeated-nodes.xml' );
        form.init();

        const text1 = form.view.html.querySelector( 'textarea[name="/repeat-group-comparison/REP/text1"]' );

        text1.value = ' yes ';
        text1.dispatchEvent( events.Change() );

        expect( form.view.html.querySelector( 'input[name="/repeat-group-comparison/count2"]' ).value ).toEqual( '1' );

    } );
} );
