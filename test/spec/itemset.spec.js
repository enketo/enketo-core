/* global spyOn */
var $ = require( 'jquery' );
var loadForm = require( '../helpers/loadForm' );

describe( 'Itemset functionality', function() {
    var form;

    describe( 'in a cascading multi-select after an itemset update', function() {
        var $items1;
        var $items2;
        var items1 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crops"]';
        var items2 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crop"]';

        beforeEach( function() {
            form = loadForm( 'select-from-selected.xml' );
            form.init();
            $items1 = function() {
                return form.view.$.find( items1 );
            };
            $items2 = function() {
                return form.view.$.find( items2 );
            };
        } );

        it( 'retains (checks) any current values that are still valid values', function() {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $items2().length ).toEqual( 2 );
            expect( $items2().siblings().text() ).toEqual( 'BananaCacao' );
            // check model
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( '' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // check model
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
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
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao maize' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
        } );

        it( 'removes (unchecks) any current values that are no longer valid values', function() {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
            // add a third non-existing item to model for itemset 2
            form.model.$.find( 'crop' ).text( 'banana fake cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana fake cacao' );
            // select an additional item in itemset 1, to trigger update of itemset 2
            $items1().filter( '[value="maize"]' ).prop( 'checked', true ).trigger( 'change' );
            // check that the new item was added to itemset 2
            expect( $items2().siblings().text() ).toEqual( 'BananaCacaoMaize' );
            // check that the first two items of itemset 2 are still selected
            expect( $items2().filter( '[value="banana"]' ).prop( 'checked' ) ).toEqual( true );
            expect( $items2().filter( '[value="cacao"]' ).prop( 'checked' ) ).toEqual( true );
            // check model to see that the fake value was removed
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
        } );
    } );

    describe( 'in a cascading select using itext for all labels', function() {
        var $items1Radio, $items2Radio, $items3Radio, $items1Select, $items2Select, $items3Select,
            sel1Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/country"]',
            sel2Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/city"]',
            sel3Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/neighborhood"]',
            sel1Select = 'select[name="/new_cascading_selections/group2/country2"]',
            sel2Select = 'select[name="/new_cascading_selections/group2/city2"]',
            sel3Select = 'select[name="/new_cascading_selections/group2/neighborhood2"]';

        beforeEach( function() {
            form = loadForm( 'new_cascading_selections.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = function() {
                return form.view.$.find( sel1Radio );
            };
            $items2Radio = function() {
                return form.view.$.find( sel2Radio );
            };
            $items3Radio = function() {
                return form.view.$.find( sel3Radio );
            };
            $items1Select = function() {
                return form.view.$.find( sel1Select + ' > option:not(.itemset-template)' );
            };
            $items2Select = function() {
                return form.view.$.find( sel2Select + ' > option:not(.itemset-template)' );
            };
            $items3Select = function() {
                return form.view.$.find( sel3Select + ' > option:not(.itemset-template)' );
            };
        } );

        it( 'level 1: with <input type="radio"> elements has the expected amount of options', function() {
            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items1Radio().siblings().text() ).toEqual( 'NederlandThe NetherlandsVerenigde StatenUnited States' );
            expect( $items2Radio().length ).toEqual( 0 );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 2: with <input type="radio"> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Radio + '[value="nl"]' ).prop( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'AmsterdamAmsterdamRotterdamRotterdamDrontenDronten' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 3: with <input type="radio"> elements has the expected amount of options', function() {
            //select first option
            form.view.$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Radio + '[value="ams"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'WesterparkWesterparkDe DamDam' );

            //select other first option to change itemset
            form.view.$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', false );
            form.view.$.find( sel1Radio + '[value="usa"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'DenverDenverNieuw AmsterdamNew York CityDe EngelenLos Angeles' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 1: with <select> <option> elements has the expected amount of options', function() {
            expect( $items1Select().length ).toEqual( 2 );
            expect( $items1Select().eq( 0 ).attr( 'value' ) ).toEqual( 'nl' );
            expect( $items1Select().eq( 1 ).attr( 'value' ) ).toEqual( 'usa' );
            expect( $items2Select().length ).toEqual( 0 );
        } );

        it( 'level 2: with <select> <option> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'dro' );
            expect( $items3Select().length ).toEqual( 0 );
        } );

        it( 'level 3: with <select> <option> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country2';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Select ).val( 'ams' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items3Select().length ).toEqual( 2 );
            expect( $items3Select().eq( 0 ).attr( 'value' ) ).toEqual( 'wes' );
            expect( $items3Select().eq( 1 ).attr( 'value' ) ).toEqual( 'dam' );

            //select other first option to change itemset
            form.view.$.find( sel1Select ).val( 'usa' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'la' );
            expect( $items3Select().length ).toEqual( 0 );
        } );
    } );

    describe( 'in a cascading select that includes labels without itext', function() {
        var $items1Radio, $items2Radio, $items3Radio,
            sel1Radio = ':not(.itemset-template) > input:radio[data-name="/form/state"]',
            sel2Radio = ':not(.itemset-template) > input:radio[data-name="/form/county"]',
            sel3Radio = ':not(.itemset-template) > input:radio[data-name="/form/city"]';

        beforeEach( function() {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'cascading_mixture_itext_noitext.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = function() {
                return form.view.$.find( sel1Radio );
            };
            $items2Radio = function() {
                return form.view.$.find( sel2Radio );
            };
            $items3Radio = function() {
                return form.view.$.find( sel3Radio );
            };
        } );

        it( 'level 3: with <input type="radio"> elements using direct references to instance labels without itext has the expected amount of options', function() {
            //select first option
            form.view.$.find( sel1Radio + '[value="washington"]' )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'state';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Radio + '[value="king"]' )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'county';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'SeattleRedmond' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies inside repeat, ', function() {
        var countrySelector = '[data-name="/new_cascading_selections_inside_repeats/group1/country"]';
        var citySelector = 'label:not(.itemset-template) [data-name="/new_cascading_selections_inside_repeats/group1/city"]';
        var form;
        var $masterRepeat;
        var $clonedRepeat;

        beforeEach( function() {
            form = loadForm( 'new_cascading_selections_inside_repeats.xml' );
            form.init();
            $masterRepeat = form.view.$.find( '.or-repeat' );
            //select usa in master repeat
            $masterRepeat.find( countrySelector + '[value="usa"]' ).prop( 'checked', true ).trigger( 'change' );
            //add repeat
            form.view.$.find( '.add-repeat-btn' ).click();
            $clonedRepeat = form.view.$.find( '.or-repeat.clone' );
        } );

        it( 'the itemset of the cloned repeat is correct (and not a cloned copy of the master repeat)', function() {
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( countrySelector + ':selected' ).val() ).toBeUndefined();
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 0 );
        } );

        it( 'the itemset of the master repeat is not affected if the cloned repeat is changed', function() {
            $clonedRepeat.find( countrySelector + '[value="nl"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $masterRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', function() {
        it( 'initializes the itemset', function() {
            var form = loadForm( 'nested-repeats-itemset.xml' );
            var selector = '[name="/bug747/name_of_region/name_of_zone/zone"]';
            form.init();
            form.view.$.find( '[data-name="/bug747/name_of_region/region"][value="tigray"]' ).prop( 'checked', true ).trigger( 'change' );
            form.view.$.find( '.or-repeat-info[data-name="/bug747/name_of_region/name_of_zone"] .add-repeat-btn' ).click();
            expect( form.view.$.find( selector ).eq( 0 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
            expect( form.view.$.find( selector ).eq( 1 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
        } );
    } );

    describe( ' in a cloned repeat with a predicate including current()/../', function() {
        it( 'works', function() {
            // This test is added to show that once the makeBugCompliant function has been removed
            // itemsets with relative predicates still work.
            var form = loadForm( 'reprelcur1.xml' );
            form.init();
            form.view.$.find( '[data-name="/repeat-relative-current/rep/crop"][value="banana"]' ).prop( 'checked', true ).trigger( 'change' );
            form.view.$.find( '.add-repeat-btn' ).click();
            form.view.$.find( '[data-name="/repeat-relative-current/rep/crop"][value="beans"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );
            var sel1 = 'label:not(.itemset-template) > input[data-name="/repeat-relative-current/rep/sel_a"]';
            var sel2 = 'label:not(.itemset-template) > input[data-name="/repeat-relative-current/rep/group/sel_b"]';
            expect( form.view.$.find( sel1 ).eq( 0 ).val() ).toEqual( 'banana' );
            expect( form.view.$.find( sel2 ).eq( 0 ).val() ).toEqual( 'banana' );
            expect( form.view.$.find( sel1 ).eq( 1 ).val() ).toEqual( 'beans' );
            expect( form.view.$.find( sel2 ).eq( 1 ).val() ).toEqual( 'beans' );
        } );
    } );

    describe( 'with a rank widget', function() {
        it( 'works', function() {
            var form = loadForm( 'rank.xml' );
            form.init();
            var $s1 = form.view.$.find( 'input[name="/rank/s1"]' );
            var $r1 = form.view.$.find( 'input.rank[name="/rank/r1"]' );
            $r1.next( '.widget' ).click();

            expect( $r1.val() ).toEqual( 'banana beans cacao coffee foddergrass foddertree' );

            $s1.val( 'c' ).trigger( 'change' );

            expect( $r1.val() ).toEqual( '' );
            expect( $r1.next( '.widget' ).find( 'label' ).text() ).toEqual( 'CacaoCoffee' );

            $r1.next( '.widget' ).click();

            expect( $r1.val() ).toEqual( 'cacao coffee' );
        } );
    } );
} );
