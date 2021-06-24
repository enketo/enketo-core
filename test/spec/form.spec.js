import { Form } from '../../src/js/form';
import $ from 'jquery';
import loadForm from '../helpers/load-form';
import forms from '../mock/forms';
import config from '../../config';
import pkg from '../../package';
import events from '../../src/js/event';
import dialog from '../../src/js/fake-dialog';

const stubDialogConfirm = () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    beforeEach( () => {
        sandbox = sinon.createSandbox();

        sandbox.stub( dialog, 'confirm' ).resolves( true );
    } );

    afterEach( () => {
        sandbox.restore();
    } );
};

describe( 'Getters ', () => {
    stubDialogConfirm();

    const form = loadForm( 'thedata.xml' );
    form.init();

    it( 'id() returns the formID', () => {
        expect( form.id ).to.equal( 'thedata' );
    } );
} );

describe( 'Output functionality ', () => {
    stubDialogConfirm();

    // These tests were orginally meant for modilabs/enketo issue #141. However, they passed when they were
    // failing in the enketo client itself (same form). It appeared the issue was untestable (except manually)
    // since the issue was resolved by updating outputs with a one millisecond delay (!).
    // Nevertheless, these tests can be useful.
    const form = loadForm( 'random.xml' );

    form.init();

    it( 'tested upon initialization: node random__', () => {
        const val = form.view.html.querySelector( '[data-value="/random/random__"]' ).textContent;
        expect( val.length >= 16 && val.length <= 17  ).to.equal( true );
    } );

    it( 'tested upon initialization: node uuid__', () => {
        const val =  form.view.html.querySelector( '[data-value="/random/uuid__"]' ).textContent;
        expect( val.length ).to.equal( 36 );
    } );
} );

describe( 'Output functionality inside branches that irrelevant upon load', () => {
    stubDialogConfirm();

    const form = loadForm( 'output-irrelevant.xml' );
    form.init();

    it( 'is evaluated after the branch becomes relevant', () => {
        form.view.$.find( 'input[name="/data/consent"]' ).val( 'yes' ).trigger( 'change' );
        expect( form.view.$.find( '.or-output' ).text() ).to.equal( 'mr' );
    } );
} );

describe( 'Output functionality within repeats', () => {
    stubDialogConfirm();

    let $o = [];
    const form = loadForm( 'outputs_in_repeats.xml' );
    form.init();
    form.view.$.find( '.add-repeat-btn' ).click();

    $o = form.view.$.find( '.or-output' );

    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 0 ).val( 'Martijn' ).trigger( 'change' );
    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 1 ).val( 'Beth' ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="elephant"]' ).eq( 0 ).prop( 'checked', true ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="rabbit"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );

    it( 'shows correct value when referring to repeated node', () => {
        expect( $o[ 0 ].textContent ).to.equal( 'Martijn' );
        expect( $o[ 1 ].textContent ).to.equal( 'Martijn' );
        expect( $o[ 2 ].textContent ).to.equal( 'elephant' );
        expect( $o[ 3 ].textContent ).to.equal( 'Martijn' );
        expect( $o[ 4 ].textContent ).to.equal( 'Beth' );
        expect( $o[ 5 ].textContent ).to.equal( 'Beth' );
        expect( $o[ 6 ].textContent ).to.equal( 'rabbit' );
        expect( $o[ 7 ].textContent ).to.equal( 'Beth' );
    } );
} );

describe( 'Preload and MetaData functionality', () => {
    stubDialogConfirm();

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on /[ROOT]/meta/instanceID', () => {
        const form = loadForm( 'random.xml' );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal().length ).to.equal( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on [ROOT]/orx:meta/orx:instanceID', () => {
        const form = loadForm( 'meta-namespace.xml' );
        form.init();
        expect( form.model.node( '/data/orx:meta/orx:instanceID' ).getVal().length ).to.equal( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID on /[ROOT]/meta/instanceID WITHOUT preload binding', () => {
        const form = loadForm( 'random.xml' );
        form.init();
        form.view.$.find( 'fieldset#or-preload-items' ).remove();
        expect( form.view.$.find( 'fieldset#or-preload-items' ).length ).to.equal( 0 );
        expect( form.model.node( '/random/meta/instanceID' ).getVal().length ).to.equal( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID WITH a preload binding', () => {
        const form = loadForm( 'preload.xml' );
        form.init();
        const sel = 'fieldset#or-preload-items input[name="/preload/meta/instanceID"][data-preload="uid"]';
        expect( form.view.$.find( sel ).length ).to.equal( 1 );
        expect( form.model.node( '/preload/meta/instanceID' ).getVal().length ).to.equal( 41 );
    } );

    // Form.js no longer has anything to do with instanceID population. Test should still pass though.
    it( 'does not generate a new instanceID if one is already present', () => {
        const form = new Form( document.createRange().createContextualFragment( `<div>${forms[ 'random.xml' ].html_form}</div>` ).querySelector( 'form' ), {
            modelStr: forms[ 'random.xml' ].xml_model.replace( '<instanceID/>', '<instanceID>existing</instanceID>' )
        } );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal() ).to.equal( 'existing' );
    } );

    it( 'generates a timeStart on /[ROOT]/meta/timeStart WITH a preload binding', () => {
        const form = loadForm( 'preload.xml' );
        form.init();
        expect( form.model.node( '/preload/start' ).getVal().length > 10 ).to.equal( true );
    } );

    it( 'generates a timeEnd on init and updates this after a beforesave event WITH a preload binding', done => {
        let timeEnd;
        let timeEndNew;

        const form = loadForm( 'preload.xml' );
        form.init();
        timeEnd = form.model.node( '/preload/end' ).getVal();

        // populating upon initalization is not really a feature, could be removed perhaps
        expect( timeEnd.length > 10 ).to.equal( true );

        setTimeout( () => {
            form.view.html.dispatchEvent( events.BeforeSave() );
            timeEndNew = form.model.node( '/preload/end' ).getVal();
            expect( new Date( timeEndNew ) - new Date( timeEnd ) ).to.be.above( 1000 );
            expect( new Date( timeEndNew ) - new Date( timeEnd ) ).to.be.below( 1050 );
            done();
        }, 1000 );

    } );

    it( 'also works with nodes that have a corresponding form control element', () => {
        const form = loadForm( 'preload-input.xml' );
        form.init();

        [ '/dynamic-default/two', '/dynamic-default/four', '/dynamic-default/six' ].forEach( path => {
            expect( form.view.$.find( `[name="${path}"]` ).val().length > 9 ).to.equal( true );
            expect( form.model.node( path ).getVal().length > 9 ).to.equal( true );
        } );
    } );

    it( 'some session context can be passed to the data.session property when instantiating form', () => {
        const session = {
            deviceid: 'a',
            username: 'b',
            email: 'c',
            phonenumber: 'd',
            simserial: 'e',
            subscriberid: 'f'
        };
        const form = loadForm( 'preload.xml', undefined, undefined, session );
        form.init();

        [ 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid' ].forEach( prop => {
            expect( form.model.node( `/preload/${prop}` ).getVal() ).to.equal( session[ prop ] );
        } );
    } );

    function testPreloadExistingValue( node ) {
        it( `obtains unchanged preload value of item (WITH preload binding): ${node.selector}`, () => {
            const form =  loadForm( 'preload.xml',
                `<preload>
                    <start>2012-10-30T08:44:57.000-06</start>
                    <end>2012-10-30T08:44:57.000-06:00</end>
                    <today>2012-10-30</today>
                    <deviceid>some value</deviceid>
                    <subscriberid>some value</subscriberid>
                    <imei>2332</imei>
                    <email/>
                    <simserial></simserial>
                    <phonenumber>234234324</phonenumber>
                    <username>John Doe</username>
                    <start_note></start_note>
                    <end_note/>
                    <today_note/>
                    <deviceid_note/>
                    <subscriberid_note/>
                    <imei_note/>
                    <phonenumber_note/>
                    <username_note/>
                    <meta>
                        <instanceID>uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8</instanceID>
                    </meta>
                </preload>`
            );
            form.init();
            expect( form.model.node( node.selector ).getVal() ).to.equal( node.result );
        } );
    }

    function testPreloadNonExistingValue( node ) {
        it( `populates previously empty preload item (WITH preload binding): ${node.selector}`, () => {
            const form = loadForm( 'preload.xml' );
            form.init();
            expect( form.model.node( node.selector ).getVal().length > 0 ).to.equal( true );
        } );
    }

    const t = [
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

    for ( let i = 0; i < t.length; i++ ) {
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

describe( 'Loading instance values into html input fields functionality', () => {
    stubDialogConfirm();

    let form;

    it( 'correctly populates input fields of non-repeat node names in the instance', () => {
        form = loadForm( 'thedata.xml' );
        form.init();
        expect( form.view.$.find( '[name="/thedata/nodeB"]' ).val() ).to.equal( 'b' );
        expect( form.view.$.find( '[name="/thedata/repeatGroup/nodeC"]' ).eq( 2 ).val() ).to.equal( 'c3' );
        expect( form.view.$.find( '[name="/thedata/nodeX"]' ).val() ).to.equal( undefined );
    } );

    it( 'correctly populates input field even if the instance node name is not unique and occurs at multiple levels', () => {
        form = loadForm( 'nodename.xml' );
        form.init();
        expect( form.view.$.find( '[name="/nodename_bug/hh/hh"]' ).val() ).to.equal( 'hi' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/718
    it( 'correctly populates if the first radiobutton or first checkbox only has a value', () => {
        form = loadForm( 'issue208.xml', '<issue208><rep><nodeA>yes</nodeA></rep></issue208>' );
        form.init();
        const $input = form.view.$.find( '[data-name="/issue208/rep/nodeA"]' ).eq( 0 );
        //form.input.setVal( $input, 'yes' );
        expect( $input.is( ':checked' ) ).to.equal( true );
    } );

} );

describe( 'calculations', () => {
    stubDialogConfirm();

    it( 'also work inside repeats', () => {
        const form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click();
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '10' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '20' ).trigger( 'change' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal() ).to.equal( '200' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal() ).to.equal( '400' );
    } );

    it( 'are not performed if the calculation is not relevant', () => {
        const form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();

        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '20' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '5' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(2)' ).val( '40' ).trigger( 'change' );

        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal() ).to.equal( '400' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal() ).to.equal( '' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 2 ).getVal() ).to.equal( '800' );
    } );

    it( 'outside a repeat are updated if they are dependent on a repeat node', () => {
        const f = loadForm( 'repeat-count.xml' );
        const cnt = '[name="/dynamic-repeat-count/count"]';
        f.init();
        const $form = f.view.$;
        const $model = $( f.model.xml );
        // increase count to 10
        $form.find( cnt ).val( 10 ).trigger( 'change' );
        expect( $model.find( 'sum_note' ).text() ).to.equal( '10' );
        expect( $model.find( 'txtsum_note' ).text() ).to.equal( '10' );
    } );

    // https://github.com/enketo/enketo-core/issues/479
    it( 'inside a repeat using the position(..) function are updated if the position changes due to repeat removal', () => {
        const form = loadForm( 'repeat-position.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click().click();
        form.view.$.find( '.remove' ).eq( 1 ).click();
        expect( form.model.xml.querySelectorAll( 'pos' )[ 1 ].textContent ).to.equal( '2' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 1 ).text() ).to.equal( '2' );
        expect( form.model.xml.querySelectorAll( 'pos' )[ 2 ].textContent ).to.equal( '3' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 2 ).text() ).to.equal( '3' );
    } );

    // https://github.com/enketo/enketo-core/issues/755
    it( 'do not cause an exception when a repeat is removed', () => {
        const form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        const addButton =  form.view.html.querySelector( '.add-repeat-btn' );
        addButton.click();
        addButton.click();
        const deleteAction = () => { [ ...form.view.html.querySelectorAll( '.remove' ) ].pop().click();};
        expect( deleteAction ).not.to.throw();
    } );

} );

describe( 'branching functionality', () => {
    stubDialogConfirm();

    it( 'hides non-relevant branches upon initialization', () => {
        const form = loadForm( 'group_branch.xml' );
        form.init();
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).to.equal( true );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).to.equal( 1 );
    } );

    it( 'reveals a group branch when the relevant condition is met', () => {
        const form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'no' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).to.equal( true );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).to.equal( false );
    } );

    it( 'reveals a question when the relevant condition is met', () => {
        const form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 3 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).to.equal( 1 );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 2 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).to.equal( 0 );
    } );

    /*
    Issue 208 was a combination of two issues:
        1. branch logic wasn't evaluated on repeated radiobuttons (only on the original) in branch.update()
        2. position[i] wasn't properly injected in makeBugCompiant() if the context node was a radio button or checkbox
     */
    it( 'a) evaluates relevant logic on a repeated radio-button-question and b) injects the position correctly (issue 208)', () => {
        const repeatSelector = '.or-repeat[name="/issue208/rep"]';
        const form = loadForm( 'issue208.xml' );
        form.init();

        form.view.$.find( '.add-repeat-btn' ).click();
        expect( form.view.$.find( repeatSelector ).length ).to.equal( 2 );
        //check if initial state of 2nd question in 2nd repeat is disabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' )
            .hasClass( 'disabled' ) ).to.equal( true );
        //select 'yes' in first question of 2nd repeat
        form.model.node( '/issue208/rep/nodeA', 1 ).setVal( 'yes', null, 'string' );
        //doublecheck if new value was set
        expect( form.model.node( '/issue208/rep/nodeA', 1 ).getVal() ).to.equal( 'yes' );
        //check if 2nd question in 2nd repeat is now enabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' ).hasClass( 'disabled' ) ).to.equal( false );

    } );

    it( 're-evaluates when a node with a relative path inside a relevant expression is changed', () => {
        const form = loadForm( 'relative.xml' );
        form.init();
        const $form = form.view.$,
            $a = $form.find( '[name="/relative/a"]' ),
            $branch = $form.find( '[name="/relative/c"]' ).closest( '.or-branch' );

        $a.val( 'abcd' ).trigger( 'change' );
        expect( $branch.length ).to.equal( 1 );
        expect( $branch.hasClass( 'disabled' ) ).to.equal( false );
    } );

    describe( 'when used with calculated items', () => {
        const form = loadForm( 'calcs.xml' );
        form.init();
        const $node = form.view.$.find( '[name="/calcs/cond1"]' );
        const dataO = form.model;

        it( 'evaluates a calculated item only when it becomes relevant', () => {
            // node without relevant attribute:
            expect( dataO.node( '/calcs/calc11' ).getVal() ).to.equal( '12' );
            // node that is non-relevant
            expect( dataO.node( '/calcs/calc1' ).getVal() ).to.equal( '' );
            $node.val( 'yes' ).trigger( 'change' );
            // node that has become relevant
            expect( dataO.node( '/calcs/calc1' ).getVal() ).to.equal( '3' );
            // make non-relevant again (was a bug)
            $node.val( 'no' ).trigger( 'change' );
            // double-check that calc11 is unaffected (was a bug)
            expect( dataO.node( '/calcs/calc11' ).getVal() ).to.equal( '12' );
            // node that is non-relevant, value will stay (until record is finalized)
            expect( dataO.node( '/calcs/calc1' ).getVal() ).to.equal( '3' );

        } );

        it( 'does not empty an already calculated item once it becomes non-relevant', () => {
            $node.val( 'yes' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal() ).to.equal( '3' );
            $node.val( 'no' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal() ).to.equal( '3' );
        } );
    } );

    describe( 'inside repeats when multiple repeats are present upon loading', () => {

        it( 'correctly evaluates the relevant logic of each question inside all repeats (issue #507)', () => {
            const form = loadForm( 'multiple_repeats_relevant.xml' );
            form.init();
            const $relNodes = form.view.$.find( '[name="/multiple_repeats_relevant/rep/skipq"]' ).parent( '.or-branch' );
            expect( $relNodes.length ).to.equal( 2 );
            //check if both questions with 'relevant' attributes in the 2 repeats are disabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).to.equal( true );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).to.equal( true );
        } );

        it( 'correctly evaluates the relevant logic of each simple select question inside all repeats (issue #442 core)', () => {
            const form = loadForm( 'repeat-relevant-select1.xml', '<Enketo_tests><details><fruits>pear</fruits><location></location></details><details><fruits>mango</fruits><location>kisumu</location></details><details><fruits>mango</fruits><location>kisumu</location></details><meta><instanceID>a</instanceID></meta></Enketo_tests>' );
            form.init();
            const $relNodes = form.view.$.find( '[data-name="/Enketo_tests/details/location"]' ).closest( '.or-branch' );
            expect( $relNodes.length ).to.equal( 3 );
            //check if radiobuttons with 'relevant' attributes in the second and third repeats are initialized and enabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).to.equal( true );
            expect( $relNodes.eq( 1 ).hasClass( 'pre-init' ) ).to.equal( false );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).to.equal( false );
            expect( $relNodes.eq( 2 ).hasClass( 'pre-init' ) ).to.equal( false );
            expect( $relNodes.eq( 2 ).hasClass( 'disabled' ) ).to.equal( false );
        } );

    } );

    // https://github.com/kobotoolbox/enketo-express/issues/846
    describe( 'inside repeats for a calculation without a form control when no repeats exist', () => {
        const form = loadForm( 'calcs_in_repeats_2.xml' );
        const loadErrors = form.init();
        it( 'does not throw an error', () => {
            expect( loadErrors.length ).to.equal( 0 );
        } );
    } );

    describe( 'in nested branches ', () => {
        const form = loadForm( 'nested-branches.xml' );

        form.init();
        const $nestedBranch = form.view.$.find( '[name="/nested-branches/group/c"]' ).closest( '.question' );

        it( 'works correctly when an ancestor branch gets enabled', () => {
            expect( $nestedBranch.closest( '.disabled' ).length ).to.equal( 1 );
            // enable parent branch
            form.model.node( '/nested-branches/a', 0 ).setVal( '1' );
            expect( $nestedBranch.closest( '.disabled' ).length ).to.equal( 0 );
            // check if nested branch has been initialized and is enabled
            expect( $nestedBranch.hasClass( 'pre-init' ) ).to.equal( false );
            expect( $nestedBranch.hasClass( 'disabled' ) ).to.equal( false );
        } );
    } );

    // https://github.com/enketo/enketo-core/issues/444
    describe( 'in nested repeats with a <select> that has a relevant', () => {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 1 child repeat (<select> with relevant).
        // The second child repeat in each parent repeat with name 'type_other' is non-relevant.
        const instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock></region><region><livestock><type>d</type></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        const form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();
        it( 'initializes all nested repeat questions', () => {
            expect( form.view.$.find( '.or-branch' ).length ).to.equal( 4 );
        } );
    } );

    describe( 'handles clearing of form control values in non-relevant branches', () => {
        const name = 'relevant-default.xml';
        const one = '/relevant-default/one';
        const two = '/relevant-default/two';
        const three = '/relevant-default/grp/three';
        const four = '/relevant-default/grp/four';

        it( 'by not clearing UPON LOAD', () => {
            const form = loadForm( name );
            form.init();
            expect( form.view.$.find( `[name="${two}"]` ).closest( '.disabled' ).length ).to.equal( 1 );
            expect( form.view.$.find( `[name="${three}"]` ).closest( '.disabled' ).length ).to.equal( 1 );
            expect( form.model.node( two ).getVal() ).to.equal( 'two' );
            expect( form.model.node( three ).getVal() ).to.equal( 'three' );
        } );

        it( 'by not clearing values of non-relevant questions during FORM TRAVERSAL', () => {
            const form = loadForm( name );
            form.init();
            const $one = form.view.$.find( `[name="${one}"]` );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( `[name="${two}"]` ).closest( '.disabled' ).length ).to.equal( 0 );
            expect( form.view.$.find( `[name="${three}"]` ).closest( '.disabled' ).length ).to.equal( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal() ).to.equal( 'two' );
            expect( form.model.node( three ).getVal() ).to.equal( 'three' );
        } );

        it( 'by clearing values of non-relevant questions when form.clearNonRelevant() is called', () => {
            const form = loadForm( name );
            form.init();
            expect( form.model.node( two ).getVal() ).to.equal( 'two' );
            expect( form.model.node( three ).getVal() ).to.equal( 'three' );
            form.clearNonRelevant();
            expect( form.model.node( two ).getVal() ).to.equal( '' );
            expect( form.model.node( three ).getVal() ).to.equal( '' );
        } );

        it( 'by not conducting calculations upon load if the calc node is not relevant', () => {
            const form = loadForm( name );
            form.init();
            expect( form.model.node( four ).getVal() ).to.equal( '' );
        } );

    } );


    describe( 'handles calculated values in non-relevant/relevant branches with default settings', () => {
        const name = 'calc-in-group-with-relevant.xml';
        const cond = '/calc-in-group-with-relevant/cond';
        const groupCalc = '/calc-in-group-with-relevant/grp/groupCalc';
        const groupReadonlyCalc = '/calc-in-group-with-relevant/grp/groupReadonlyCalc';
        const readonlyCalc = '/calc-in-group-with-relevant/readonlyCalc';
        const calc = '/calc-in-group-with-relevant/calc';

        it( 'by not clearing when relevant upon load', () => {
            const form = loadForm( name );
            form.init();
            expect( form.model.node( groupCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( readonlyCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( calc ).getVal() ).to.equal( '34' );
        } );

        it( 'by not clearing calculations when parent group of calculation itself becomes non-relevant', () => {
            const form = loadForm( name );
            form.init();
            form.view.$.find( `[name="${cond}"]` ).val( 'hide' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal() ).to.equal( '34' );

            // bonus, questions outside group but also non-relevant
            expect( form.model.node( readonlyCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( calc ).getVal() ).to.equal( '34' );
        } );

        it( 'by re-populating calculations when parent group of calculation itself becomes relevant', () => {
            const form = loadForm( name );
            form.init();
            // make non-relevant -> clear (see previous test)
            form.view.$.find( `[name="${cond}"]` ).val( 'hide' ).trigger( 'change' );
            // make relevant again
            form.view.$.find( `[name="${cond}"]` ).val( '' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal() ).to.equal( '34' );
            // bonus, questions outside group but also irrelevant
            expect( form.model.node( readonlyCalc ).getVal() ).to.equal( '34' );
            expect( form.model.node( calc ).getVal() ).to.equal( '34' );
        } );

    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', () => {
        it( 'initializes the relevants', () => {
            const form = loadForm( 'repeat-child-relevant.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            expect( form.view.$.find( '.or-branch' ).length ).to.equal( 2 );
            expect( form.view.$.find( '.or-branch.pre-init' ).length ).to.equal( 0 );
        } );
    } );

    // This (fixed) issue is not related to indexed-repeat function. In native XPath it is the same.
    describe( 'on a group with an expression that refers to a repeat node value', () => {
        it( 're-evaluates when the referred node changes', () => {
            const form = loadForm( 'group-relevant-indexed-repeat.xml' );
            form.init();
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).to.equal( 1 );
            form.view.$.find( '[name="/data/PROCEDURE/PROC_GRID/PROC"]' ).val( '6' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).to.equal( 0 );
            form.view.$.find( '.add-repeat-btn' ).click();
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).to.equal( 0 );
            form.view.$.find( '[name="/data/PROCEDURE/PROC_GRID/PROC"]' ).val( '1' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/data/LYMPHNODES/LYMNDISS"]' ).closest( '.disabled' ).length ).to.equal( 1 );
        } );
    } );

    describe( 'on a question inside a REMOVED repeat', () => {
        it( 'does not try to evaluate it', ( done ) => {
            const form = loadForm( 'repeat-irrelevant-date.xml' );
            form.init();
            form.view.$.find( '[name="/repeat/rep"] button.remove' ).click();
            // This is testing what happens inside getDataStrWithoutIrrelevantNodes
            // It tests whether the cache is updated when a repeat is removed.s
            // https://github.com/kobotoolbox/enketo-express/issues/1014
            setTimeout( () => {
                expect( form.getRelatedNodes( 'data-relevant' ).length ).to.equal( 0 );
                done();
            }, 650 );

        } );
    } );

} );

describe( 'obtaining XML string from form without irrelevant nodes', () => {
    stubDialogConfirm();

    it( 'works for calcs that are non-relevant upon load', () => {
        const form = loadForm( 'calcs.xml' );
        const match = '<calc1/>';
        form.init();

        expect( form.getDataStr() ).to.include( match );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.to.include( match );
    } );

    it( 'works for calcs that become non-relevant after load', () => {
        let $node;
        const form = loadForm( 'calcs.xml' );
        form.init();
        $node = form.view.$.find( '[name="/calcs/cond1"]' );

        $node.val( 'yes' ).trigger( 'change' );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).to.include( '<calc1>3</calc1>' );

        $node.val( 'nope' ).trigger( 'change' );

        const res = form.getDataStr( {
            irrelevant: false
        } );
        expect( res ).not.to.include( '<calc1/>' );
        expect( res ).not.to.include( '<calc1>' );
    } );

    it( 'works for a nested branch where there is an relevant descendant of an irrelevant ancestor', () => {
        const form = loadForm( 'nested-branches.xml' );
        const match = '<c/>';
        form.init();

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.to.include( match );

    } );

    // This test also checks that no exception occurs when an attempt is made to remove the <c> node
    // when it no longer exists because its parent has already been removed.
    it( 'works for a nested branch where there is an irrelevant descendant of an irrelevant ancestor', () => {
        const form = loadForm( 'nested-branches.xml' );
        const match = '<c/>';
        form.init();
        form.view.$.find( '[name="/nested-branches/b"]' ).val( 0 ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.to.include( match );

    } );

    it( 'works if repeat count is 0', () => {
        // When repeat count is zero there is no context node to pass to evaluator.
        const form = loadForm( 'repeat-count-relevant.xml' );
        const getFn = () => form.getDataStr( {
            irrelevant: false
        } );
        form.init();
        expect( getFn ).not.to.throw();
        expect( getFn() ).not.to.include( '<rep>' );
        expect( getFn() ).to.include( '<q1/>' );
    } );

    // Issue https://github.com/enketo/enketo-core/issues/443: The incorrect nested repeat nodes are removed.
    it( 'works for nested repeats where some children are irrelevant', () => {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 2 child repeats and certain values.
        // The second child repeat in each parent repeat with name 'type_other' is irrelevant.
        const instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        const form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();

        // check setup
        expect( form.getDataStr( {
            irrelevant: true
        } ).replace( />\s+</g, '><' ) ).to.include( '<region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );

        // perform actual tests
        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).to.include( '<region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/824
    it( 'works for simple "select" (checkbox) questions inside repeats', () => {
        const form = loadForm( 'repeat-relevant-select.xml' );
        const repeat = '.or-repeat[name="/data/details"]';
        const fruit = '[name="/data/details/fruits"]';
        const location = '[name="/data/details/location"]';
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();
        form.view.$.find( repeat ).eq( 0 ).find( `${fruit}[value="pear"]` ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( `${fruit}[value="mango"]` ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 2 ).find( `${fruit}[value="pear"]` ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( `${location}[value="nairobi"]` ).prop( 'checked', true ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).to.include( '<details><fruits>pear</fruits></details><details><fruits>mango</fruits><location>nairobi</location></details><details><fruits>pear</fruits></details>' );
    } );

} );

describe( 'validation', () => {
    stubDialogConfirm();

    describe( 'feedback to user after equired field validation', () => {
        let form, numberInput, numberLabel;

        beforeEach( () => {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'group_branch.xml' );
            form.init();
            numberInput = form.view.html.querySelector( '[name="/data/group/nodeB"]' );
            numberLabel = form.input.getWrapNode( numberInput );
        } );

        it( 'validates a DISABLED and required number field without a value', () => {
            numberInput.value = '';
            numberInput.dispatchEvent( events.Change() );
            expect( numberLabel ).not.to.equal( null );
            expect( numberInput.value.length ).to.equal( 0 );
            //expect( numberLabel.closest( '.or-group' ).prop( 'disabled' ) ).to.equal( true );
            expect( numberLabel.classList.contains( 'invalid-required' ) ).to.equal( false );
        } );

        //see issue #144
        it( 'validates an enabled and required number field with value 0 and 1', () => {
            const a = form.view.html.querySelector( '[name="/data/nodeA"]' );
            a.value = 'yes';
            a.dispatchEvent( events.Change() );

            expect( numberLabel ).not.to.equal( null );
            numberInput.value === 0;
            numberInput.dispatchEvent( events.Change() );
            //.trigger( 'validate' );
            expect( numberLabel.classList.contains( 'invalid-required' ) ).to.equal( false );
            numberInput.value = 1;
            numberInput.dispatchEvent( events.Change() );
            //.trigger( 'validate' );
            expect( numberLabel.classList.contains( 'invalid-required' ) ).to.equal( false );
        } );

        // failing
        it( 'invalidates an enabled and required number field without a value', done => {
            // first make branch relevant
            const a = form.view.html.querySelector( '[name="/data/nodeA"]' );
            a.value = 'yes';
            a.dispatchEvent( events.Change() );
            // now set value to empty
            numberInput.value = '';
            numberInput.dispatchEvent( events.Change() );
            form.validateInput( numberInput )
                .then( () => {
                    expect( numberLabel.classList.contains( 'invalid-required' ) ).to.equal( true );
                    done();
                } );
        } );

        it( 'invalidates an enabled and required textarea that contains only a newline character or other whitespace characters', done => {
            form = loadForm( 'thedata.xml' );
            form.init();
            const $textarea = form.view.$.find( '[name="/thedata/nodeF"]' );
            $textarea.val( '\n' ).trigger( 'change' );
            form.validateInput( $textarea[ 0 ] )
                .then( () => {
                    expect( $textarea.length ).to.equal( 1 );
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).to.equal( true );
                    $textarea.val( '  \n  \n\r \t ' ).trigger( 'change' );

                    return form.validateInput( $textarea[ 0 ] );
                } )
                .then( () => {
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).to.equal( true );
                    done();
                } );
        } );

        it( 'hides a required "*" if the expression is dynamic and evaluates to false', done => {
            form = loadForm( 'dynamic-required.xml' );
            form.init();
            const $dynReq = form.view.$.find( '.required' );

            expect( $dynReq.eq( 0 ).hasClass( 'hide' ) ).to.equal( false );
            form.validateInput( form.view.html.querySelector( '[name="/dynamic-required/num"]' ) ).then( () => {
                expect( $dynReq.eq( 1 ).hasClass( 'hide' ) ).to.equal( true );
                done();
            } );
        } );

    } );

    describe( 'public validate method', () => {

        it( 'returns false if constraint is false', done => {
            const form = loadForm( 'thedata.xml' );
            form.init();

            // first make the form valid to make sure we are testing the right thing
            form.model.xml.querySelector( 'nodeF' ).textContent = 'f';

            form.validate()
                .then( result => {
                    // check test setup
                    expect( result ).to.equal( true );
                    // now make make sure a constraint fails
                    form.model.xml.querySelector( 'nodeB' ).textContent = 'c';

                    return form.validate();
                } )
                .then( result => {
                    expect( result ).to.equal( false );
                    done();
                } );
        } );

    } );

    // These tests were a real pain to write because of the need to change a global config property.
    describe( 'with validateContinuously', () => {
        let form;
        const B = '[name="/data/b"]';
        const C = '[name="/data/c"]';
        const dflt = config.validateContinuously;

        /** @type {number} */
        let testTimeout;

        const setValue = ( selector, val ) => new Promise( resolve => {
            // violate constraint for c
            form.view.$.find( selector ).val( val ).trigger( 'change' );
            setTimeout( () => {
                resolve();
            }, 800 );
        } );

        beforeEach( () => {
            testTimeout = mocha.timeout();


        } );

        after( () => {
            // reset to default
            config.validateContinuously = dflt;
        } );


        it( '=true will immediately re-evaluate a constraint if its dependent value changes', done => {
            form = loadForm( 'constraint-dependency.xml' );
            form.init();
            setValue( C, '12' )
                .then( () => {
                    config.validateContinuously = false;

                    // violate
                    return setValue( B, 'a' );
                } )
                .then( () => {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( false );

                    // pass
                    return setValue( B, 'b' );
                } )
                .then( () => {
                    config.validateContinuously = true;

                    //violate
                    return setValue( B, 'a' );
                } )
                .then( () => {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( true );
                    done();
                } )
                .catch( done );
        } ).timeout( 5000 );

        it( '=true, will not immediate validate a brand new repeat but will validate nodes that depend on that repeat', done => {
            const rep = '[name="/repeat-required/rep"]';
            const d = '[name="/repeat-required/d"]';
            form = loadForm( 'repeat-required.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();

            // an ugly test, I don't care
            setTimeout( () => {
                // new repeat should not show errors
                expect( form.view.$.find( rep ).eq( 1 ).find( '.invalid-required, .invalid-constraint' ).length ).to.equal( 0 );
                // we now have two repeats so node d should not be marked as invalid
                expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).to.equal( false );

                form.view.$.find( '.add-repeat-btn' ).click();

                setTimeout( () => {
                    // new repeat should not show errors
                    expect( form.view.$.find( rep ).eq( 2 ).find( '.invalid-required, .invalid-constraint' ).length ).to.equal( 0 );
                    // we now have three repeats so node d should be marked as invalid
                    expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).to.equal( true );

                    done();
                }, 800 );
            }, 800 );
        } );

        it( 'immediately validates fields that get their values updated programmatically but have no constraint dependencies', done => {
            form = loadForm( 'readonly-invalid.xml' );
            form.init();
            config.validateContinuously = true;
            const src = '[name="/readonly-invalid/txt"]';
            const one = '[name="/readonly-invalid/n1"]';
            const two = '[name="/readonly-invalid/n2"]';

            setValue( src, 'invalid' )
                .then( () => {
                    expect( form.view.$.find( one ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( true );
                    expect( form.view.$.find( two ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( true );

                    return setValue( src, 'valid' );
                } )
                .then( () => {
                    expect( form.view.$.find( one ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( false );
                    expect( form.view.$.find( two ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).to.equal( false );
                    done();
                } );
        } );

        // Calling validation before repeats are initialized causes repeats.getIndex to fail. Since default value aren't validated upon
        // load, it makes sense to not evaluate calculations upon load either.
        // https://github.com/OpenClinica/enketo-express-oc/issues/109#issuecomment-424084781
        it( 'does not validate a calculation during initial load even if validateContinuously is set to true', () => {
            config.validateContinuously = true;
            const form = loadForm( 'repeat-calc.xml', '<repeat-calc><rep><num>1</num></rep><meta><instanceID>a</instanceID></meta></repeat-calc>' );
            const loadErrors = form.init();
            expect( loadErrors ).to.deep.equal( [] );
        } );

    } );

} );

describe( 'Readonly questions', () => {
    stubDialogConfirm();

    it( 'show their calculated value', () => {
        const form = loadForm( 'readonly.xml' );
        form.init();
        const $input = form.view.$.find( '[name="/readonly/a"]' );
        expect( $input.val() ).to.equal( 'martijn' );
        expect( $input.closest( '.question' ).hasClass( 'note' ) ).to.equal( false );
    } );

    it( 'show a default text input value', () => {
        const form = loadForm( 'readonly.xml' );
        form.init();
        const $input = form.view.$.find( '[name="/readonly/b"]' );
        expect( $input.val() ).to.equal( 'is' );
        expect( $input.closest( '.question' ).hasClass( 'note' ) ).to.equal( false );
    } );
} );

describe( 'Required questions', () => {
    stubDialogConfirm();

    it( 'dynamically update the asterisk visibility in real-time', () => {
        const form = loadForm( 'required.xml' );
        form.init();
        const $input = form.view.$.find( '[name="/required/a"]' );
        const $asterisk = form.view.$.find( '[name="/required/b"]' ).closest( '.question' ).find( '.required' );
        expect( $asterisk.hasClass( 'hide' ) ).to.equal( true );
        $input.val( 'yes' ).trigger( 'change' );
        expect( $asterisk.hasClass( 'hide' ) ).to.equal( false );
    } );

    it( 'fail validation if the value includes only whitespace', done => {
        const form = loadForm( 'required.xml' );
        form.init();
        form.view.$.find( '[name="/required/a"]' ).val( 'yes' ).trigger( 'change' );
        const $input = form.view.$.find( '[name="/required/b"]' );
        $input.val( ' a ' ).trigger( 'change' );

        setTimeout( () => {
            $input.val( '      ' ).trigger( 'change' );
            setTimeout( () => {
                expect( $input.closest( '.question' ).hasClass( 'invalid-required' ) ).to.equal( true );
                done();
            }, 100 );
        }, 100 );
    } );
} );

describe( 're-validating inputs and updating user feedback', () => {
    stubDialogConfirm();

    const form = loadForm( 'comment.xml' );
    let $one;
    let $oneComment;
    form.init();
    $one = form.view.$.find( '[name="/comment/one"]' );
    $oneComment = form.view.$.find( '[name="/comment/one_comment"]' );
    it( 'works', done => {
        // set question "one" in invalid state (automatic)
        $one.val( '' ).trigger( 'change' );
        // validation is asynchronous
        setTimeout( () => {
            expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).to.equal( true );
            // test relates to https://github.com/kobotoolbox/enketo-express/issues/608
            // input.validate is called by a comment widget on the linked question when the comment value changes
            // set question in valid state (not automatic, but by calling input.validate)
            $oneComment.val( 'comment' ).trigger( 'change' );
            form.input.validate( $one[ 0 ] ).then( () => {
                expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).to.equal( false );
                done();
            } );
        }, 100 );
    } );
} );

describe( 'getting related nodes', () => {
    stubDialogConfirm();

    it( 'excludes radiobuttons that are part of the same group', () => {
        const form = loadForm( 'radio.xml' );
        form.init();
        expect( form.getRelatedNodes( 'data-relevant' ).length ).to.equal( 1 );
    } );
} );

describe( 'white-space-only input', () => {
    stubDialogConfirm();

    // This is e.g. important for automatic value-change log creation in OpenClinica.
    it( 'does not fire an xforms-value-changed event', done => {
        const form = loadForm( 'thedata.xml' );
        form.init();
        const $input = form.view.$.find( '[name="/thedata/nodeF"]' );
        let counter = 0;
        $input[ 0 ].addEventListener( new events.XFormsValueChanged().type, () => counter++ );

        function inputVal( val ) {
            return new Promise( resolve => {
                $input.val( val ).trigger( 'change' );
                setTimeout( resolve, 500 );
            } );
        }
        inputVal( '  ' )
            .then( () => {
                expect( counter ).to.equal( 0 );

                return inputVal( ' a' );
            } )
            .then( () => {
                expect( counter ).to.equal( 1 );

                return inputVal( '   ' );
            } )
            .then( () => {
                expect( counter ).to.equal( 2 );

                return inputVal( ' ' );
            } )
            .then( () => {
                expect( counter ).to.equal( 2 );

                return inputVal( '' );
            } )
            .then( () => {
                expect( counter ).to.equal( 2 );
                done();
            } )
            .catch( done );
    } ).timeout( 5000 );

} );


describe( 'form status', () => {
    stubDialogConfirm();

    const form = loadForm( 'thedata.xml' );
    form.init();

    it( 'correctly maintains edit status', () => {
        expect( form.editStatus ).to.equal( false );
        form.view.$.find( 'input[name="/thedata/nodeA"]' ).val( '2010-10-01T11:12:00' ).trigger( 'change' );
        expect( form.editStatus ).to.equal( true );
    } );
} );

describe( 'Form.prototype.getModelValue', () => {
    stubDialogConfirm();

    const form = loadForm( 'nested_repeats.xml' );
    form.init();
    it( 'returns the value of the corresponding model node for a given form control', () => {
        const results = [];
        for ( const input of form.view.html.querySelectorAll( '[name="/nested_repeats/kids/kids_details/immunization_info/vaccine"]' ) ) {
            results.push( form.getModelValue( $( input ) ) );
        }
        expect( results ).to.deep.equal( [ 'Polio', 'Rickets', 'Malaria', 'Flu', 'Polio' ] );
    } );

} );

describe( 'required enketo-transformer version', () => {
    stubDialogConfirm();

    it( 'can be obtained', () => {
        const expected = pkg.devDependencies[ 'enketo-transformer' ];
        const actual = Form.requiredTransformerVersion;

        expect( actual ).to.equal( expected,
            `It looks like enketo-transformer has been updated in package.json from ${actual} to ${expected}.  You also need to update the value returned by From.requiredTransformerVersion to the new version number.` );
    } );
} );

describe( 'jr:choice-name', () => {
    stubDialogConfirm();

    it( 'should match when there are spaces in arg strings', () => {
        // given
        const form = loadForm( 'jr-choice-name.xml' );
        form.init();

        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).to.equal( '[Default Value] Area' );
        expect( form.view.html.querySelectorAll( '.readonly .or-output' )[0].textContent ).to.equal( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/input"]' ).val( 'abc' ).trigger( 'change' );

        // then
        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).to.equal( '[abc] Area' );

        // and
        // We don't expect the value change to cascade to a label until the choice value itself is changed.
        // See: https://github.com/enketo/enketo-core/issues/412
        expect( form.view.html.querySelectorAll( '.readonly .or-output' )[0].textContent ).to.equal( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/translator"][value=health_center]' ).click().trigger( 'change' );

        // then
        expect( form.view.html.querySelectorAll( '.readonly .or-output' )[0].textContent ).to.equal( '[abc] Health Center' );
    } );

    it( 'should match when there the path parameters are relative', () => {
        const form = loadForm( 'jr-choice-name.xml' );
        form.init();

        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).to.equal( '[Default Value] Area' );
        expect( form.view.html.querySelectorAll( '.readonly .or-output' )[1].textContent ).to.equal( '[Default Value] Area' );
    } );

    /** @see https://github.com/enketo/enketo-core/issues/490 */
    it( 'should handle regression reported in issue #490', () => {
        // given
        const form = loadForm( 'jr-choice-name.issue-490.xml' );
        form.init();

        // then
        expect( form.view.$.find( '.readonly .or-output' ).text() ).to.equal( 'unspecified' );

        // when
        form.view.$.find( '[name="/embedded-choice/translator"][value=clinic]' ).click().trigger( 'change' );

        // then
        expect( form.view.$.find( '.readonly .or-output' ).text() ).to.equal( 'Area' );
    } );

    it( 'should work with autocomplete select one questions', () => {
        const form = loadForm( 'jr-choice-name-autocomplete.xml' );
        form.init();
        form.view.$.find( '[name="/Label.Test/choice"]' ).val( '3' ).trigger( 'change' ); // Doesn't update view, but changes model.

        expect( form.view.$.find( '.or-output' ).text() ).to.equal( 'The Third Choice' );
    } );

    it( 'should work with radio buttons', () => {
        const form = loadForm( 'jr-choice-name-repeats.xml' );
        form.init();

        expect( form.view.html.querySelector( '[data-name="/data/r1/province_name"]' ).checked ).to.equal( false );

        form.view.html.querySelector( '[data-name="/data/r1/province_name"]' ).checked = true;
        form.view.html.querySelector( '[data-name="/data/r1/province_name"]' ).dispatchEvent( events.Change() );

        expect( form.view.html.querySelector( '[data-value=" ../province_label "]' ).innerText ).to.equal( 'Central' );
    } );

    it( 'should work with **empty** lists in pulldown selects', () => {
        const form = loadForm( 'jr-choice-name-external.xml' );
        const loadErrors = form.init();
        // Check that form loads without error (due to empty list when choice is evaluated the first time during initialization)
        // https://github.com/enketo/enketo-core/issues/738
        expect( loadErrors.length ).to.equal( 0 );
        // Check that it actually works (with a default value)
        expect( form.model.xml.querySelector( 'questionname' ).textContent ).to.equal( 'A' );
    } );

} );

describe( 'autocomplete questions', () => {
    stubDialogConfirm();

    it( 'populate correctly if a single language is defined in the form, and the Form instance is instantiated using that language explicitly', () => {
        const form = loadForm( 'autocomplete-cascade.xml', null, { language: 'en' } );
        form.init();
        const datalists = form.view.html.querySelectorAll( 'datalist' );
        const firstDatalistContent = [ ...datalists[ 0 ].querySelectorAll( 'option' ) ].map( el => `${el.value}:${el.dataset.value}` );
        expect( firstDatalistContent ).to.deep.equal( [ '...:', 'A:a', 'B:b', 'C:c' ] );

        // select value in first datalist, to populate the second one
        form.view.html.querySelector( 'input[list]' ).value = 'b';
        form.view.html.querySelector( 'input[list]' ).dispatchEvent( events.Change() );

        const secondDatalistContent = [ ...datalists[ 1 ].querySelectorAll( 'option' ) ].map( el => `${el.value}:${el.dataset.value}` );
        expect( secondDatalistContent ).to.deep.equal( [ ':undefined', 'BA:ba', 'BB:bb', 'BC:bc' ] );
    } );
} );


describe( 'goTo functionality', () => {
    stubDialogConfirm();

    const form = loadForm( 'relevant-default.xml' );
    form.init();

    it( 'returns an error if the goto field does not exist', () => {
        const result = form.goTo( '//notdey' );
        expect( result.length ).to.equal( 1 );
        expect( result[ 0 ] ).to.contain( 'Failed to find question \'notdey\'' );
    } );

    it( 'returns empty array (of errors) if field exists', () => {
        expect( form.goTo( '//one' ) ).to.deep.equal( [] );
        expect( form.goTo( '/relevant-default/one' ) ).to.deep.equal( [] );
        expect( form.goTo( '//three' ) ).to.deep.equal( [] );
        expect( form.goTo( '/relevant-default/grp/three' ) ).to.deep.equal( [] );
        expect( form.goTo( '//four' ) ).to.deep.equal( [] );
        expect( form.goTo( '/relevant-default/grp/four' ) ).to.deep.equal( [] );
    } );

    it( 'triggers a goto-irrelevant event if the goto field is irrelevant', () => {
        let counter = 0;
        form.view.html.addEventListener( events.GoToIrrelevant().type, () => counter++ );
        form.goTo( '//three' );
        expect( counter ).to.equal( 1 );
    } );

    it( 'triggers a goto-invisible event if the goto field does not have a form control', () => {
        let counter = 0;
        form.view.html.addEventListener( events.GoToInvisible().type, () => counter++ );
        form.goTo( '//four' );
        expect( counter ).to.equal( 1 );
    } );
} );

describe( 'Form.prototype', () => {
    stubDialogConfirm();

    describe( '#replaceChoiceNameFn()', () => {

        const tests = {
            'jr:choice-name( /choice-regex/translator, " /choice-regex/translator ")': '"__MOCK_VIEW_VALUE__"',
            '     jr:choice-name(       /choice-regex/translator     ,  " /choice-regex/translator "   )    ': '     "__MOCK_VIEW_VALUE__"    ',
            'if(string-length( /embedded-choice/translator ) !=0, jr:choice-name( /embedded-choice/translator ,\' /embedded-choice/translator \'),\'unspecified\')': 'if(string-length( /embedded-choice/translator ) !=0, "__MOCK_VIEW_VALUE__",\'unspecified\')',
            'jr:choice-name( selected-at( /energy_1/light/light_equip , 1), " /energy_1/light/light_equip " )': '"__MOCK_VIEW_VALUE__"',
            'if( /data/C1 =01, jr:choice-name( /data/C2 ," /data/C2 "), jr:choice-name( /data/C3 ," /data/C3 " ) )': 'if( /data/C1 =01, "__MOCK_VIEW_VALUE__", "__MOCK_VIEW_VALUE__" )',
        };

        for ( const initial in tests ) {
            const expected = tests[initial];
            it( `should replace ${initial} with ${expected}`, () => {
                // given
                const form = mockChoiceNameForm();

                // when
                const actual = Form.prototype.replaceChoiceNameFn.call( form, initial );

                // then
                expect( actual ).to.equal( expected );
            } );
        }
    } );
} );

function mockChoiceNameForm() {
    const val = '__MOCK_MODEL_VALUE__';

    return {
        model: {
            evaluate() {
                return val;
            },
        },
        view: {
            html: {
                querySelectorAll() {
                    return document.createRange().createContextualFragment( `
                        <select>
                            <option value="${val}">__MOCK_VIEW_VALUE__</option>
                        </select>
                    ` ).querySelectorAll( 'select' );
                },
            },
        },
    };
}
