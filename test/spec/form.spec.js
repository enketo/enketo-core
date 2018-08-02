'use strict';

var Form = require( '../../src/js/Form' );
var $ = require( 'jquery' );
var loadForm = require( '../helpers/loadForm' );
var forms = require( '../mock/forms' );

describe( 'Output functionality ', function() {
    // These tests were orginally meant for modilabs/enketo issue #141. However, they passed when they were
    // failing in the enketo client itself (same form). It appeared the issue was untestable (except manually)
    // since the issue was resolved by updating outputs with a one millisecond delay (!).
    // Nevertheless, these tests can be useful.
    var form = loadForm( 'random.xml' );

    form.init();

    it( 'tested upon initialization: node random__', function() {
        expect( form.view.$.find( '[data-value="/random/random__"]' ).text().length ).toEqual( 17 );
    } );

    it( 'tested upon initialization: node uuid__', function() {
        expect( form.view.$.find( '[data-value="/random/uuid__"]' ).text().length ).toEqual( 36 );
    } );
} );

describe( 'Output functionality inside branches that irrelevan upon load', function() {
    var form = loadForm( 'output-irrelevant.xml' );
    form.init();

    it( 'is evaluated after the branch becomes relevant', function() {
        form.view.$.find( 'input[name="/data/consent"]' ).val( 'yes' ).trigger( 'change' );
        expect( form.view.$.find( '.or-output' ).text() ).toEqual( 'mr' );
    } );
} );

describe( 'Output functionality within repeats', function() {
    var $o = [];
    var form = loadForm( 'outputs_in_repeats.xml' );
    form.init();
    form.view.$.find( '.add-repeat-btn' ).click();

    $o = form.view.$.find( '.or-output' );

    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 0 ).val( 'Martijn' ).trigger( 'change' );
    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 1 ).val( 'Beth' ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="elephant"]' ).eq( 0 ).prop( 'checked', true ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="rabbit"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );

    it( 'shows correct value when referring to repeated node', function() {
        expect( $o[ 0 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 1 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 2 ].textContent ).toEqual( 'elephant' );
        expect( $o[ 3 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 4 ].textContent ).toEqual( 'Beth' );
        expect( $o[ 5 ].textContent ).toEqual( 'Beth' );
        expect( $o[ 6 ].textContent ).toEqual( 'rabbit' );
        expect( $o[ 7 ].textContent ).toEqual( 'Beth' );
    } );
} );

describe( 'Preload and MetaData functionality', function() {
    var form, t;

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on /[ROOT]/meta/instanceID', function() {
        form = loadForm( 'random.xml' );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on [ROOT]/orx:meta/orx:instanceID', function() {
        form = loadForm( 'meta-namespace.xml' );
        form.init();
        expect( form.model.node( '/data/orx:meta/orx:instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID on /[ROOT]/meta/instanceID WITHOUT preload binding', function() {
        form = loadForm( 'random.xml' );
        form.init();
        form.view.$.find( 'fieldset#or-preload-items' ).remove();
        expect( form.view.$.find( 'fieldset#or-preload-items' ).length ).toEqual( 0 );
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID WITH a preload binding', function() {
        form = loadForm( 'preload.xml' );
        form.init();
        expect( form.view.$
                .find( 'fieldset#or-preload-items input[name="/preload/meta/instanceID"][data-preload="uid"]' ).length )
            .toEqual( 1 );
        expect( form.model.node( '/preload/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with instanceID population. Test should still pass though.
    it( 'does not generate a new instanceID if one is already present', function() {
        form = new Form( forms[ 'random.xml' ].html_form, {
            modelStr: forms[ 'random.xml' ].xml_model.replace( '<instanceID/>', '<instanceID>existing</instanceID>' )
        } );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ] ).toEqual( 'existing' );
    } );

    it( 'generates a timeStart on /[ROOT]/meta/timeStart WITH a preload binding', function() {
        form = loadForm( 'preload.xml' );
        form.init();
        expect( form.model.node( '/preload/start' ).getVal()[ 0 ].length > 10 ).toBe( true );
    } );

    it( 'generates a timeEnd on init and updates this after a beforesave event WITH a preload binding', function( done ) {
        var timeEnd;
        var timeEndNew;

        form = loadForm( 'preload.xml' );
        form.init();
        timeEnd = form.model.node( '/preload/end' ).getVal()[ 0 ];

        // populating upon initalization is not really a feature, could be removed perhaps
        expect( timeEnd.length > 10 ).toBe( true );

        setTimeout( function() {
            form.view.$.trigger( 'beforesave' );
            timeEndNew = form.model.node( '/preload/end' ).getVal()[ 0 ];
            expect( new Date( timeEndNew ) - new Date( timeEnd ) ).toBeGreaterThan( 1000 );
            expect( new Date( timeEndNew ) - new Date( timeEnd ) ).toBeLessThan( 1050 );
            done();
        }, 1000 );

    } );

    it( 'also works with nodes that have a corresponding form control element', function() {
        form = loadForm( 'preload-input.xml' );
        form.init();

        [ '/dynamic-default/two', '/dynamic-default/four', '/dynamic-default/six' ].forEach( function( path ) {
            expect( form.view.$.find( '[name="' + path + '"]' ).val().length > 9 ).toBe( true );
            expect( form.model.node( path ).getVal()[ 0 ].length > 9 ).toBe( true );
        } );
    } );

    it( 'some session context can be passed to the data.session property when instantiating form', function() {
        var session = {
            deviceid: 'a',
            username: 'b',
            email: 'c',
            phonenumber: 'd',
            simserial: 'e',
            subscriberid: 'f'
        };
        form = loadForm( 'preload.xml', undefined, undefined, session );
        form.init();

        [ 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid' ].forEach( function( prop ) {
            expect( form.model.node( '/preload/' + prop ).getVal()[ 0 ] ).toEqual( session[ prop ] );
        } );
    } );

    function testPreloadExistingValue( node ) {
        it( 'obtains unchanged preload value of item (WITH preload binding): ' + node.selector + '', function() {
            form = new Form( forms[ 'preload.xml' ].html_form, {
                modelStr: '<preload>' +
                    '<start>2012-10-30T08:44:57.000-06</start>' +
                    '<end>2012-10-30T08:44:57.000-06:00</end>' +
                    '<today>2012-10-30</today>' +
                    '<deviceid>some value</deviceid>' +
                    '<subscriberid>some value</subscriberid>' +
                    '<imei>2332</imei>' +
                    '<phonenumber>234234324</phonenumber>' +
                    '<application>some context</application>' +
                    '<patient>this one</patient>' +
                    '<username>John Doe</username>' +
                    '<browser_name>fake</browser_name>' +
                    '<browser_version>xx</browser_version>' +
                    '<os_name>fake</os_name>' +
                    '<os_version>xx</os_version>' +
                    '<unknown>some value</unknown>' +
                    '<meta><instanceID>uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8</instanceID></meta>' +
                    '</preload>'
            } );
            form.init();
            expect( form.model.node( node.selector ).getVal()[ 0 ] ).toEqual( node.result );
        } );
    }

    function testPreloadNonExistingValue( node ) {
        it( 'populates previously empty preload item (WITH preload binding): ' + node.selector + '', function() {
            form = loadForm( 'preload.xml' );
            form.init();
            expect( form.model.node( node.selector ).getVal()[ 0 ].length > 0 ).toBe( true );
        } );
    }

    t = [
        [ '/preload/start', '2012-10-30T08:44:57.000-06:00' ],
        [ '/preload/today', '2012-10-30' ],
        [ '/preload/deviceid', 'some value' ],
        [ '/preload/subscriberid', 'some value' ],
        [ '/preload/imei', '2332' ],
        [ '/preload/phonenumber', '234234324' ],
        //[ '/preload/application', 'some context' ],
        //[ '/preload/patient', 'this one' ],
        //[ '/preload/username', 'John Doe' ],
        //[ '/preload/meta/instanceID', 'uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8' ],
        //['/widgets/browser_name', 'fake'],
        //['/widgets/browser_version', 'xx'],
        //['/widgets/os_name', 'fake'],
        //['/widgets/os_version', 'xx'],
    ];

    for ( var i = 0; i < t.length; i++ ) {
        testPreloadExistingValue( {
            selector: t[ i ][ 0 ],
            result: t[ i ][ 1 ]
        } );
        testPreloadNonExistingValue( {
            selector: t[ i ][ 0 ]
        } );
    }
    testPreloadNonExistingValue( {
        selector: '/preload/end'
    } );
} );

describe( 'Loading instance values into html input fields functionality', function() {
    var form;

    it( 'correctly populates input fields of non-repeat node names in the instance', function() {
        form = loadForm( 'thedata.xml' );
        form.init();
        expect( form.view.$.find( '[name="/thedata/nodeB"]' ).val() ).toEqual( 'b' );
        expect( form.view.$.find( '[name="/thedata/repeatGroup/nodeC"]' ).eq( 2 ).val() ).toEqual( 'c3' );
        expect( form.view.$.find( '[name="/thedata/nodeX"]' ).val() ).toEqual( undefined );
    } );

    it( 'correctly populates input field even if the instance node name is not unique and occurs at multiple levels', function() {
        form = loadForm( 'nodename.xml' );
        form.init();
        expect( form.view.$.find( '[name="/nodename_bug/hh/hh"]' ).val() ).toEqual( 'hi' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/718
    it( 'correctly populates if the first radiobutton or first checkbox only has a value', function() {
        form = loadForm( 'issue208.xml' );
        form.init();
        form.input.setVal( '/issue208/rep/nodeA', 0, 'yes' );
        expect( form.view.$.find( '[data-name="/issue208/rep/nodeA"]' ).eq( 0 ).is( ':checked' ) ).toBe( true );
    } );

} );

describe( 'calculations', function() {

    it( 'also work inside repeats', function() {
        var form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click();
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '10' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '20' ).trigger( 'change' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal()[ 0 ] ).toEqual( '200' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal()[ 0 ] ).toEqual( '400' );
    } );

    it( 'are not performed if the calculation is not relevant', function() {
        var form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();

        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '20' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '5' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(2)' ).val( '40' ).trigger( 'change' );

        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal()[ 0 ] ).toEqual( '400' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal()[ 0 ] ).toEqual( '' );
        //sexpect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 2 ).getVal()[ 0 ] ).toEqual( '800' );
    } );

    it( 'outside a repeat are updated if they are dependent on a repeat node', function() {
        var f = loadForm( 'repeat-count.xml' );
        var cnt = '[name="/dynamic-repeat-count/count"]';
        var $form;
        var $model;
        f.init();
        $form = f.view.$;
        $model = f.model.$;
        // increase count to 10
        $form.find( cnt ).val( 10 ).trigger( 'change' );
        expect( $model.find( 'sum_note' ).text() ).toEqual( '10' );
        expect( $model.find( 'txtsum_note' ).text() ).toEqual( '10' );
    } );

    // https://github.com/enketo/enketo-core/issues/479
    it( 'inside a repeat using the position(..) function are updated if the position changes due to repeat removal', function() {
        var form = loadForm( 'repeat-position.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click().click();
        form.view.$.find( '.remove' ).eq( 1 ).click();
        expect( form.model.xml.querySelectorAll( 'pos' )[ 1 ].textContent ).toEqual( '2' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 1 ).text() ).toEqual( '2' );
        expect( form.model.xml.querySelectorAll( 'pos' )[ 2 ].textContent ).toEqual( '3' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 2 ).text() ).toEqual( '3' );
    } );

} );

describe( 'branching functionality', function() {

    it( 'hides irrelevant branches upon initialization', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
    } );

    it( 'reveals a group branch when the relevant condition is met', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'no' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( false );
    } );

    it( 'reveals a question when the relevant condition is met', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 3 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 2 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 0 );
    } );

    /*
    Issue 208 was a combination of two issues:
        1. branch logic wasn't evaluated on repeated radiobuttons (only on the original) in branch.update()
        2. position[i] wasn't properly injected in makeBugCompiant() if the context node was a radio button or checkbox
     */
    it( 'a) evaluates relevant logic on a repeated radio-button-question and b) injects the position correctly (issue 208)', function() {
        var repeatSelector = '.or-repeat[name="/issue208/rep"]';
        var form = loadForm( 'issue208.xml' );
        form.init();

        form.view.$.find( '.add-repeat-btn' ).click();
        expect( form.view.$.find( repeatSelector ).length ).toEqual( 2 );
        //check if initial state of 2nd question in 2nd repeat is disabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' )
            .hasClass( 'disabled' ) ).toBe( true );
        //select 'yes' in first question of 2nd repeat
        form.model.node( '/issue208/rep/nodeA', 1 ).setVal( 'yes', null, 'string' );
        //doublecheck if new value was set
        expect( form.model.node( '/issue208/rep/nodeA', 1 ).getVal()[ 0 ] ).toEqual( 'yes' );
        //check if 2nd question in 2nd repeat is now enabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' ).hasClass( 'disabled' ) ).toBe( false );

    } );

    it( 're-evaluates when a node with a relative path inside a relevant expression is changed', function() {
        var form = loadForm( 'relative.xml' );
        form.init();
        var $form = form.view.$,
            $a = $form.find( '[name="/relative/a"]' ),
            $branch = $form.find( '[name="/relative/c"]' ).closest( '.or-branch' );

        $a.val( 'abcd' ).trigger( 'change' );
        expect( $branch.length ).toEqual( 1 );
        expect( $branch.hasClass( 'disabled' ) ).toEqual( false );
    } );

    describe( 'when used with calculated items', function() {
        var form = loadForm( 'calcs.xml' );
        form.init();
        var $node = form.view.$.find( '[name="/calcs/cond1"]' );
        var dataO = form.model;

        it( 'evaluates a calculated item only when it becomes relevant', function() {
            // node without relevant attribute:
            expect( dataO.node( '/calcs/calc11' ).getVal()[ 0 ] ).toEqual( '12' );
            // node that is irrelevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
            $node.val( 'yes' ).trigger( 'change' );
            // node that has become relevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
            // make irrelevant again (was a bug)
            $node.val( 'no' ).trigger( 'change' );
            // double-check that calc11 is unaffected (was a bug)
            expect( dataO.node( '/calcs/calc11' ).getVal()[ 0 ] ).toEqual( '12' );
            // node that is irrelevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );

        } );

        it( 'empties an already calculated item once it becomes irrelevant', function() {
            $node.val( 'yes' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
            $node.val( 'no' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
        } );
    } );

    describe( 'inside repeats when multiple repeats are present upon loading', function() {

        it( 'correctly evaluates the relevant logic of each question inside all repeats (issue #507)', function() {
            var form = loadForm( 'multiple_repeats_relevant.xml' );
            form.init();
            var $relNodes = form.view.$.find( '[name="/multiple_repeats_relevant/rep/skipq"]' ).parent( '.or-branch' );
            expect( $relNodes.length ).toEqual( 2 );
            //check if both questions with 'relevant' attributes in the 2 repeats are disabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).toBe( true );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).toBe( true );
        } );

        it( 'correctly evaluates the relevant logic of each simple select question inside all repeats (issue #442 core)', function() {
            var form = loadForm( 'repeat-relevant-select1.xml', '<Enketo_tests><details><fruits>pear</fruits><location></location></details><details><fruits>mango</fruits><location>kisumu</location></details><details><fruits>mango</fruits><location>kisumu</location></details><meta><instanceID>a</instanceID></meta></Enketo_tests>' );
            form.init();
            var $relNodes = form.view.$.find( '[data-name="/Enketo_tests/details/location"]' ).closest( '.or-branch' );
            expect( $relNodes.length ).toEqual( 3 );
            //check if radiobuttons with 'relevant' attributes in the second and third repeats are initialized and enabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).toBe( true );
            expect( $relNodes.eq( 1 ).hasClass( 'pre-init' ) ).toBe( false );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).toBe( false );
            expect( $relNodes.eq( 2 ).hasClass( 'pre-init' ) ).toBe( false );
            expect( $relNodes.eq( 2 ).hasClass( 'disabled' ) ).toBe( false );
        } );

    } );

    // https://github.com/kobotoolbox/enketo-express/issues/846
    describe( 'inside repeats for a calculation without a form control when no repeats exist', function() {
        var form = loadForm( 'calcs_in_repeats_2.xml' );
        var loadErrors = form.init();
        it( 'does not throw an error', function() {
            expect( loadErrors.length ).toEqual( 0 );
        } );
    } );

    describe( 'in nested branches ', function() {
        var form = loadForm( 'nested-branches.xml' );

        form.init();
        var $nestedBranch = form.view.$.find( '[name="/nested-branches/group/c"]' ).closest( '.question' );

        it( 'works correctly when an ancestor branch gets enabled', function() {
            expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 1 );
            // enable parent branch
            form.model.node( '/nested-branches/a', 0 ).setVal( '1' );
            expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 0 );
            // check if nested branch has been initialized and is enabled
            expect( $nestedBranch.hasClass( 'pre-init' ) ).toBe( false );
            expect( $nestedBranch.hasClass( 'disabled' ) ).toBe( false );
        } );
    } );

    // https://github.com/enketo/enketo-core/issues/444
    describe( 'in nested repeats with a <select> that has a relevant', function() {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 1 child repeat (<select> with relevant).
        // The second child repeat in each parent repeat with name 'type_other' is irrelevant.
        var instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock></region><region><livestock><type>d</type></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        var form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();
        it( 'initializes all nested repeat questions', function() {
            expect( form.view.$.find( '.or-branch' ).length ).toEqual( 4 );
            expect( form.view.$.find( '.or-branch.pre-init' ).length ).toEqual( 0 );
        } );
    } );

    describe( 'handles clearing of form control values in irrelevant branches', function() {
        var name = 'relevant-default.xml';
        var one = '/relevant-default/one';
        var two = '/relevant-default/two';
        var three = '/relevant-default/grp/three';
        var four = '/relevant-default/grp/four';

        it( 'by not clearing UPON LOAD', function() {
            var form = loadForm( name );
            form.init();
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 1 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 1 );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
        } );

        it( 'by not clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantsImmediately is set to false', function() {
            var form = loadForm( name, null, {
                clearIrrelevantImmediately: false
            } );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
        } );

        it( 'by clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantImmediately is set to true', function() {
            var form = loadForm( name, null, {
                clearIrrelevantImmediately: true
            } );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantImmediately is not set', function() {
            var form = loadForm( name );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by clearing values of irrelevant questions when form.clearIrrelevant() is called', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
            form.clearIrrelevant();
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by not conducting calculations upon load if the calc node is not relevant', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( four ).getVal()[ 0 ] ).toEqual( '' );
        } );

    } );


    describe( 'handles calculated values in irrelevant/relevant branches with default settings', function() {
        var name = 'calc-in-group-with-relevant.xml';
        var cond = '/calc-in-group-with-relevant/cond';
        var groupCalc = '/calc-in-group-with-relevant/grp/groupCalc';
        var groupReadonlyCalc = '/calc-in-group-with-relevant/grp/groupReadonlyCalc';
        var readonlyCalc = '/calc-in-group-with-relevant/readonlyCalc';
        var calc = '/calc-in-group-with-relevant/calc';

        it( 'by not clearing when relevant upon load', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '34' );
        } );

        it( 'by clearing calculations when parent group of calculation itself becomes irrelevant', function() {
            var form = loadForm( name );
            form.init();
            form.view.$.find( '[name="' + cond + '"]' ).val( 'hide' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '' );

            // bonus, questions outside group but also irrelevant
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by re-populating calculations when parent group of calculation itself becomes relevant', function() {
            var form = loadForm( name );
            form.init();
            // make irrelevant -> clear (see previous test)
            form.view.$.find( '[name="' + cond + '"]' ).val( 'hide' ).trigger( 'change' );
            // make relevant again
            form.view.$.find( '[name="' + cond + '"]' ).val( '' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            // bonus, questions outside group but also irrelevant
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '34' );
        } );

    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', function() {
        it( 'initializes the relevants', function() {
            var form = loadForm( 'repeat-child-relevant.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            expect( form.view.$.find( '.or-branch' ).length ).toEqual( 2 );
            expect( form.view.$.find( '.or-branch.pre-init' ).length ).toEqual( 0 );
        } );
    } );

    // This (fixed) issue is not related to indexed-repeat function. In native XPath it is the same.
    describe( 'on a group with an expression that refers to a repeat node value', function() {
        it( 're-evaluates when the referred node changes', function() {
            var form = loadForm( 'group-relevant-indexed-repeat.xml' );
            form.init();
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).toEqual( 1 );
            form.view.$.find( '[name="/data/PROCEDURE/PROC_GRID/PROC"]' ).val( '6' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            form.view.$.find( '.add-repeat-btn' ).click();
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            form.view.$.find( '[name="/data/PROCEDURE/PROC_GRID/PROC"]' ).val( '1' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).toEqual( 1 );
        } );
    } );

    describe( 'on a question inside a REMOVED repeat', function() {
        it( 'does not try to evaluate it', function() {
            var form = loadForm( 'repeat-irrelevant-date.xml' );
            form.init();
            form.view.$.find( '[name="/repeat/rep"] button.remove' ).click();
            // This is testing what happens inside getDataStrWithoutIrrelevantNodes
            // It tests whether the cache is updated when a repeat is removed.s
            // https://github.com/kobotoolbox/enketo-express/issues/1014
            expect( form.getRelatedNodes( 'data-relevant' ).length ).toEqual( 0 );
        } );
    } );

} );

describe( 'obtaining XML string from form without irrelevant nodes', function() {
    it( 'works for calcs that are irrelevant upon load', function() {
        var form = loadForm( 'calcs.xml' );
        var match = '<calc1/>';
        form.init();

        expect( form.getDataStr() ).toMatch( match );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );
    } );

    it( 'works for calcs that become irrelevant after load', function() {
        var $node;
        var form = loadForm( 'calcs.xml' );
        form.init();
        $node = form.view.$.find( '[name="/calcs/cond1"]' );

        $node.val( 'yes' ).trigger( 'change' );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).toMatch( '<calc1>3</calc1>' );

        $node.val( 'nope' ).trigger( 'change' );

        var res = form.getDataStr( {
            irrelevant: false
        } );
        expect( res ).not.toMatch( '<calc1/>' );
        expect( res ).not.toMatch( '<calc1>' );
    } );

    it( 'works for a nested branch where there is an relevant descendant of an irrelevant ancestor', function() {
        var form = loadForm( 'nested-branches.xml' );
        var match = '<c/>';
        form.init();

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );

    } );

    // This test also checks that no exception occurs when an attempt is made to remove the <c> node
    // when it no longer exists because its parent has already been removed.
    it( 'works for a nested branch where there is an irrelevant descendant of an irrelevant ancestor', function() {
        var form = loadForm( 'nested-branches.xml' );
        var match = '<c/>';
        form.init();
        form.view.$.find( '[name="/nested-branches/b"]' ).val( 0 ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );

    } );

    it( 'works if repeat count is 0', function() {
        // When repeat count is zero there is no context node to pass to evaluator.
        var form = loadForm( 'repeat-count-relevant.xml' );
        var getFn = function() {
            return form.getDataStr( {
                irrelevant: false
            } );
        };
        form.init();
        expect( getFn ).not.toThrow();
        expect( getFn() ).not.toMatch( '<rep>' );
        expect( getFn() ).toMatch( '<q1/>' );
    } );

    // Issue https://github.com/enketo/enketo-core/issues/443: The incorrect nested repeat nodes are removed.
    it( 'works for nested repeats where some children are irrelevant', function() {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 2 child repeats and certain values.
        // The second child repeat in each parent repeat with name 'type_other' is irrelevant.
        var instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        var form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();

        // check setup
        expect( form.getDataStr( {
            irrelevant: true
        } ).replace( />\s+</g, '><' ) ).toMatch( '<region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );

        // perform actual tests
        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).toMatch( '<region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/824
    it( 'works for simple "select" (checkbox) questions inside repeats', function() {
        var form = loadForm( 'repeat-relevant-select.xml' );
        var repeat = '.or-repeat[name="/data/details"]';
        var fruit = '[name="/data/details/fruits"]';
        var location = '[name="/data/details/location"]';
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();
        form.view.$.find( repeat ).eq( 0 ).find( fruit + '[value="pear"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( fruit + '[value="mango"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 2 ).find( fruit + '[value="pear"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( location + '[value="nairobi"]' ).prop( 'checked', true ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).toMatch( '<details><fruits>pear</fruits></details><details><fruits>mango</fruits><location>nairobi</location></details><details><fruits>pear</fruits></details>' );
    } );

} );

describe( 'validation', function() {

    describe( 'feedback to user after equired field validation', function() {
        var form, $numberInput, $numberLabel;

        beforeEach( function() {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'group_branch.xml' );
            form.init();
            $numberInput = form.view.$.find( '[name="/data/group/nodeB"]' );
            $numberLabel = form.input.getWrapNodes( $numberInput );
        } );

        it( 'validates a DISABLED and required number field without a value', function() {
            $numberInput.val( '' ).trigger( 'change' );
            expect( $numberLabel.length ).toEqual( 1 );
            expect( $numberInput.val().length ).toEqual( 0 );
            expect( $numberLabel.parents( '.or-group' ).prop( 'disabled' ) ).toBe( true );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
        } );

        //see issue #144
        it( 'validates an enabled and required number field with value 0 and 1', function() {
            form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            expect( $numberLabel.length ).toEqual( 1 );
            $numberInput.val( 0 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
            $numberInput.val( 1 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
        } );

        // failing
        it( 'invalidates an enabled and required number field without a value', function( done ) {
            // first make branch relevant
            form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            // now set value to empty
            $numberInput.val( '' ).trigger( 'change' );
            form.validateInput( $numberInput )
                .then( function() {
                    expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( true );
                    done();
                } );
        } );

        it( 'invalidates an enabled and required textarea that contains only a newline character or other whitespace characters', function( done ) {
            form = loadForm( 'thedata.xml' );
            form.init();
            var $textarea = form.view.$.find( '[name="/thedata/nodeF"]' );
            $textarea.val( '\n' ).trigger( 'change' );
            form.validateInput( $textarea )
                .then( function() {
                    expect( $textarea.length ).toEqual( 1 );
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
                    $textarea.val( '  \n  \n\r \t ' ).trigger( 'change' );
                    return form.validateInput( $textarea );
                } )
                .then( function() {
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
                    done();
                } );
        } );

        it( 'hides a required "*" if the expression is dynamic and evaluates to false', function( done ) {
            form = loadForm( 'dynamic-required.xml' );
            form.init();
            var $dynReq = form.view.$.find( '.required' );

            expect( $dynReq.eq( 0 ).hasClass( 'hide' ) ).toBe( false );
            form.validateInput( form.view.$.find( '[name="/dynamic-required/num"]' ) ).then( function() {
                expect( $dynReq.eq( 1 ).hasClass( 'hide' ) ).toBe( true );
                done();
            } );
        } );
    } );

    describe( 'public validate method', function() {

        it( 'returns false if constraint is false', function( done ) {
            var form = loadForm( 'thedata.xml' );
            form.init();

            // first make the form valid to make sure we are testing the right thing
            form.model.xml.querySelector( 'nodeF' ).textContent = 'f';

            form.validate()
                .then( function( result ) {
                    // check test setup
                    expect( result ).toEqual( true );
                    // now make make sure a constraint fails
                    form.model.xml.querySelector( 'nodeB' ).textContent = 'c';
                    return form.validate();
                } )
                .then( function( result ) {
                    expect( result ).toEqual( false );
                    done();
                } );
        } );

    } );

    // These tests were a real pain to write because of the need to change a global config property.
    describe( 'with validateContinuously', function() {
        var form;
        var B = '[name="/data/b"]';
        var C = '[name="/data/c"]';
        var config = require( 'enketo/config' );
        var dflt = config.validateContinuously;

        var setValue = function( selector, val ) {
            return new Promise( function( resolve ) {
                // violate constraint for c
                form.view.$.find( selector ).val( val ).trigger( 'change' );
                setTimeout( function() {
                    resolve();
                }, 800 );
            } );
        };

        afterAll( function() {
            // reset to default
            config.validateContinuously = dflt;
        } );


        it( '=true will immediately re-evaluate a constraint if its dependent value changes', function( done ) {
            form = loadForm( 'constraint-dependency.xml' );
            form.init();
            setValue( C, '12' )
                .then( function() {
                    config.validateContinuously = false;
                    // violate
                    return setValue( B, 'a' );
                } )
                .then( function() {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).toEqual( false );
                    // pass
                    return setValue( B, 'b' );
                } )
                .then( function() {
                    config.validateContinuously = true;
                    //violate
                    return setValue( B, 'a' );
                } )
                .then( function() {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).toEqual( true );
                    done();
                } );
        } );

        it( '=true, will not immediate validate a brand new repeat but will validate nodes that depend on that repeat', function( done ) {
            var rep = '[name="/repeat-required/rep"]';
            var d = '[name="/repeat-required/d"]';
            form = loadForm( 'repeat-required.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();

            // an ugly test, I don't care
            setTimeout( function() {
                // new repeat should not show errors
                expect( form.view.$.find( rep ).eq( 1 ).find( '.invalid-required, .invalid-constraint' ).length ).toEqual( 0 );
                // we now have two repeats so node d should not be marked as invalid
                expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).toBe( false );

                form.view.$.find( '.add-repeat-btn' ).click();

                setTimeout( function() {
                    // new repeat should not show errors
                    expect( form.view.$.find( rep ).eq( 2 ).find( '.invalid-required, .invalid-constraint' ).length ).toEqual( 0 );
                    // we now have three repeats so node d should be marked as invalid
                    expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).toBe( true );

                    done();
                }, 800 );
            }, 800 );
        } );
    } );

} );

describe( 'Readonly questions', function() {
    it( 'show their calculated value', function() {
        var form = loadForm( 'readonly.xml' );
        form.init();
        var $input = form.view.$.find( '[name="/readonly/a"]' );
        expect( $input.val() ).toEqual( 'martijn' );
        expect( $input.closest( '.question' ).hasClass( 'note' ) ).toBe( false );
    } );

    it( 'show a default text input value', function() {
        var form = loadForm( 'readonly.xml' );
        form.init();
        var $input = form.view.$.find( '[name="/readonly/b"]' );
        expect( $input.val() ).toEqual( 'is' );
        expect( $input.closest( '.question' ).hasClass( 'note' ) ).toBe( false );
    } );
} );

describe( 'Required questions', function() {
    it( 'dynamically update the asterisk visibility in real-time', function() {
        var form = loadForm( 'required.xml' );
        form.init();
        var $input = form.view.$.find( '[name="/required/a"]' );
        var $asterisk = form.view.$.find( '[name="/required/b"]' ).closest( '.question' ).find( '.required' );
        expect( $asterisk.hasClass( 'hide' ) ).toBe( true );
        $input.val( 'yes' ).trigger( 'change' );
        expect( $asterisk.hasClass( 'hide' ) ).toBe( false );
    } );

    it( 'fail validation if the value includes only whitespace', function( done ) {
        var form = loadForm( 'required.xml' );
        form.init();
        form.view.$.find( '[name="/required/a"]' ).val( 'yes' ).trigger( 'change' );
        var $input = form.view.$.find( '[name="/required/b"]' );
        $input.val( ' a ' ).trigger( 'change' );

        setTimeout( function() {
            $input.val( '      ' ).trigger( 'change' );
            setTimeout( function() {
                expect( $input.closest( '.question' ).hasClass( 'invalid-required' ) ).toBe( true );
                done();
            }, 100 );
        }, 100 );
    } );
} );

describe( 're-validating inputs and updating user feedback', function() {
    var form = loadForm( 'comment.xml' );
    var $one;
    var $oneComment;
    form.init();
    $one = form.view.$.find( '[name="/comment/one"]' );
    $oneComment = form.view.$.find( '[name="/comment/one_comment"]' );
    it( 'works', function( done ) {
        // set question "one" in invalid state (automatic)
        $one.val( '' ).trigger( 'change' );
        // validation is asynchronous
        setTimeout( function() {
            expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).toBe( true );
            // test relates to https://github.com/kobotoolbox/enketo-express/issues/608
            // input.validate is called by a comment widget on the linked question when the comment value changes
            // set question in valid state (not automatic, but by calling input.validate)
            $oneComment.val( 'comment' ).trigger( 'change' );
            form.input.validate( $one ).then( function() {
                expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).toBe( false );
                done();
            } );
        }, 100 );
    } );
} );

describe( 'getting related nodes', function() {

    it( 'excludes radiobuttons that are part of the same group', function() {
        var form = loadForm( 'radio.xml' );
        form.init();
        expect( form.getRelatedNodes( 'data-relevant' ).length ).toEqual( 1 );
    } );
} );

describe( 'clearing inputs', function() {
    var $fieldset = $( '<fieldset><input type="number" value="23" /><input type="text" value="abc" /><textarea>abcdef</textarea></fieldset>"' );

    it( 'works!', function() {
        expect( $fieldset.find( '[type="number"]' ).val() ).toEqual( '23' );
        expect( $fieldset.find( '[type="text"]' ).val() ).toEqual( 'abc' );
        expect( $fieldset.find( 'textarea' ).val() ).toEqual( 'abcdef' );

        $fieldset.clearInputs();

        expect( $fieldset.find( '[type="number"]' ).val() ).toEqual( '' );
        expect( $fieldset.find( '[type="text"]' ).val() ).toEqual( '' );
        expect( $fieldset.find( 'textarea' ).val() ).toEqual( '' );

    } );
} );

describe( 'form status', function() {
    var form = loadForm( 'thedata.xml' );
    form.init();

    it( 'correctly maintains edit status', function() {
        expect( form.editStatus ).toBe( false );
        form.view.$.find( 'input[name="/thedata/nodeA"]' ).val( '2010-10-01T11:12:00+06:00' ).trigger( 'change' );
        expect( form.editStatus ).toBe( true );
    } );
} );

describe( 'required enketo-transformer version', function() {
    var pkg = require( '../../package' );

    it( 'can be obtained', function() {
        var expected = pkg.devDependencies[ 'enketo-transformer' ];
        var actual = Form.getRequiredTransformerVersion();

        expect( actual ).toBe( expected,
            'It looks like enketo-transformer has been updated in package.json from ' + actual + ' to ' + expected + '.  ' +
            'You also need to update the value returned by From.getRequiredTransformerVersion() to the new version number.' );
    } );
} );

describe( 'jr:choice-name', function() {

    it( 'should match when there are spaces in arg strings', function() {
        // given
        var form = loadForm( 'jr-choice-name.xml' );
        form.init();

        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).toEqual( '[Default Value] Area' );
        expect( form.view.$.find( '.readonly .or-output' ).text() ).toEqual( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/input"]' ).val( 'abc' ).trigger( 'change' );

        // then
        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).toEqual( '[abc] Area' );

        // and
        // We don't expect the value change to cascade to a label until the choice value itself is changed.
        // See: https://github.com/enketo/enketo-core/issues/412
        expect( form.view.$.find( '.readonly .or-output' ).text() ).toEqual( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/translator"][value=health_center]' ).click().trigger( 'change' );

        // then
        expect( form.view.$.find( '.readonly .or-output' ).text() ).toEqual( '[abc] Health Center' );
    } );

    /** @see https://github.com/enketo/enketo-core/issues/490 */
    it( 'should handle regression reported in issue #490', function() {
        // given
        var form = loadForm( 'jr-choice-name.issue-490.xml' );
        form.init();

        // then
        expect( form.view.$.find( '.readonly .or-output' ).text() ).toEqual( 'unspecified' );

        // when
        form.view.$.find( '[name="/embedded-choice/translator"][value=clinic]' ).click().trigger( 'change' );

        // then
        expect( form.view.$.find( '.readonly .or-output' ).text() ).toEqual( 'Area' );
    } );
} );

describe( 'Form.prototype', function() {

    describe( '#replaceChoiceNameFn()', function() {

        $.each( {
            'jr:choice-name( /choice-regex/translator, " /choice-regex/translator ")': '"__MOCK_VIEW_VALUE__"',
            '     jr:choice-name(       /choice-regex/translator     ,  " /choice-regex/translator "   )    ': '     "__MOCK_VIEW_VALUE__"    ',
            'if(string-length( /embedded-choice/translator ) !=0, jr:choice-name( /embedded-choice/translator ,\' /embedded-choice/translator \'),\'unspecified\')': 'if(string-length( /embedded-choice/translator ) !=0, "__MOCK_VIEW_VALUE__",\'unspecified\')',
            'jr:choice-name( selected-at( /energy_1/light/light_equip , 1), " /energy_1/light/light_equip " )': '"__MOCK_VIEW_VALUE__"',
            'if( /data/C1 =01, jr:choice-name( /data/C2 ," /data/C2 "), jr:choice-name( /data/C3 ," /data/C3 " ) )': 'if( /data/C1 =01, "__MOCK_VIEW_VALUE__", "__MOCK_VIEW_VALUE__" )',
        }, function( initial, expected ) {
            it( 'should replace ' + initial + ' with ' + expected, function() {
                // given
                var form = mockChoiceNameForm();

                // when
                var actual = Form.prototype.replaceChoiceNameFn.call( form, initial );

                // then
                expect( actual ).toEqual( expected );
            } );
        } );
    } );
} );

function mockChoiceNameForm() {
    return {
        model: {
            evaluate: function() {
                return '__MOCK_MODEL_VALUE__';
            },
        },
        view: {
            '$': {
                find: function() {
                    return {
                        length: 1,
                        prop: function() {
                            return 'select';
                        },
                        find: function() {
                            return {
                                text: function() {
                                    return '__MOCK_VIEW_VALUE__';
                                },
                            };
                        },
                    };
                },
            },
        },
    };
}
