import loadForm from '../helpers/load-form';
import $ from 'jquery';
import forms from '../mock/forms';
import event from '../../src/js/event';
import dialog from '../../src/js/fake-dialog';

describe( 'repeat functionality', () => {

    //turn jQuery animations off
    $.fx.off = true;

    describe( 'cloning', () => {
        beforeEach( () => {
            dialog.confirm = () => Promise.resolve( true );
        } );

        it( 'removes the correct instance and HTML node when the "-" button is clicked (issue 170)', ( done ) => {
            const form = loadForm( 'thedata.xml' );
            form.init();
            const repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]';
            const nodePath = '/thedata/repeatGroup/nodeC';
            const nodeSelector = `input[name="${nodePath}"]`;
            const index = 2;

            expect( form.view.html.querySelectorAll( repeatSelector ).length ).toEqual( 3 );
            expect( form.view.html.querySelectorAll( repeatSelector )[ index ].querySelector( 'button.remove' ) ).not.toEqual( null );
            expect( form.view.html.querySelectorAll( nodeSelector )[ index ].value ).toEqual( 'c3' );
            expect( form.model.node( nodePath, index ).getVal() ).toEqual( 'c3' );

            form.view.html.querySelectorAll( repeatSelector )[ index ].querySelector( 'button.remove' ).click();
            setTimeout( () => {
                expect( form.model.node( nodePath, index ).getVal() ).toEqual( undefined );
                //check if it removed the correct data node
                expect( form.model.node( nodePath, index - 1 ).getVal() ).toEqual( 'c2' );
                //check if it removed the correct html node
                expect( form.view.html.querySelectorAll( repeatSelector ).length ).toEqual( 2 );
                expect( form.view.html.querySelectorAll( nodeSelector )[ index - 1 ].value ).toEqual( 'c2' );
                done();
            }, 10 );

        } );

        it( 'marks cloned invalid fields as valid', () => {
            const form = loadForm( 'thedata.xml' );
            form.init();
            const repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]';
            const repeatButton = '.add-repeat-btn';
            const nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]';
            const node3 = form.view.html.querySelectorAll( nodeSelector )[ 2 ];

            form.setInvalid( node3 );

            expect( form.view.html.querySelectorAll( repeatSelector ).length ).toEqual( 3 );
            expect( node3.parentElement.classList.contains( 'invalid-constraint' ) ).toBe( true );
            expect( form.view.html.querySelectorAll( nodeSelector )[ 3 ] ).toEqual( undefined );

            form.view.html.querySelector( repeatButton ).click();

            const node4 = form.view.html.querySelectorAll( nodeSelector )[ 3 ];
            expect( form.view.html.querySelectorAll( repeatSelector ).length ).toEqual( 4 );
            expect( node4 ).not.toEqual( undefined );
            expect( node4.parentElement.classList.contains( 'invalid-constraint' ) ).toBe( false );
        } );

        it( 'populates default values in new clone', () => {
            const form = loadForm( 'repeat-default.xml' );
            form.init();
            const repeatButton = form.view.html.querySelector( '.add-repeat-btn' );
            repeatButton.click();
            repeatButton.click();
            expect( [ ...form.view.html.querySelectorAll( '[name="/repdef/rep/num"]' ) ].map( i => i.value ) ).toEqual( [ '5', '5', '5' ] );
        } );
    } );

    describe( 'fixes unique ids in cloned repeats', () => {
        // Avoiding problems in the autocomplete widget, https://github.com/enketo/enketo-core/issues/521
        it( 'ensures uniqueness of datalist ids, so cascading selects inside repeats work', () => {
            const form = loadForm( 'repeat-autocomplete.xml' );
            form.init();
            form.view.html.querySelector( '.add-repeat-btn' ).click();
            const id1 = form.view.html.querySelectorAll( '.or-repeat' )[ 0 ].querySelector( 'datalist' ).id;
            const id2 = form.view.html.querySelectorAll( '.or-repeat' )[ 1 ].querySelector( 'datalist' ).id;
            const list1 = form.view.html.querySelectorAll( '.or-repeat' )[ 0 ].querySelector( 'input[list]' ).getAttribute( 'list' );
            const list2 = form.view.html.querySelectorAll( '.or-repeat' )[ 1 ].querySelector( 'input[list]' ).getAttribute( 'list' );
            expect( id1 ).toEqual( list1 );
            expect( id2 ).toEqual( list2 );
            expect( id1 ).not.toEqual( id2 );
            expect( list1 ).not.toEqual( list2 );
        } );
    } );

    it( 'clones a repeat view element on load when repeat has dot in nodeName and has multiple instances in XForm', () => {
        const form = loadForm( 'repeat-dot.xml' );
        form.init();
        expect( form.view.html.querySelectorAll( 'input[name="/repeat-dot/rep.dot/a"]' ).length ).toEqual( 2 );
    } );

    it( 'clones nested repeats if they are present in the instance upon initialization (issue #359) ', () => {
        //note that this form contains multiple repeats in the instance
        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const _1stLevelTargetRepeat = form.view.html.querySelectorAll( '.or-repeat[name="/nested_repeats/kids/kids_details"]' );
        const _2ndLevelTargetRepeats1 = _1stLevelTargetRepeat[ 0 ].querySelectorAll( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        const _2ndLevelTargetRepeats2 = _1stLevelTargetRepeat[ 1 ].querySelectorAll( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        expect( _1stLevelTargetRepeat.length ).toEqual( 2 );
        expect( _2ndLevelTargetRepeats1.length ).toEqual( 2 );
        expect( _2ndLevelTargetRepeats2.length ).toEqual( 3 );
    } );

    //https://github.com/kobotoolbox/enketo-express/issues/754
    it( 'shows the correct number of nested repeats in the view if a record is loaded', () => {
        const instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        const form = loadForm( 'nested-repeats-nasty.xml', instanceStr );
        form.init();

        expect( form.view.html.querySelectorAll( a ).length ).toEqual( 2 );
        expect( form.view.html.querySelectorAll( a )[ 0 ].querySelectorAll( b ).length ).toEqual( 2 );
        expect( form.view.html.querySelectorAll( a )[ 1 ].querySelectorAll( b ).length ).toEqual( 3 );
    } );

    it( 'ignores the "minimal" appearance when an existing record is loaded (almost same as previous test)', () => {
        const instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( 'class="or-repeat ', 'class="or-repeat or-appearance-minimal ' );
        const form = loadForm( 'nested-repeats-nastier', instanceStr );
        form.init();

        expect( form.view.html.querySelectorAll( a ).length ).toEqual( 2 );
        expect( form.view.html.querySelector( a ).classList.contains( 'or-appearance-minimal' ) ).toEqual( true );
        expect( form.view.html.querySelectorAll( a )[ 0 ].querySelectorAll( b ).length ).toEqual( 2 );
        expect( form.view.html.querySelectorAll( a )[ 1 ].querySelectorAll( b ).length ).toEqual( 3 );
    } );

    it( 'uses the "minimal" appearance for an empty form to create 0 repeats', () => {
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( 'class="or-repeat ', 'class="or-repeat or-appearance-minimal ' );
        const form = loadForm( 'nested-repeats-nastier' );
        form.init();

        expect( form.view.html.querySelectorAll( a ).length ).toEqual( 0 );
    } );

    it( 'In an empty form it creates the first repeat instance automatically (almost same as previous test)', () => {
        const form = loadForm( 'nested-repeats-nasty.xml' );
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form.init();

        expect( form.view.html.querySelectorAll( a ).length ).toEqual( 1 );
        expect( form.view.html.querySelector( a ).classList.contains( 'or-appearance-minimal' ) ).toEqual( false );
        expect( form.view.html.querySelectorAll( a )[ 0 ].querySelectorAll( b ).length ).toEqual( 1 );
    } );

    it( 'doesn\'t duplicate date widgets in a cloned repeat', () => {
        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const dates = [ ...form.view.html.querySelectorAll( '[name="/nested_repeats/kids/kids_details/immunization_info/date"]' ) ];

        expect( dates.length ).toEqual( 5 );
        // for some reason these widgets are not instantiated here
        const dateWidgets = [ ...form.view.html.querySelectorAll( '.widget.date' ) ];
        expect( dateWidgets.length ).toEqual( 5 );
    } );

    describe( 'ordinals are set for default repeat instances in the default model upon initialization', () => {
        /*
        var config = require( 'enketo/config' );
        var dflt = config.repeatOrdinals;
        beforeAll( function() {
            config.repeatOrdinals = true;
        } );

        afterAll( function() {
            config.repeatOrdinals = dflt;
        } );
        */
        // this test is only interested in the model, but adding ordinals to default repeat instances is directed
        // by Form.js
        // Very theoretical. Situation will never occur with OC.
        xit( 'initialize correctly with ordinals if more than one top-level repeat is included in model', () => {
            const f = loadForm( 'nested_repeats.xml' );
            f.init();
            const model = f.model;
            expect( model.getStr().replace( />\s+</g, '><' ) ).toContain(
                '<kids_details enk:last-used-ordinal="2" enk:ordinal="1"><kids_name>Tom</kids_name><kids_age>2</kids_age>' +
                '<immunization_info enk:last-used-ordinal="2" enk:ordinal="1"><vaccine>Polio</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="2"><vaccine>Rickets</vaccine><date/></immunization_info></kids_details>' +
                '<kids_details enk:ordinal="2"><kids_name>Dick</kids_name><kids_age>5</kids_age>' +
                '<immunization_info enk:last-used-ordinal="3" enk:ordinal="1"><vaccine>Malaria</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="2"><vaccine>Flu</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="3"><vaccine>Polio</vaccine><date/></immunization_info>' +
                '</kids_details>' );
        } );
    } );

    describe( 'supports repeat count', () => {
        it( 'to dynamically remove/add repeats', () => {
            const form = loadForm( 'repeat-count.xml' );
            const rep = '.or-repeat[name="/dynamic-repeat-count/rep"]';
            form.init();
            const cntEl = form.view.html.querySelector( '[name="/dynamic-repeat-count/count"]' );

            // check that repeat count is evaluated upon load for default values
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 2 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 2 );
            // increase
            cntEl.value = 10;
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 10 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 10 );
            // decrease
            cntEl.value = 5;
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 5 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 5 );
            // decrease too much
            cntEl.value = 0;
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 0 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 0 );
            // decrease way too much
            cntEl.value = -10;
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 0 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 0 );
            // go back up after reducing to 0
            cntEl.value = 5;
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 5 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 5 );
            // empty value should be considered as 0
            cntEl.value = '';
            cntEl.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( rep ).length ).toEqual( 0 );
            expect( form.model.xml.querySelectorAll( 'rep' ).length ).toEqual( 0 );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with relevant on group)', () => {
            // When repeat count is zero there is no context node to pass to evaluator.
            const form = loadForm( 'repeat-count-relevant.xml' );
            const errors = form.init();
            expect( errors.length ).toEqual( 0 );
            expect( form.view.html.querySelectorAll( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            expect( form.view.html.querySelector( '.or-group.or-branch[name="/data/rep"]' ).classList.contains( 'disabled' ) ).toBe( true );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with output in group label)', () => {
            // When repeat count is zero there is no context node to pass to evaluator.
            const f = loadForm( 'repeat-count-relevant.xml' );
            const errors = f.init();
            expect( errors.length ).toEqual( 0 );
            expect( f.view.html.querySelectorAll( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            f.view.html.querySelector( 'input[name="/data/q1"]' ).value = 2;
            f.view.html.querySelector( 'input[name="/data/q1"]' ).dispatchEvent( event.Change() );
            expect( [ ...f.view.html.querySelectorAll( '.or-group.or-branch[name="/data/rep"]>h4 .or-output' ) ].map( i => i.textContent ).join( '' ) ).toEqual( '2' );
        } );

        it( 'and correctly deals with nested repeats that have a repeat count', () => {
            const form = loadForm( 'repeat-count-nested-2.xml' );
            const a = '.or-repeat[name="/data/repeat_A"]';
            const b = '.or-repeat[name="/data/repeat_A/repeat_B"]';
            form.init();

            const school = form.view.html.querySelectorAll( '[name="/data/repeat_A/schools"]' )[ 1 ];
            school.value = '2';
            school.dispatchEvent( event.Change() );

            expect( form.view.html.querySelectorAll( a )[ 1 ].querySelectorAll( b ).length ).toEqual( 2 );
        } );

        it( 'and is able to use a relative repeat count path for top-level repeats', () => {
            const f = loadForm( 'repeat-count-relative.xml' );
            f.init();

            f.view.html.querySelector( 'input[name="/data/count"]' ).value = 4;
            f.view.html.querySelector( 'input[name="/data/count"]' ).dispatchEvent( event.Change() );

            expect( f.view.html.querySelectorAll( '.or-repeat' ).length ).toEqual( 8 ); //4+4
        } );

        it( 'and is able to use a relative repeat count path for nested repeats', () => {
            const f = loadForm( 'repeat-count-relative-nested.xml' );
            f.init();

            expect( f.view.html.querySelectorAll( '.or-repeat[name="/data/rep1"]' ).length ).toEqual( 2 );

            const count1 = f.view.html.querySelectorAll( 'input[name="/data/rep1/txt"]' )[ 0 ];
            count1.value = 6;
            count1.dispatchEvent( event.Change() );

            const count2 = f.view.html.querySelectorAll( 'input[name="/data/rep1/txt"]' )[ 1 ];
            count2.value = 1;
            count2.dispatchEvent( event.Change() );

            expect( f.view.html.querySelectorAll( '.or-repeat[name="/data/rep1/rep2"]' ).length ).toEqual( 7 ); //6+1
        } );

    } );


    describe( 'creates 0 repeats', () => {

        it( ' if a record is loaded with 0 repeats (simple)', () => {
            const repeat = '.or-repeat[name="/repeat-required/rep"]';
            const form = loadForm( 'repeat-required.xml', '<repeat-required><d>b</d><meta><instanceID>a</instanceID></meta></repeat-required>' );
            form.init();
            expect( form.view.html.querySelectorAll( repeat ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (simple)', () => {
            const repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            const repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            const form = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            form.init();
            expect( form.view.html.querySelectorAll( repeat1 ).length ).toEqual( 1 );
            expect( form.view.html.querySelectorAll( repeat2 ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (advanced)', () => {
            const repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            const repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            const form = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name><Camp><P_Camps/></Camp></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            form.init();
            expect( form.view.html.querySelectorAll( repeat1 ).length ).toEqual( 2 );
            expect( form.view.html.querySelectorAll( repeat1 )[ 0 ].querySelectorAll( repeat2 ).length ).toEqual( 0 );
            expect( form.view.html.querySelectorAll( repeat1 )[ 1 ].querySelectorAll( repeat2 ).length ).toEqual( 1 );
        } );

        // This is a VERY special case, because the form contains a template as well as multiple repeat instances
        xit( ' if a record is loaded with 0 repeats (very advanced)', () => {
            const repeat = '.or-repeat[name="/repeat-dot/rep.dot"]';
            const f = loadForm( 'repeat-dot.xml', '<repeat-dot><meta><instanceID>a</instanceID></meta></repeat-dot>' );
            f.init();
            expect( f.view.html.querySelectorAll( repeat ).length ).toEqual( 0 );
        } );
    } );

    describe( 'initializes date widgets', () => {

        it( 'in a new repeat instance if the date widget is not relevant by default', () => {
            const form = loadForm( 'repeat-irrelevant-date.xml' );
            form.init();
            form.view.html.querySelector( '.add-repeat-btn' ).click();
            // make date field in second repeat relevant
            const el = form.view.html.querySelectorAll( '[name="/repeat/rep/a"]' )[ 1 ];
            el.value = 'a';
            el.dispatchEvent( event.Change() );
            expect( form.view.html.querySelectorAll( '[name="/repeat/rep/b"]' )[ 1 ].closest( '.question' ).querySelectorAll( '.widget' ).length ).toEqual( 1 );
        } );

    } );

    describe( 'getIndex() function', () => {

        const form = loadForm( 'nested_repeats.xml' );
        form.init();
        const repeats = form.view.html.querySelectorAll( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );

        [ 0, 1, 2, 3, 4 ].forEach( index => {
            it( 'works with nested repeats to get the index of a nested repeat in respect to the whole form', () => {
                expect( form.repeats.getIndex( repeats[ index ] ) ).toEqual( index );
            } );
        } );

    } );

    describe( 'repeats with repeat-count and only calculations', () => {

        const form = loadForm( 'repeat-count-calc-only.xml' );
        const errors = form.init();
        it( 'loads without errors', () => {
            expect( errors ).toEqual( [] );
        } );

    } );

    describe( 'radiobuttons', () => {

        it( 'inside each repeat instance have different name attributes', () => {
            const form = loadForm( 'repeat-radio.xml' );
            const rep = '.or-repeat[name="/data/rep"]';
            const radio = '[data-name="/data/rep/num"]';

            form.init();
            form.view.html.querySelector( '.add-repeat-btn' ).click();

            const repeats = form.view.html.querySelectorAll( rep );
            expect( repeats.length ).toEqual( 2 );

            const names1 = [ ...repeats[ 0 ].querySelectorAll( radio ) ].map( el => el.name );
            const names2 = [ ...repeats[ 1 ].querySelectorAll( radio ) ].map( el => el.name );

            expect( names1.length ).toEqual( 2 );
            expect( names1[ 0 ] ).not.toEqual( undefined );
            expect( names1[ 0 ] ).toEqual( names1[ 1 ] );

            expect( names2.length ).toEqual( 2 );
            expect( names2[ 0 ] ).not.toEqual( undefined );
            expect( names2[ 0 ] ).toEqual( names2[ 1 ] );

            expect( names1[ 0 ] ).not.toEqual( names2[ 0 ] );

        } );

    } );

    describe( 'calculated items inside repeats', () => {

        it( 'are cached correctly', () => {
            const form = loadForm( 'repeat-relevant-calculate-single.xml' );
            form.init();
            // Issue where a calculation inside a repeat is cached before the repeats are initialized (which removes the first repeat, before adding it)
            // This results in two cached calculations (for the same node) of which one no longer exists.
            expect( form.getRelatedNodes( 'data-calculate' ).length ).toEqual( 1 );
        } );
    } );

} );
