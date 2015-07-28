if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ 'enketo-js/Form' ], function( Form ) {

    var loadForm = function( filename, editStr ) {
        var strings = mockForms1[ filename ];
        return new Form( strings.html_form, {
            modelStr: strings.xml_model,
            instanceStr: editStr
        } );
    };

    describe( 'Output functionality ', function() {
        // These tests were orginally meant for modilabs/enketo issue #141. However, they passed when they were
        // failing in the enketo client itself (same form). It appeared the issue was untestable (except manually)
        // since the issue was resolved by updating outputs with a one millisecond delay (!).
        // Nevertheless, these tests can be useful.
        var form = new Form( formStr2, {
            modelStr: dataStr2
        } );

        form.init();

        it( 'tested upon initialization: node random__', function() {
            expect( form.getView().$.find( '[data-value="/random/random__"]' ).text().length ).toEqual( 17 );
        } );

        it( 'tested upon initialization: node uuid__', function() {
            expect( form.getView().$.find( '[data-value="/random/uuid__"]' ).text().length ).toEqual( 36 );
        } );
    } );

    describe( 'Output functionality within repeats', function() {
        var $o = [],
            form = loadForm( 'outputs_in_repeats.xml' );
        form.init();
        form.getView().$.find( 'button.repeat' ).click();

        for ( var i = 0; i < 8; i++ ) {
            $o.push( form.getView().$.find( '.or-output' ).eq( i ) );
        }

        form.getView().$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 0 ).val( 'Martijn' ).trigger( 'change' );
        form.getView().$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 1 ).val( 'Beth' ).trigger( 'change' );
        form.getView().$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="elephant"]' ).eq( 0 ).prop( 'checked', true ).trigger( 'change' );
        form.getView().$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="rabbit"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );

        it( 'shows correct value when referring to repeated node', function() {
            expect( $o[ 0 ].text() ).toEqual( 'Martijn' );
            expect( $o[ 1 ].text() ).toEqual( 'Martijn' );
            expect( $o[ 2 ].text() ).toEqual( 'elephant' );
            expect( $o[ 3 ].text() ).toEqual( 'Martijn' );
            expect( $o[ 4 ].text() ).toEqual( 'Beth' );
            expect( $o[ 5 ].text() ).toEqual( 'Beth' );
            expect( $o[ 6 ].text() ).toEqual( 'rabbit' );
            expect( $o[ 7 ].text() ).toEqual( 'Beth' );
        } );
    } );

    describe( 'Preload and MetaData functionality', function() {
        var form, t;

        it( 'ignores a calculate binding on [ROOT]/meta/instanceID', function() {
            form = new Form( formStr2, {
                modelStr: dataStr2
            } );
            form.init();
            expect( form.getModel().node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
        } );

        it( 'generates an instanceID on meta/instanceID WITHOUT preload binding', function() {
            form = new Form( formStr2, {
                modelStr: dataStr2
            } );
            form.init();
            form.getView().$.find( 'fieldset#or-preload-items' ).remove();
            expect( form.getView().$.find( 'fieldset#or-preload-items' ).length ).toEqual( 0 );
            expect( form.getModel().node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
        } );

        it( 'generates an instanceID WITH preload binding', function() {
            form = new Form( formStr3, {
                modelStr: dataStr2
            } );
            form.init();
            expect( form.getView().$
                    .find( 'fieldset#or-preload-items input[name="/random/meta/instanceID"][data-preload="instance"]' ).length )
                .toEqual( 1 );
            expect( form.getModel().node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
        } );

        it( 'does not generate a new instanceID if one is already present', function() {
            form = new Form( formStr3, {
                modelStr: dataStr3
            } );
            form.init();
            expect( form.getModel().node( '/random/meta/instanceID' ).getVal()[ 0 ] ).toEqual( 'c13fe058-3349-4736-9645-8723d2806c8b' );
        } );

        it( 'generates a timeStart on meta/timeStart WITHOUT preload binding', function() {
            form = new Form( formStr2, {
                modelStr: dataStr2
            } );
            form.init();
            form.getView().$.find( 'fieldset#or-preload-items' ).remove();
            expect( form.getView().$.find( 'fieldset#or-preload-items' ).length ).toEqual( 0 );
            expect( form.getModel().node( '/random/meta/timeStart' ).getVal()[ 0 ].length > 10 ).toBe( true );
        } );

        it( 'generates a timeEnd on init and updates this after a beforesave event WITHOUT preload binding', function() {
            var timeEnd, timeEndNew;
            //jasmine.Clock.useMock();
            form = new Form( formStr2, {
                modelStr: dataStr2
            } );
            form.init();
            form.getView().$.find( 'fieldset#or-preload-items' ).remove();
            expect( form.getView().$.find( 'fieldset#or-preload-items' ).length ).toEqual( 0 );
            timeEnd = form.getModel().node( '/random/meta/timeEnd' ).getVal()[ 0 ];
            expect( timeEnd.length > 10 ).toBe( true );
            //setTimeout(function(){
            form.getView().$.trigger( 'beforesave' );
            timeEndNew = form.getModel().node( '/random/meta/timeEnd' ).getVal()[ 0 ];
            timeEnd = new Date( timeEnd );
            timeEndNew = new Date( timeEndNew );
            //for some reason the setTimeout function doesn't work
            expect( timeEnd - 1 < timeEndNew ).toBe( true );
            //}, 1001);
            //jasmine.Clock.tick(1001);
            //TODO FIX THIS PROPERLY
        } );

        function testPreloadExistingValue( node ) {
            it( 'obtains unchanged preload value of item (WITH preload binding): ' + node.selector + '', function() {
                form = new Form( formStr5, {
                    modelStr: dataStr5a
                } );
                form.init();
                expect( form.getModel().node( node.selector ).getVal()[ 0 ] ).toEqual( node.result );
            } );
        }

        function testPreloadNonExistingValue( node ) {
            it( 'populates previously empty preload item (WITH preload binding): ' + node.selector + '', function() {
                form = new Form( formStr5, {
                    modelStr: dataStr5b
                } );
                form.init();
                expect( form.getModel().node( node.selector ).getVal()[ 0 ].length > 0 ).toBe( true );
            } );
        }

        t = [
            [ '/widgets/start_time', '2012-10-30T08:44:57.000-06:00' ],
            [ '/widgets/date_today', '2012-10-30' ],
            [ '/widgets/deviceid', 'some value' ],
            [ '/widgets/subscriberid', 'some value' ],
            [ '/widgets/my_simid', '2332' ],
            [ '/widgets/my_phonenumber', '234234324' ],
            [ '/widgets/application', 'some context' ],
            [ '/widgets/patient', 'this one' ],
            [ '/widgets/user', 'John Doe' ],
            [ '/widgets/uid', 'John Doe' ],
            //['/widgets/browser_name', 'fake'],
            //['/widgets/browser_version', 'xx'],
            //['/widgets/os_name', 'fake'],
            //['/widgets/os_version', 'xx'],
            [ '/widgets/meta/instanceID', 'uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8' ]
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
        testPreloadExistingValue( {
            selector: '/widgets/unknown',
            result: 'some value'
        } );
        testPreloadNonExistingValue( {
            selector: '/widgets/end_time'
        } );
    } );

    describe( 'Loading instance values into html input fields functionality', function() {
        var form;

        it( 'correctly populates input fields of non-repeat node names in the instance', function() {
            form = loadForm( 'thedata.xml' );
            form.init();
            expect( form.getView().$.find( '[name="/thedata/nodeB"]' ).val() ).toEqual( 'b' );
            expect( form.getView().$.find( '[name="/thedata/repeatGroup/nodeC"]' ).eq( 2 ).val() ).toEqual( 'c3' );
            expect( form.getView().$.find( '[name="/thedata/nodeX"]' ).val() ).toEqual( undefined );
        } );

        it( 'correctly populates input field even if the instance node name is not unique and occurs at multiple levels', function() {
            form = new Form( formStr4, {
                modelStr: dataStr4
            } );
            form.init();
            expect( form.getView().$.find( '[name="/nodename_bug/hh/hh"]' ).val() ).toEqual( 'hi' );
        } );

    } );

    describe( 'repeat functionality', function() {
        var form;

        //turn jQuery animations off
        jQuery.fx.off = true;

        describe( 'cloning', function() {
            beforeEach( function() {
                form = loadForm( 'thedata.xml' ); //new Form(formStr1, dataStr1);
                form.init();
            } );

            it( 'removes the correct instance and HTML node when the ' - ' button is clicked (issue 170)', function() {
                var repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]',
                    nodePath = '/thedata/repeatGroup/nodeC',
                    nodeSelector = 'input[name="' + nodePath + '"]',
                    formH = form.getView(),
                    data = form.getModel(),
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
                    nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]',
                    formH = form.getView(),
                    $node3 = formH.$.find( nodeSelector ).eq( 2 ),
                    $node4;

                formH.setInvalid( $node3 );

                expect( formH.$.find( repeatSelector ).length ).toEqual( 3 );
                expect( $node3.parent().hasClass( 'invalid-constraint' ) ).toBe( true );
                expect( formH.$.find( nodeSelector ).eq( 3 ).length ).toEqual( 0 );

                formH.$.find( repeatSelector ).eq( 2 ).find( 'button.repeat' ).click();

                $node4 = formH.$.find( nodeSelector ).eq( 2 );
                expect( formH.$.find( repeatSelector ).length ).toEqual( 4 );
                expect( $node4.length ).toEqual( 1 );
                /*****************************************************************************************/
                //expect($node4.parent().hasClass('invalid-constraint')).toBe(false); TODO: FIX THIS TEST
            } );
        } );

        it( 'clones nested repeats if they are present in the instance upon initialization (issue #359) ', function() {
            //note that this form contains multiple repeats in the instance
            form = loadForm( 'nested_repeats.xml' );
            form.init();
            var formH = form.getView(),
                $1stLevelTargetRepeat = formH.$.find( '.or-repeat[name="/nested_repeats/kids/kids_details"]' ).eq( 1 ),
                $2ndLevelTargetRepeats = $1stLevelTargetRepeat.find( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );

            expect( $1stLevelTargetRepeat.length ).toEqual( 1 );
            expect( $2ndLevelTargetRepeats.length ).toEqual( 3 );
        } );

        //doesn't work in bloody Travis. STFU Travis!
        xit( 'doesn\'t duplicate date widgets in a cloned repeat', function() {
            form = loadForm( 'nested_repeats.xml' );
            form.init();
            var formH = form.getView(),
                $dates = formH.$.find( '[name="/nested_repeats/kids/kids_details/immunization_info/date"]' );

            expect( $dates.length ).toEqual( 5 );
            expect( $dates.parent().find( '.widget.date' ).length ).toEqual( 5 );
        } );
    } );

    describe( 'calculations', function() {
        var formH, dataO,
            form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        formH = form.getView();
        dataO = form.getModel();
        it( 'also work inside repeats', function() {
            formH.$.find( 'button.repeat' ).click();
            formH.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '10' ).trigger( 'change' );
            formH.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '20' ).trigger( 'change' );
            expect( dataO.node( '/calcs_in_repeats/rep1/calc3', 0 ).getVal()[ 0 ] ).toEqual( '200' );
            expect( dataO.node( '/calcs_in_repeats/rep1/calc3', 1 ).getVal()[ 0 ] ).toEqual( '400' );
        } );
    } );

    describe( 'branching functionality', function() {

        it( 'hides irrelevant branches upon initialization', function() {
            var form = new Form( formStr6, {
                modelStr: dataStr6
            } );
            form.init();
            expect( form.getView().$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
            expect( form.getView().$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
        } );

        it( 'reveals a group branch when the relevant condition is met', function() {
            var form = new Form( formStr6, {
                modelStr: dataStr6
            } );
            form.init();
            //first check incorrect value that does not meet relevant condition
            form.getView().$.find( '[name="/data/nodeA"]' ).val( 'no' ).trigger( 'change' );
            expect( form.getView().$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
            //then check value that does meet relevant condition
            form.getView().$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            expect( form.getView().$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( false );
        } );

        it( 'reveals a question when the relevant condition is met', function() {
            var form = new Form( formStr6, {
                modelStr: dataStr6
            } );
            form.init();
            //first check incorrect value that does not meet relevant condition
            form.getView().$.find( '[name="/data/group/nodeB"]' ).val( 3 ).trigger( 'change' );
            expect( form.getView().$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
            //then check value that does meet relevant condition
            form.getView().$.find( '[name="/data/group/nodeB"]' ).val( 2 ).trigger( 'change' );
            expect( form.getView().$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 0 );
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

            form.getView().$.find( repeatSelector ).eq( 0 ).find( 'button.repeat' ).click();
            expect( form.getView().$.find( repeatSelector ).length ).toEqual( 2 );
            //check if initial state of 2nd question in 2nd repeat is disabled
            expect( form.getView().$.find( repeatSelector ).eq( 1 )
                .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' )
                .hasClass( 'disabled' ) ).toBe( true );
            //select 'yes' in first question of 2nd repeat
            form.getModel().node( '/issue208/rep/nodeA', 1 ).setVal( 'yes', null, 'string' );
            //doublecheck if new value was set
            expect( form.getModel().node( '/issue208/rep/nodeA', 1 ).getVal()[ 0 ] ).toEqual( 'yes' );
            //check if 2nd question in 2nd repeat is now enabled
            expect( form.getView().$.find( repeatSelector ).eq( 1 )
                .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' ).hasClass( 'disabled' ) ).toBe( false );

        } );

        it( 're-evaluates when a node with a relative path inside a relevant expression is changed', function() {
            var form = loadForm( 'relative.xml' );
            form.init();
            var $form = form.getView().$,
                $a = $form.find( '[name="/relative/a"]' ),
                $branch = $form.find( '[name="/relative/c"]' ).closest( '.or-branch' );

            $a.val( 'abcd' ).trigger( 'change' );
            expect( $branch.length ).toEqual( 1 );
            expect( $branch.hasClass( 'disabled' ) ).toEqual( false );
        } );

        describe( 'when used with calculated items', function() {
            var form = loadForm( 'calcs.xml' );
            form.init();
            var $node = form.getView().$.find( '[name="/calcs/cond1"]' );
            var dataO = form.getModel();

            it( 'evaluates a calculated item only when it becomes relevant', function() {
                //node without relevant attribute:
                expect( dataO.node( '/calcs/calc2' ).getVal()[ 0 ] ).toEqual( '12' );
                //node that is irrelevant
                expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
                $node.val( 'yes' ).trigger( 'change' );
                //node that has become relevant
                expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
            } );

            it( 'empties an already calculated item once it becomes irrelevant', function() {
                $node.val( 'yes' ).trigger( 'change' );
                expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
                $node.val( 'no' ).trigger( 'change' );
                expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
            } );
        } );

        describe( 'inside repeats when multiple repeats are present upon loading (issue #507)', function() {
            var form = loadForm( 'multiple_repeats_relevant.xml' );
            form.init();
            var $relNodes = form.getView().$.find( '[name="/multiple_repeats_relevant/rep/skipq"]' ).parent( '.or-branch' );
            it( 'correctly evaluates the relevant logic of each question inside all repeats', function() {
                expect( $relNodes.length ).toEqual( 2 );
                //check if both questions with 'relevant' attributes in the 2 repeats are disabled
                expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).toBe( true );
                expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).toBe( true );
            } );
        } );

        describe( 'in nested branches ', function() {
            var form = new Form( formStr7, {
                modelStr: dataStr7
            } );
            form.init();
            var $nestedBranch = form.getView().$.find( '[name="/data/group/nodeC"]' ).closest( '.question' );

            it( 'works correctly when an ancestor branch gets enabled', function() {
                expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 1 );
                // enable parent branch
                //expect( form.getModel().getStr() ).toEqual( 'wut' );
                form.getModel().node( '/data/nodeA', 0 ).setVal( '1' );
                expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 0 );
                // check if nested branch has been initialized and is enabled
                expect( $nestedBranch.hasClass( 'pre-init' ) ).toBe( false );
                expect( $nestedBranch.hasClass( 'disabled' ) ).toBe( false );
            } );


        } );

    } );

    describe( 'Required field validation', function() {
        var form, $numberInput, $numberLabel;

        beforeEach( function() {
            jQuery.fx.off = true; //turn jQuery animations off
            form = new Form( formStr6, {
                modelStr: dataStr6
            } );
            form.init();
            $numberInput = form.getView().$.find( '[name="/data/group/nodeB"]' );
            $numberLabel = form.getView().input.getWrapNodes( $numberInput );
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
            form.getView().$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            expect( $numberLabel.length ).toEqual( 1 );
            $numberInput.val( 0 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
            $numberInput.val( 1 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
        } );

        it( 'invalidates an enabled and required number field without a value', function() {
            form.getView().$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            $numberInput.val( '' ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( true );
        } );

        it( 'invalidates an enabled and required textarea that contains only a newline character or other whitespace characters', function() {
            form = loadForm( 'thedata.xml' ); //new Form(formStr1, dataStr1);
            form.init();
            var $textarea = form.getView().$.find( '[name="/thedata/nodeF"]' );
            $textarea.val( '\n' ).trigger( 'change' ).trigger( 'validate' );
            expect( $textarea.length ).toEqual( 1 );
            expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
            $textarea.val( '  \n  \n\r \t ' ).trigger( 'change' ).trigger( 'validate' );
            expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
        } );
    } );

    //TODO widgets are now loaded asynchronously, this is better moved to a separate widget test
    xdescribe( 'Readonly items', function() {
        it( 'preserve their default value', function() {
            var form = loadForm( 'readonly.xml' );
            form.init();
            expect( form.getView().$.find( '[name="/readonly/a"] .note-value' ).text() ).toEqual( 'martijn' );
        } );
    } );

    describe( 'Itemset functionality', function() {
        var form;

        describe( 'in a cascading select using itext for all labels', function() {
            var $items1Radio, $items2Radio, $items3Radio, $items1Select, $items2Select, $items3Select, formHTMLO,
                sel1Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/country"]',
                sel2Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/city"]',
                sel3Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/neighborhood"]',
                sel1Select = 'select[name="/new_cascading_selections/group2/country2"]',
                sel2Select = 'select[name="/new_cascading_selections/group2/city2"]',
                sel3Select = 'select[name="/new_cascading_selections/group2/neighborhood2"]';

            beforeEach( function() {
                jQuery.fx.off = true; //turn jQuery animations off
                form = loadForm( 'new_cascading_selections.xml' );
                form.init();

                formHTMLO = form.getView();
                spyOn( formHTMLO, 'itemsetUpdate' ).and.callThrough();

                $items1Radio = function() {
                    return form.getView().$.find( sel1Radio );
                };
                $items2Radio = function() {
                    return form.getView().$.find( sel2Radio );
                };
                $items3Radio = function() {
                    return form.getView().$.find( sel3Radio );
                };
                $items1Select = function() {
                    return form.getView().$.find( sel1Select + ' > option:not(.itemset-template)' );
                };
                $items2Select = function() {
                    return form.getView().$.find( sel2Select + ' > option:not(.itemset-template)' );
                };
                $items3Select = function() {
                    return form.getView().$.find( sel3Select + ' > option:not(.itemset-template)' );
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
                form.getView().$.find( sel1Radio + '[value="nl"]' ).prop( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'country';
                } ) ).toEqual( true );

                expect( $items1Radio().length ).toEqual( 2 );
                expect( $items2Radio().length ).toEqual( 3 );
                expect( $items2Radio().siblings().text() ).toEqual( 'AmsterdamAmsterdamRotterdamRotterdamDrontenDronten' );
                expect( $items3Radio().length ).toEqual( 0 );
            } );

            it( 'level 3: with <input type="radio"> elements has the expected amount of options', function() {
                //select first option
                form.getView().$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'country';
                } ) ).toEqual( true );

                //select second option
                form.getView().$.find( sel2Radio + '[value="ams"]' ).attr( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'city';
                } ) ).toEqual( true );

                expect( $items1Radio().length ).toEqual( 2 );
                expect( $items2Radio().length ).toEqual( 3 );
                expect( $items3Radio().length ).toEqual( 2 );
                expect( $items3Radio().siblings().text() ).toEqual( 'WesterparkWesterparkDe DamDam' );

                //select other first option to change itemset
                form.getView().$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', false );
                form.getView().$.find( sel1Radio + '[value="usa"]' ).attr( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
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
                form.getView().$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
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
                form.getView().$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'country2';
                } ) ).toEqual( true );

                //select second option
                form.getView().$.find( sel2Select ).val( 'ams' ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'city2';
                } ) ).toEqual( true );

                expect( $items1Select().length ).toEqual( 2 );
                expect( $items2Select().length ).toEqual( 3 );
                expect( $items3Select().length ).toEqual( 2 );
                expect( $items3Select().eq( 0 ).attr( 'value' ) ).toEqual( 'wes' );
                expect( $items3Select().eq( 1 ).attr( 'value' ) ).toEqual( 'dam' );

                //select other first option to change itemset
                form.getView().$.find( sel1Select ).val( 'usa' ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
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
            var $items1Radio, $items2Radio, $items3Radio, formHTMLO,
                sel1Radio = ':not(.itemset-template) > input:radio[data-name="/form/state"]',
                sel2Radio = ':not(.itemset-template) > input:radio[data-name="/form/county"]',
                sel3Radio = ':not(.itemset-template) > input:radio[data-name="/form/city"]';

            beforeEach( function() {
                jQuery.fx.off = true; //turn jQuery animations off
                form = loadForm( 'cascading_mixture_itext_noitext.xml' );
                form.init();

                formHTMLO = form.getView();
                spyOn( formHTMLO, 'itemsetUpdate' ).and.callThrough();

                $items1Radio = function() {
                    return form.getView().$.find( sel1Radio );
                };
                $items2Radio = function() {
                    return form.getView().$.find( sel2Radio );
                };
                $items3Radio = function() {
                    return form.getView().$.find( sel3Radio );
                };
            } );

            it( 'level 3: with <input type="radio"> elements using direct references to instance labels without itext has the expected amount of options', function() {
                //select first option
                form.getView().$.find( sel1Radio + '[value="washington"]' )
                    .attr( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'state';
                } ) ).toEqual( true );

                //select second option
                form.getView().$.find( sel2Radio + '[value="king"]' )
                    .attr( 'checked', true ).trigger( 'change' );

                expect( formHTMLO.itemsetUpdate.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                    return node === 'county';
                } ) ).toEqual( true );

                expect( $items1Radio().length ).toEqual( 2 );
                expect( $items2Radio().length ).toEqual( 3 );
                expect( $items3Radio().length ).toEqual( 2 );
                expect( $items3Radio().siblings().text() ).toEqual( 'SeattleRedmond' );
            } );
        } );

        describe( 'in a cloned repeat that includes a cascading select, ', function() {
            var countrySelector = '[data-name="/new_cascading_selections_inside_repeats/group1/country"]',
                citySelector = 'label:not(.itemset-template) [data-name="/new_cascading_selections_inside_repeats/group1/city"]',
                form, $masterRepeat, $clonedRepeat;

            beforeEach( function() {
                form = loadForm( 'new_cascading_selections_inside_repeats.xml' );
                form.init();
                $masterRepeat = form.getView().$.find( '.or-repeat' );
                //select usa in master repeat
                $masterRepeat.find( countrySelector + '[value="usa"]' ).prop( 'checked', true ).trigger( 'change' );
                //add repeat
                $masterRepeat.find( 'button.repeat' ).click();
                $clonedRepeat = form.getView().$.find( '.or-repeat.clone' );
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
            expect( form.getEditStatus() ).toBe( false );
            form.getView().$.find( 'input[name="/thedata/nodeA"]' ).val( 'this' ).trigger( 'change' );
            expect( form.getEditStatus() ).toBe( true );
        } );
    } );

} );
