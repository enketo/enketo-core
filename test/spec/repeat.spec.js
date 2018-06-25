var loadForm = require( '../helpers/loadForm' );
var $ = require( 'jquery' );
var forms = require( '../mock/forms' );

describe( 'repeat functionality', function() {
    var form;

    //turn jQuery animations off
    $.fx.off = true;

    describe( 'cloning', function() {
        beforeEach( function() {
            form = loadForm( 'thedata.xml' ); //new Form(forms2.formStr1, forms2.dataStr1);
            form.init();
        } );

        it( 'removes the correct instance and HTML node when the ' - ' button is clicked (issue 170)', function() {
            var repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]',
                nodePath = '/thedata/repeatGroup/nodeC',
                nodeSelector = 'input[name="' + nodePath + '"]',
                formH = form.view,
                data = form.model,
                index = 2;

            expect( formH.$.find( repeatSelector ).eq( index ).length ).toEqual( 1 );
            expect( formH.$.find( repeatSelector ).eq( index ).find( 'button.remove' ).length ).toEqual( 1 );
            expect( formH.$.find( nodeSelector ).eq( index ).val() ).toEqual( 'c3' );
            expect( data.node( nodePath, index ).getVal()[ 0 ] ).toEqual( 'c3' );

            formH.$.find( repeatSelector ).eq( index ).find( 'button.remove' ).click();
            expect( data.node( nodePath, index ).getVal()[ 0 ] ).toEqual( undefined );
            //check if it removed the correct data node
            expect( data.node( nodePath, index - 1 ).getVal()[ 0 ] ).toEqual( 'c2' );
            //check if it removed the correct html node
            expect( formH.$.find( repeatSelector ).eq( index ).length ).toEqual( 0 );
            expect( formH.$.find( nodeSelector ).eq( index - 1 ).val() ).toEqual( 'c2' );
        } );

        it( 'marks cloned invalid fields as valid', function() {
            var repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]',
                repeatButton = '.add-repeat-btn',
                nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]',
                $node3 = form.view.$.find( nodeSelector ).eq( 2 ),
                $node4;

            form.setInvalid( $node3 );

            expect( form.view.$.find( repeatSelector ).length ).toEqual( 3 );
            expect( $node3.parent().hasClass( 'invalid-constraint' ) ).toBe( true );
            expect( form.view.$.find( nodeSelector ).eq( 3 ).length ).toEqual( 0 );

            form.view.$.find( repeatButton ).click();

            $node4 = form.view.$.find( nodeSelector ).eq( 3 );
            expect( form.view.$.find( repeatSelector ).length ).toEqual( 4 );
            expect( $node4.length ).toEqual( 1 );
            expect( $node4.parent().hasClass( 'invalid-constraint' ) ).toBe( false );
        } );
    } );

    describe( 'fixes unique ids in cloned repeats', function() {
        // Avoiding problems in the autocomplete widget, https://github.com/enketo/enketo-core/issues/521
        it( 'ensures uniqueness of datalist ids, so cascading selects inside repeats work', function() {
            const form = loadForm( 'repeat-autocomplete.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            const id1 = form.view.$.find( '.or-repeat' ).eq( 0 ).find( 'datalist' )[ 0 ].id;
            const id2 = form.view.$.find( '.or-repeat' ).eq( 1 ).find( 'datalist' )[ 0 ].id;
            const list1 = form.view.$.find( '.or-repeat' ).eq( 0 ).find( 'input[list]' ).attr( 'list' );
            const list2 = form.view.$.find( '.or-repeat' ).eq( 1 ).find( 'input[list]' ).attr( 'list' );
            expect( id1 ).toEqual( list1 );
            expect( id2 ).toEqual( list2 );
            expect( id1 ).not.toEqual( id2 );
            expect( list1 ).not.toEqual( list2 );
        } );
    } );

    it( 'clones a repeat view element on load when repeat has dot in nodeName and has multiple instances in XForm', function() {
        form = loadForm( 'repeat-dot.xml' );
        form.init();
        expect( form.view.$.find( 'input[name="/repeat-dot/rep.dot/a"]' ).length ).toEqual( 2 );
    } );

    it( 'clones nested repeats if they are present in the instance upon initialization (issue #359) ', function() {
        //note that this form contains multiple repeats in the instance
        form = loadForm( 'nested_repeats.xml' );
        form.init();
        var $1stLevelTargetRepeat = form.view.$.find( '.or-repeat[name="/nested_repeats/kids/kids_details"]' );
        var $2ndLevelTargetRepeats1 = $1stLevelTargetRepeat.eq( 0 ).find( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        var $2ndLevelTargetRepeats2 = $1stLevelTargetRepeat.eq( 1 ).find( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        expect( $1stLevelTargetRepeat.length ).toEqual( 2 );
        expect( $2ndLevelTargetRepeats1.length ).toEqual( 2 );
        expect( $2ndLevelTargetRepeats2.length ).toEqual( 3 );
    } );

    //https://github.com/kobotoolbox/enketo-express/issues/754
    it( 'shows the correct number of nested repeats in the view if a record is loaded', function() {
        var instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form = loadForm( 'nested-repeats-nasty.xml', instanceStr );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 3 );

    } );

    it( 'ignores the "minimal" appearance when an existing record is loaded (almost same as previous test)', function() {
        var form;
        var instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( 'class="or-repeat ', 'class="or-repeat or-appearance-minimal ' );
        form = loadForm( 'nested-repeats-nastier', instanceStr );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).hasClass( 'or-appearance-minimal' ) ).toEqual( true );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 3 );
    } );

    it( 'uses the "minimal" appearance for an empty form to create 0 repeats', function() {
        var form;
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( 'class="or-repeat ', 'class="or-repeat or-appearance-minimal ' );
        form = loadForm( 'nested-repeats-nastier' );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 0 );
    } );

    it( 'In an empty form it creates the first repeat instance automatically (almost same as previous test)', function() {
        var form = loadForm( 'nested-repeats-nasty.xml' );
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 1 );
        expect( form.view.$.find( a ).hasClass( 'or-appearance-minimal' ) ).toEqual( false );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 1 );
    } );

    it( 'doesn\'t duplicate date widgets in a cloned repeat', function() {
        form = loadForm( 'nested_repeats.xml' );
        form.init();
        var $dates = form.view.$.find( '[name="/nested_repeats/kids/kids_details/immunization_info/date"]' );

        expect( $dates.length ).toEqual( 5 );
        // for some reason these widgets are not instantiated here
        expect( $dates.parent().find( '.widget.date' ).length ).toEqual( 5 );
    } );

    describe( 'ordinals are set for default repeat instances in the default model upon initialization', function() {
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
        xit( 'initialize correctly with ordinals if more than one top-level repeat is included in model', function() {
            var f = loadForm( 'nested_repeats.xml' );
            f.init();
            var model = f.model;
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

    describe( 'supports repeat count', function() {
        it( 'to dynamically remove/add repeats', function() {
            var f = loadForm( 'repeat-count.xml' );
            var rep = '.or-repeat[name="/dynamic-repeat-count/rep"]';
            var cnt = '[name="/dynamic-repeat-count/count"]';
            var $form;
            var $model;
            f.init();
            $form = f.view.$;
            $model = f.model.$;
            // check that repeat count is evaluated upon load for default values
            expect( $form.find( rep ).length ).toEqual( 2 );
            expect( $model.find( 'rep' ).length ).toEqual( 2 );
            // increase
            $form.find( cnt ).val( 10 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 10 );
            expect( $model.find( 'rep' ).length ).toEqual( 10 );
            // decrease
            $form.find( cnt ).val( 5 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 5 );
            expect( $model.find( 'rep' ).length ).toEqual( 5 );
            // decrease too much
            $form.find( cnt ).val( 0 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
            // decrease way too much
            $form.find( cnt ).val( -10 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
            // go back up after reducing to 0
            $form.find( cnt ).val( 5 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 5 );
            expect( $model.find( 'rep' ).length ).toEqual( 5 );
            // empty value should be considered as 0
            $form.find( cnt ).val( '' ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with relevant on group)', function() {
            // When repeat count is zero there is no context node to pass to evaluator.
            var f = loadForm( 'repeat-count-relevant.xml' );
            var errors = f.init();
            expect( errors.length ).toEqual( 0 );
            expect( f.view.$.find( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            expect( f.view.$.find( '.or-group.or-branch[name="/data/rep"]' ).hasClass( 'disabled' ) ).toBe( true );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with output in group label)', function() {
            // When repeat count is zero there is no context node to pass to evaluator.
            var f = loadForm( 'repeat-count-relevant.xml' );
            var errors = f.init();
            expect( errors.length ).toEqual( 0 );
            expect( f.view.$.find( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            f.view.$.find( 'input[name="/data/q1"]' ).val( 2 ).trigger( 'change' );
            expect( f.view.$.find( '.or-group.or-branch[name="/data/rep"]>h4 .or-output' ).text() ).toEqual( '2' );
        } );

        it( 'and correctly deals with nested repeats that have a repeat count', function() {
            var f = loadForm( 'repeat-count-nested-2.xml' );
            var schools = '[name="/data/repeat_A/schools"]';
            var a = '.or-repeat[name="/data/repeat_A"]';
            var b = '.or-repeat[name="/data/repeat_A/repeat_B"]';
            f.init();

            f.view.$.find( schools ).eq( 1 ).val( '2' ).trigger( 'change' );

            expect( f.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 2 );
        } );
    } );


    describe( 'creates 0 repeats', function() {

        it( ' if a record is loaded with 0 repeats (simple)', function() {
            var repeat = '.or-repeat[name="/repeat-required/rep"]';
            var f = loadForm( 'repeat-required.xml', '<repeat-required><d>b</d><meta><instanceID>a</instanceID></meta></repeat-required>' );
            f.init();
            expect( f.view.$.find( repeat ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (simple)', function() {
            var repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            var repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            var f = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            f.init();
            expect( f.view.$.find( repeat1 ).length ).toEqual( 1 );
            expect( f.view.$.find( repeat2 ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (advanced)', function() {
            var repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            var repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            var f = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name><Camp><P_Camps/></Camp></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            f.init();
            expect( f.view.$.find( repeat1 ).length ).toEqual( 2 );
            expect( f.view.$.find( repeat1 ).eq( 0 ).find( repeat2 ).length ).toEqual( 0 );
            expect( f.view.$.find( repeat1 ).eq( 1 ).find( repeat2 ).length ).toEqual( 1 );
        } );

        // This is a VERY special case, because the form contains a template as well as multiple repeat instances
        xit( ' if a record is loaded with 0 repeats (very advanced)', function() {
            var repeat = '.or-repeat[name="/repeat-dot/rep.dot"]';
            var f = loadForm( 'repeat-dot.xml', '<repeat-dot><meta><instanceID>a</instanceID></meta></repeat-dot>' );
            f.init();
            expect( f.view.$.find( repeat ).length ).toEqual( 0 );
        } );
    } );

    describe( 'initializes date widgets', function() {
        it( 'in a new repeat instance if the date widget is not relevant by default', function() {
            var form = loadForm( 'repeat-irrelevant-date.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            // make date field in second repeat relevant
            form.view.$.find( '[name="/repeat/rep/a"]' ).eq( 1 ).val( 'a' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/repeat/rep/b"]' ).eq( 1 ).closest( '.question' ).find( '.widget' ).length ).toEqual( 1 );
        } );
    } );

} );
