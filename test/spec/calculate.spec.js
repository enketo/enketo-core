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

    it( 'does not calculate questions inside repeat instances created with repeat-count, if the repeat is not relevant', () => {
        const form = loadForm( 'repeat-count-calculate-irrelevant.xml' );
        form.init();

        const calcs = form.model.xml.querySelectorAll( 'SHD_NO' );

        expect( calcs.length ).toEqual( 3 );
        expect( calcs[ 0 ].textContent ).toEqual( '' );
        expect( calcs[ 1 ].textContent ).toEqual( '' );
        expect( calcs[ 2 ].textContent ).toEqual( '' );
    } );

    // This is important for OpenClinica, but also reduces unnecessary work. A calculation that runs upon form load and
    // doesn't change a default, or loaded, value doesn't have to populate the form control, as this will be done by setAllVals
    it( 'does not set the form control value if the calculation result does not change the value in the model', () => {
        const form = loadForm( 'calc-control.xml', '<data><calc>12</calc></data>' );

        let counter = 0;
        form.view.html.querySelector( '[name="/data/calc"]' ).addEventListener( new events.InputUpdate().type, () => counter++ );
        form.init();

        expect( counter ).toEqual( 0 );
    } );

    // https://github.com/OpenClinica/enketo-express-oc/issues/404#issuecomment-744743172
    // Checks whether different types of calculations are handled consistently when they become non-relevant
    it( 'consistently leaves calculated values if they become non-relevant', () => {
        const form = loadForm( 'relevant-calcs.xml' );
        form.init();
        const grp = form.model.xml.querySelector( 'grp' );

        expect( grp.textContent.replace( /\s/g, '' ) ).toEqual( '' );

        const a = form.view.html.querySelector( 'input[name="/data/a"]' );
        a.value = 'a';
        a.dispatchEvent( events.Change() );

        expect( grp.textContent.replace( /\s/g, '' ) ).toEqual( 'onetwothreefour' );

        a.value = 'a';
        a.dispatchEvent( events.Change() );

        expect( grp.textContent.replace( /\s/g, '' ) ).toEqual( 'onetwothreefour' );
    } );

} );
