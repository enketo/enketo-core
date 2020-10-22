import $ from 'jquery';
import loadForm from '../helpers/load-form';
import events from '../../src/js/event';
import { isStaticItemsetFromSecondaryInstance } from '../../src/js/itemset';

describe( 'Itemset functionality', () => {
    let form;

    describe( 'in a cascading multi-select after an itemset update', () => {
        let $items1;
        let $items2;
        const items1 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crops"]';
        const items2 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crop"]';

        beforeEach( () => {
            form = loadForm( 'select-from-selected.xml' );
            form.init();
            $items1 = () => form.view.$.find( items1 );
            $items2 = () => form.view.$.find( items2 );
        } );

        it( 'retains (checks) any current values that are still valid values', () => {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $items2().length ).toEqual( 2 );
            expect( $items2().siblings().text() ).toEqual( 'BananaCacao' );
            // check model
            expect( form.model.xml.querySelector( 'crops' ).textContent ).toEqual( 'banana cacao' );
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( '' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // check model
            expect( form.model.xml.querySelector( 'crops' ).textContent ).toEqual( 'banana cacao' );
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( 'banana cacao' );
            // select an additional item in itemset 1
            $items1().filter( '[value="maize"]' ).prop( 'checked', true ).trigger( 'change' );
            // check that the new item was added to itemset 2
            expect( $items2().length ).toEqual( 3 );
            expect( $items2().siblings().text() ).toEqual( 'BananaCacaoMaize' );
            // check that the first two items of itemset 2 are still selected
            expect( $items2().filter( '[value="banana"]' ).prop( 'checked' ) ).toEqual( true );
            expect( $items2().filter( '[value="cacao"]' ).prop( 'checked' ) ).toEqual( true );
            // check that the new item is unselected
            expect( $items2().filter( '[value="maize"]' ).prop( 'checked' ) ).toEqual( false );
            // check model
            expect( form.model.xml.querySelector( 'crops' ).textContent ).toEqual( 'banana cacao maize' );
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( 'banana cacao' );
        } );

        it( 'removes (unchecks) any current values that are no longer valid values', () => {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( 'banana cacao' );
            // add a third non-existing item to model for itemset 2
            form.model.xml.querySelector( 'crop' ).textContent = 'banana fake cacao';
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( 'banana fake cacao' );
            // select an additional item in itemset 1, to trigger update of itemset 2
            $items1().filter( '[value="maize"]' ).prop( 'checked', true ).trigger( 'change' );
            // check that the new item was added to itemset 2
            expect( $items2().siblings().text() ).toEqual( 'BananaCacaoMaize' );
            // check that the first two items of itemset 2 are still selected
            expect( $items2().filter( '[value="banana"]' ).prop( 'checked' ) ).toEqual( true );
            expect( $items2().filter( '[value="cacao"]' ).prop( 'checked' ) ).toEqual( true );
            // check model to see that the fake value was removed
            expect( form.model.xml.querySelector( 'crop' ).textContent ).toEqual( 'banana cacao' );
        } );
    } );

    describe( 'in a cascading select using itext for all labels', () => {
        let $items1Radio;
        let $items2Radio;
        let $items3Radio;
        let $items1Select;
        let $items2Select;
        let $items3Select;
        const sel1Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/country"]';
        const sel2Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/city"]';
        const sel3Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/neighborhood"]';
        const sel1Select = 'select[name="/new_cascading_selections/group2/country2"]';
        const sel2Select = 'select[name="/new_cascading_selections/group2/city2"]';
        const sel3Select = 'select[name="/new_cascading_selections/group2/neighborhood2"]';

        beforeEach( () => {
            form = loadForm( 'new_cascading_selections.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = () => form.view.$.find( sel1Radio );
            $items2Radio = () => form.view.$.find( sel2Radio );
            $items3Radio = () => form.view.$.find( sel3Radio );
            $items1Select = () => form.view.$.find( `${sel1Select} > option:not(.itemset-template)` );
            $items2Select = () => form.view.$.find( `${sel2Select} > option:not(.itemset-template)` );
            $items3Select = () => form.view.$.find( `${sel3Select} > option:not(.itemset-template)` );
        } );

        it( 'level 1: with <input type="radio"> elements has the expected amount of options', () => {
            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items1Radio().siblings().text() ).toEqual( 'NederlandThe NetherlandsVerenigde StatenUnited States' );
            expect( $items2Radio().length ).toEqual( 0 );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 2: with <input type="radio"> elements has the expected amount of options', () => {
            //select first option in cascade
            form.view.$.find( `${sel1Radio}[value="nl"]` ).prop( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'country' ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'AmsterdamAmsterdamRotterdamRotterdamDrontenDronten' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 3: with <input type="radio"> elements has the expected amount of options', () => {
            //select first option
            form.view.$.find( `${sel1Radio}[value="nl"]` ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'country' ) ).toEqual( true );

            //select second option
            form.view.$.find( `${sel2Radio}[value="ams"]` ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'city' ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'WesterparkWesterparkDe DamDam' );

            //select other first option to change itemset
            form.view.$.find( `${sel1Radio}[value="nl"]` ).attr( 'checked', false );
            form.view.$.find( `${sel1Radio}[value="usa"]` ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'city' ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'DenverDenverNieuw AmsterdamNew York CityDe EngelenLos Angeles' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 1: with <select> <option> elements has the expected amount of options', () => {
            expect( $items1Select().length ).toEqual( 2 );
            expect( $items1Select().eq( 0 ).attr( 'value' ) ).toEqual( 'nl' );
            expect( $items1Select().eq( 1 ).attr( 'value' ) ).toEqual( 'usa' );
            expect( $items2Select().length ).toEqual( 0 );
        } );

        it( 'level 2: with <select> <option> elements has the expected amount of options', () => {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'country2' ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'dro' );
            expect( $items3Select().length ).toEqual( 0 );
        } );

        it( 'level 3: with <select> <option> elements has the expected amount of options', () => {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'country2' ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Select ).val( 'ams' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'city2' ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items3Select().length ).toEqual( 2 );
            expect( $items3Select().eq( 0 ).attr( 'value' ) ).toEqual( 'wes' );
            expect( $items3Select().eq( 1 ).attr( 'value' ) ).toEqual( 'dam' );

            //select other first option to change itemset
            form.view.$.find( sel1Select ).val( 'usa' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'city2' ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'la' );
            expect( $items3Select().length ).toEqual( 0 );
        } );
    } );

    describe( 'in a cascading select that includes labels without itext', () => {
        let $items1Radio;
        let $items2Radio;
        let $items3Radio;
        const sel1Radio = ':not(.itemset-template) > input:radio[data-name="/form/state"]';
        const sel2Radio = ':not(.itemset-template) > input:radio[data-name="/form/county"]';
        const sel3Radio = ':not(.itemset-template) > input:radio[data-name="/form/city"]';

        beforeEach( () => {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'cascading_mixture_itext_noitext.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = () => form.view.$.find( sel1Radio );
            $items2Radio = () => form.view.$.find( sel2Radio );
            $items3Radio = () => form.view.$.find( sel3Radio );
        } );

        it( 'level 3: with <input type="radio"> elements using direct references to instance labels without itext has the expected amount of options', () => {
            //select first option
            form.view.$.find( `${sel1Radio}[value="washington"]` )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'state' ) ).toEqual( true );

            //select second option
            form.view.$.find( `${sel2Radio}[value="king"]` )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( node => node === 'county' ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'SeattleRedmond' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies inside repeat, ', () => {
        const countrySelector = '[data-name="/new_cascading_selections_inside_repeats/group1/country"]';
        const citySelector = 'label:not(.itemset-template) [data-name="/new_cascading_selections_inside_repeats/group1/city"]';
        let form;
        let $masterRepeat;
        let $clonedRepeat;

        beforeEach( () => {
            form = loadForm( 'new_cascading_selections_inside_repeats.xml' );
            form.init();
            $masterRepeat = form.view.$.find( '.or-repeat' );
            //select usa in master repeat
            $masterRepeat.find( `${countrySelector}[value="usa"]` ).prop( 'checked', true ).trigger( 'change' );
            //add repeat
            form.view.$.find( '.add-repeat-btn' ).click();
            $clonedRepeat = form.view.$.find( '.or-repeat.clone' );
        } );

        it( 'the itemset of the cloned repeat is correct (and not a cloned copy of the master repeat)', () => {
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( `${countrySelector}:selected` ).val() ).toBeUndefined();
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 0 );
        } );

        it( 'the itemset of the master repeat is not affected if the cloned repeat is changed', () => {
            $clonedRepeat.find( `${countrySelector}[value="nl"]` ).prop( 'checked', true ).trigger( 'change' );
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $masterRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', () => {
        it( 'initializes the itemset', () => {
            const form = loadForm( 'nested-repeats-itemset.xml' );
            const selector = '[name="/bug747/name_of_region/name_of_zone/zone"]';
            form.init();
            form.view.$.find( '[data-name="/bug747/name_of_region/region"][value="tigray"]' ).prop( 'checked', true ).trigger( 'change' );
            form.view.$.find( '.or-repeat-info[data-name="/bug747/name_of_region/name_of_zone"] .add-repeat-btn' ).click();
            expect( form.view.$.find( selector ).eq( 0 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
            expect( form.view.$.find( selector ).eq( 1 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
        } );
    } );

    describe( ' in a cloned repeat with a predicate including current()/../', () => {
        it( 'works', () => {
            // This test is added to show that once the makeBugCompliant function has been removed
            // itemsets with relative predicates still work.
            const form = loadForm( 'reprelcur1.xml' );
            form.init();
            form.view.$.find( '[data-name="/repeat-relative-current/rep/crop"][value="banana"]' ).prop( 'checked', true ).trigger( 'change' );
            form.view.$.find( '.add-repeat-btn' ).click();
            form.view.$.find( '[data-name="/repeat-relative-current/rep/crop"][value="beans"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );
            const sel1 = 'label:not(.itemset-template) > input[data-name="/repeat-relative-current/rep/sel_a"]';
            const sel2 = 'label:not(.itemset-template) > input[data-name="/repeat-relative-current/rep/group/sel_b"]';
            expect( form.view.$.find( sel1 ).eq( 0 ).val() ).toEqual( 'banana' );
            expect( form.view.$.find( sel2 ).eq( 0 ).val() ).toEqual( 'banana' );
            expect( form.view.$.find( sel1 ).eq( 1 ).val() ).toEqual( 'beans' );
            expect( form.view.$.find( sel2 ).eq( 1 ).val() ).toEqual( 'beans' );
        } );
    } );

    describe( 'with a rank widget', () => {
        it( 'works', () => {
            const form = loadForm( 'rank.xml' );
            form.init();
            const $s1 = form.view.$.find( 'input[name="/rank/s1"]' );
            const $r1 = form.view.$.find( 'input.rank[name="/rank/r1"]' );
            $r1.next( '.widget' ).click();

            expect( $r1.val() ).toEqual( 'banana beans cacao coffee foddergrass foddertree' );

            $s1.val( 'c' ).trigger( 'change' );

            expect( $r1.val() ).toEqual( '' );
            expect( $r1.next( '.widget' ).find( 'label' ).text() ).toEqual( 'CacaoCoffee' );

            $r1.next( '.widget' ).click();

            expect( $r1.val() ).toEqual( 'cacao coffee' );
        } );
    } );

    describe( 'in a group that becomes relevant', () => {
        it( 'are re-evaluated', () => {
            const form = loadForm( 'itemset-relevant.xml' );
            form.init();
            const input = form.view.html.querySelector( '[name="/broken_repeat_example/organization"]' );
            input.value = '00001';
            input.dispatchEvent( events.Change() );
            const option1 = form.view.html.querySelector( '[name="/broken_repeat_example/m_gate"][value="yes"]' );
            option1.checked = true;
            option1.dispatchEvent( events.Change() );
            const option2 = form.view.html.querySelector( '[data-name="/broken_repeat_example/members/change_type"][value="correct"]' );
            option2.checked = true;
            option2.dispatchEvent( events.Change() );

            expect( form.view.html.querySelectorAll( '.or-repeat datalist > option' ).length ).toEqual( 3 );
        } );
    } );

    describe( 'in another group that becomes relevant (different from previous)', () => {
        it( 'are re-evaluated', () => {
            const form = loadForm( 'itemset-relevant-2.xml' );
            form.init();
            const input1 = form.view.html.querySelector( '[name="/data/start"]' );
            input1.value = 'A';
            input1.dispatchEvent( events.Change() );
            const input2 = form.view.html.querySelector( '[name="/data/proceed"]' );
            input2.checked = true;
            input2.dispatchEvent( events.Change() );
            const EXPECTED = [ 'AK', 'AL', 'AR', 'AZ' ];

            // group with relevant
            expect( [ ...form.view.html.querySelectorAll( '.option-wrapper label:not(.itemset-template) input[data-name="/data/grp1/one"]' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( '.option-wrapper label:not(.itemset-template) input[name="/data/grp1/two"]' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'select[name="/data/grp1/three"] option:not(.itemset-template)' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'select[name="/data/grp1/four"] option:not(.itemset-template)' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'input[name="/data/grp1/five"] ~ datalist option:not(.itemset-template)' ) ]
                .map( input => input.dataset.value ) ).toEqual( EXPECTED );

            // shared static autocomplete datalist in repeat
            expect( [ ...form.view.html.querySelectorAll( '.or-repeat-info datalist option:not(.itemset-template)' ) ]
                .map( input => input.dataset.value ) ).toEqual( [ 'AL' ] );

            // individual itemset question with relevants
            expect( [ ...form.view.html.querySelectorAll( '.option-wrapper label:not(.itemset-template) input[data-name="/data/grp2/seven"]' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( '.option-wrapper label:not(.itemset-template) input[name="/data/grp2/eight"]' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'select[name="/data/grp2/nine"] option:not(.itemset-template)' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'select[name="/data/grp2/ten"] option:not(.itemset-template)' ) ]
                .map( input => input.value ) ).toEqual( EXPECTED );
            expect( [ ...form.view.html.querySelectorAll( 'input[name="/data/grp2/eleven"] ~ datalist option:not(.itemset-template)' ) ]
                .map( input => input.dataset.value ) ).toEqual( EXPECTED );
        } );
    } );

    describe( 'in a group that becomes relevant, non-relevant, relevant', () => {
        it( 'are re-evaluated', () => {
            const form = loadForm( 'itemset-relevant.xml' );
            form.init();
            const input = form.view.html.querySelector( '[name="/broken_repeat_example/organization"]' );
            input.value = '00001';
            input.dispatchEvent( events.Change() );
            const option1 = form.view.html.querySelector( '[name="/broken_repeat_example/m_gate"][value="yes"]' );
            option1.checked = true;
            option1.dispatchEvent( events.Change() );
            const option2 = form.view.html.querySelector( '[data-name="/broken_repeat_example/members/change_type"][value="correct"]' );
            option2.checked = true;
            option2.dispatchEvent( events.Change() );

            // make autocomplete selection
            const auto = form.view.html.querySelector( '[name="/broken_repeat_example/members/member"]' );
            auto.value = '1';
            auto.dispatchEvent( events.Change() );

            // make non-relevant again
            const option3 = form.view.html.querySelector( '[name="/broken_repeat_example/m_gate"][value="no"]' );
            option3.checked = true;
            option3.dispatchEvent( events.Change() );
            // make relevant again
            option1.checked = true;
            option1.dispatchEvent( events.Change() );
            option2.checked = true;
            option2.dispatchEvent( events.Change() );



            expect( form.view.html.querySelectorAll( '.or-repeat datalist > option:not([value=""])' ).length ).toEqual( 2 );
        } );
    } );

    describe( 'has experimental support for lang attributes on secondary instances', () => {
        // As partially proposed here: https://github.com/opendatakit/xforms-spec/issues/88#issuecomment-284489005.
        // The use case is translation support for external data in itemsets (though it automatically works for internal secondary instances as well)
        // The reason for this test and experimental support is that this is used in Survey123.
        // If the proposal does not go anywhere, this could be moved to Survey123 somehow.
        it( 'translates labels defined with translate()', () => {
            const form = loadForm( 'secondary-lang.xml' );
            const loadErrors = form.init();
            const options = form.view.html.querySelectorAll( 'datalist>option:not(.itemset-template)' );

            expect( loadErrors.length ).toEqual( 0 );
            expect( options.length ).toEqual( 2 );
            expect( options[ 0 ].value ).toEqual( 'één' );
            expect( options[ 1 ].value ).toEqual( 'tweo' );
        } );

        it( 'shows external data labels in untranslated forms if those labels have a falsy lang attribute', () => {
            const form = loadForm( 'secondary-lang-form-nolang.xml' );
            const loadErrors = form.init();
            const options = form.view.html.querySelectorAll( '.option-label.active' );

            expect( loadErrors.length ).toEqual( 0 );
            expect( options.length ).toEqual( 2 );
            expect( options[ 0 ].textContent ).toEqual( 'one' );
            expect( options[ 1 ].textContent ).toEqual( 'two' );
        } );
    } );

    describe( 'show a warning if a multi-select value that loaded from external data has spaces', () => {
        const externalArr = [ {
            id: 'mydata',
            xml: new DOMParser().parseFromString(
                `   <root>
                        <item>
                            <label>11</label>
                            <group>a</group>
                            <name>1 1</name>
                        </item>
                        <item>
                            <label>22</label>
                            <group>a</group>
                            <name>22</name>
                        </item>
                        <item>
                            <label>33</label>
                            <group>b</group>
                            <name>33</name>
                        </item>
                        <item>
                            <label>44 (value has spaces!)</label>
                            <group>b</group>
                            <name>4 4</name>
                        </item>
                    </root>
                `, 'text/xml' )
        } ];

        let form, loadErrors;
        beforeEach( () => {
            form = loadForm( 'external-data-v2.xml', undefined, undefined, undefined, externalArr );
            loadErrors = form.init();
            spyOn( window, 'alert' );
        } );

        it( 'initializes form', () => {
            expect( loadErrors.length ).toEqual( 0 );
        } );

        it( 'select "a" option', () => {
            const option = form.view.html.querySelector( '[name="/external-data/grp"][value="a"]' );
            option.checked = true;
            option.dispatchEvent( events.Change() );
            expect( window.alert ).toHaveBeenCalledWith( 'Select multiple question has an illegal value "a a" that contains a space.<br>Select multiple question has an illegal value "1 1" that contains a space.<br>Select multiple question has an illegal value "1 1" that contains a space.' );
        } );

        it( 'select "b" option', () => {
            const option = form.view.html.querySelector( '[name="/external-data/grp"][value="b"]' );
            option.checked = true;
            option.dispatchEvent( events.Change() );
            expect( window.alert ).toHaveBeenCalledWith( 'Select multiple question has an illegal value "4 4" that contains a space.<br>Select multiple question has an illegal value "4 4" that contains a space.' );
        } );

    } );

    describe( 'analyzes whether XPath itemset expression is static external instance nodeset', () => {
        [
            [ '/path/to/node', false ],
            [ '/path/to/node[name=/path/to/another/node]', false ],
            [ ' instance( "something")/path/to/node[name=/path/to/another/node]', false ],
            [ ' instance( "something")/path/to/node ', true ],
            [ 'instance("countries")/root/item', true ],
            [ 'instance("countries")/root/item[43]', true ],
            [ 'instance("countries")/root/item[label=current()/../answer]', false ]
        ].forEach( test => {
            it( `correctly determines that ${test[0]} is ${test[1] === true ? '' : 'not '}dynamic`, () => {
                expect( isStaticItemsetFromSecondaryInstance( test[ 0 ] ) ).toEqual( test[ 1 ] );
            } );
        } );

    } );

} );
