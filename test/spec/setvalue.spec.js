import loadForm from '../helpers/load-form';
import forms from '../mock/forms';
import { Form } from '../../src/js/form';
import events from '../../src/js/event';

/*
 * These tests are for setvalue actions. Even though this functionality is part of calculate.js they are separated since they
 * different features of XForms.
 */

describe( 'setvalue action to populate defaults', () => {

    it( 'works for questions with odk-instance-first-load outside of the XForms body', () => {
        const form1 = loadForm( 'setvalue.xml' );
        form1.init();
        expect( form1.model.xml.querySelector( 'a' ).textContent ).to.equal( 'initialized' );
    } );

    it( 'works for questions with odk-instance-first-load inside of the XForms body', () => {
        const form1 = loadForm( 'setvalue.xml' );
        form1.init();
        expect( form1.model.xml.querySelector( 'b' ).textContent ).to.equal( '7' );
    } );

    describe( 'inside repeats', () => {

        describe( 'with only odk-new-repeat', () => {

            it( 'does not work for repeat questions inside default instances', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '' );
                expect( ages[ 1 ].textContent ).to.equal( '100' );
            } );

            it( 'does not work for repeat questions inside default instances (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '' );
                expect( ages[ 1 ].textContent ).to.equal( '100' );
            } );

            it( 'does not work for hidden repeat nodes inside default instances', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( '' );
                expect( ds[ 1 ].textContent ).to.equal( 'bb' );
            } );

            it( 'does not work for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( '' );
                expect( ds[ 1 ].textContent ).to.equal( 'bb' );
            } );

            it( 'works for newly created repeat questions', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '' );
                expect( ages[ 1 ].textContent ).to.equal( '100' );
                expect( ages[ 2 ].textContent ).to.equal( '5' );
            } );

            it( 'works for newly created repeat questions (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '' );
                expect( ages[ 1 ].textContent ).to.equal( '100' );
                expect( ages[ 2 ].textContent ).to.equal( '5' );
            } );

            it( 'works for newly created hidden repeat nodes', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( '' );
                expect( ds[ 1 ].textContent ).to.equal( 'bb' );
                expect( ds[ 2 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for newly created hidden repeat nodes (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( '' );
                expect( ds[ 1 ].textContent ).to.equal( 'bb' );
                expect( ds[ 2 ].textContent ).to.equal( 'a' );
            } );

            it( 'works when jr:repeat-count is used', () => {
                const form1 = new Form(
                    document.createRange().createContextualFragment(
                        `<div>${forms[ 'setvalue.xml' ].html_form.replace( 'class="or-repeat-info"', 'class="or-repeat-info" data-repeat-count="/data/count"' )}</div>` ).querySelector( 'form' ), {
                        modelStr: forms[ 'setvalue.xml' ].xml_model
                    }
                );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );
                const ds = form1.model.xml.querySelectorAll( 'd' );
                expect( ages.length ).to.equal( 6 );
                expect( [ ...ages ].map( el => el.textContent ) ).to.deep.equal( [ '', '100', '5', '5', '5', '5' ] );
                expect( [ ...ds ].map( el => el.textContent ) ).to.deep.equal( [ '', 'bb', 'a', 'a', 'a', 'a' ] );
            } );

            it( 'works when jr:repeat-count is used (form with jr:template)', () => {
                const form1 = new Form(
                    document.createRange().createContextualFragment( `<div>${forms[ 'setvalue-template.xml' ].html_form.replace( 'class="or-repeat-info"', 'class="or-repeat-info" data-repeat-count="/data/count"' )}</div>` ).querySelector( 'form' ), {
                        modelStr: forms[ 'setvalue-template.xml' ].xml_model
                    }
                );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );
                const ds = form1.model.xml.querySelectorAll( 'd' );
                expect( ages.length ).to.equal( 6 );
                expect( [ ...ages ].map( el => el.textContent ) ).to.deep.equal( [ '', '100', '5', '5', '5', '5' ] );
                expect( [ ...ds ].map( el => el.textContent ) ).to.deep.equal( [ '', 'bb', 'a', 'a', 'a', 'a' ] );
            } );

        } );

        describe( 'with only odk-instance-first-load', () => {

            it( 'works for repeat questions inside default instances', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).to.equal( '5' );
            } );

            it( 'works for repeat questions inside default instances (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).to.equal( '5' );
            } );

            it( 'works for hidden repeat nodes inside default instances', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                // Overwrites static default
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                // Overwrites static default
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
            } );

            it( 'does not work for newly created repeat questions', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).to.equal( '5' );
                expect( ages[ 2 ].textContent ).to.equal( '' );
            } );

            it( 'does not work for newly created repeat questions (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).to.equal( '5' );
                expect( ages[ 2 ].textContent ).to.equal( '1000' );
            } );

            it( 'does not work for hidden newly created repeat nodes', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
                expect( ds[ 2 ].textContent ).to.equal( '' );
            } );

            it( 'does not work for hidden newly created repeat nodes (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
                expect( ds[ 2 ].textContent ).to.equal( 'templated' );
            } );

        } );

        describe( 'with both odk-instance-first-load and odk-new-repeat events', () => {

            it( 'works for repeat questions inside default instances', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                expect( ages[ 1 ].textContent ).to.equal( '5' );
            } );

            it( 'works for repeat questions inside default instances (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 2 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                expect( ages[ 1 ].textContent ).to.equal( '5' );
            } );

            it( 'works for hidden repeat nodes inside default instances', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 2 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for newly created repeat questions', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                expect( ages[ 1 ].textContent ).to.equal( '5' );
                expect( ages[ 2 ].textContent ).to.equal( '5' );
            } );

            it( 'works for newly created repeat questions (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).to.equal( 3 );
                expect( ages[ 0 ].textContent ).to.equal( '5' );
                expect( ages[ 1 ].textContent ).to.equal( '5' );
                expect( ages[ 2 ].textContent ).to.equal( '5' );
            } );

            it( 'works for hidden newly created hidden repeat nodes', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
                expect( ds[ 2 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for hidden newly created hidden repeat nodes (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).to.equal( 3 );
                expect( ds[ 0 ].textContent ).to.equal( 'a' );
                expect( ds[ 1 ].textContent ).to.equal( 'a' );
                expect( ds[ 2 ].textContent ).to.equal( 'a' );
            } );

            it( 'works for the first repeat if that repeat is non-relevant upon load', () => {
                const form = loadForm( 'setvalue-repeat.xml' );
                form.init();
                const yn = form.view.html.querySelector( '[name="/data/grp/yn"]' );
                form.input.setVal( yn, '1', events.Change() );

                expect( form.view.html.querySelector( '[name="/data/grp/rep/pos"]' ).value ).to.equal( 'Standing' );
            } );

            it( 'works if the default value is an empty string', () => {
                const form = loadForm( 'setvalue-repeat.xml' );
                form.init();
                const yn = form.view.html.querySelector( '[name="/data/grp/yn"]' );
                form.input.setVal( yn, '1', events.Change() );

                // Create 5 additional repeat instances (total 6)
                const btn = form.view.html.querySelector( '.add-repeat-btn' );
                for ( let i = 0;  i < 5; i++ ){
                    btn.click();
                }

                // Test that especially the last 3 are empty (and not 'Standing' due a view template extraction issue)
                // https://github.com/OpenClinica/enketo-express-oc/issues/406#issuecomment-748325668
                expect( [ ...form.view.html.querySelectorAll( '[name="/data/grp/rep/pos"]' ) ].map( el => el.value ) ).to.deep.equal( [ 'Standing', 'Sitting', 'Lying', '', '', '' ] );
            } );

        } );

        describe( 'with xforms-value-changed events', () => {

            it( 'when the trigger is inside a repeat but the target is not', done => {
                const form = loadForm( 'setvalue-repeat-tricky-trigger-target.xml' );
                form.init();
                const sel = '[name="/data/rg1/item3"]';
                const itemX = form.model.xml.querySelector( 'itemx' );
                const hid = form.model.xml.querySelector( 'hid' );

                expect( itemX.textContent ).to.equal( 'initial default' );
                expect( hid.textContent ).to.equal( '' );

                form.view.html.querySelector( '.add-repeat-btn' ).click();

                const item3Second = form.view.html.querySelectorAll( sel )[1];
                form.input.setVal( item3Second, 'd', events.Change() );

                setTimeout( () => {
                    expect( itemX.textContent ).not.to.equal( 'initial default' );
                    expect( hid.textContent ).not.to.equal( '' );
                    done();
                }, 100 );
            } );

        } );

    } );

    it( 'relying on non-form-control setvalue/odk-instance-first-load items to be evaluated before form-control setvalue items', () => {
        const form1 = loadForm( 'setvalue-order.xml' );
        form1.init();
        expect( form1.model.xml.querySelector( 'one' ).textContent ).to.equal( '2' );
        expect( form1.model.xml.querySelector( 'two' ).textContent ).to.equal( '2' );
        expect( form1.model.xml.querySelector( 'three' ).textContent ).to.equal( '2#' );
    } );

    it( 'relying on non-form-control setvalue/odk-new-repeat items inside repeats to be evaluated before form-control setvalue items', () => {
        const form1 = loadForm( 'setvalue-repeat-order.xml' );
        form1.init();
        form1.view.html.querySelector( '.add-repeat-btn' ).click();
        expect( form1.model.xml.querySelectorAll( 'one' )[1].textContent ).to.equal( '2' );
        expect( form1.model.xml.querySelectorAll( 'two' )[1].textContent ).to.equal( '2' );
        expect( form1.model.xml.querySelectorAll( 'three' )[1].textContent ).to.equal( '2#' );
    } );

} );


describe( 'setvalue actions to populate a value if another value changes', () => {

    it( 'works outside a repeat in conjunction with a select_minimal', done => {
        const form = loadForm( 'setvalue.xml' );
        form.init();
        const myAgeView = form.view.html.querySelector( '[name="/data/my_age"]' );
        const myAgeChangedView = form.view.html.querySelector( '[name="/data/my_age_changed"]' );
        const myAgeChangedModel = form.model.xml.querySelector( 'my_age_changed' );

        expect( myAgeChangedView.textContent ).to.equal( '' );
        expect( myAgeChangedModel.textContent ).to.equal( '' );

        form.input.setVal( myAgeView, '11', events.Change()  );

        setTimeout( () => {
            //expect( myAgeChangedView.textContent ).to.equal( '6' );
            expect( myAgeChangedModel.textContent ).to.equal( '111' );
            done();
        }, 100 );
    } );

    it( 'works inside a repeat in conjunction with a number input', done => {
        const form = loadForm( 'setvalue.xml' );
        form.init();
        const agesView = [ ...form.view.html.querySelectorAll( '[name="/data/person/age"]' ) ];
        const ageChangedsView = [ ...form.view.html.querySelectorAll( '[name="/data/person/age_changed"]' ) ];
        const ageChangedsModel = [ ...form.model.xml.querySelectorAll( 'age_changed' ) ];

        expect( ageChangedsView.map( el => el.textContent ) ).to.deep.equal( [ '', '' ] );
        expect( ageChangedsModel.map( el => el.textContent ) ).to.deep.equal( [ '', '' ] );

        form.input.setVal( agesView[ 0 ], '22', events.Change()  );

        setTimeout( () => {
            //expect( ageChangedsView.map( el => el.textContent )).to.deep.equal( [ 'Age changed!', '' ] );
            expect( ageChangedsModel.map( el => el.textContent ) ).to.deep.equal( [ 'Age changed!', '' ] );
            done();
        }, 100 );
    } );


    it( 'works for multiple setvalue actions triggered by same question', done => {
        const form = loadForm( 'setvalue-multiple-under-one.xml' );
        form.init();
        const aView = form.input.find( '/data/a', 0 );
        const cView = form.input.find( '/data/c', 0 );
        const dView = form.input.find( '/data/d', 0 );
        const bModel = form.model.xml.querySelector( 'b' );
        const cModel = form.model.xml.querySelector( 'c' );
        const dModel = form.model.xml.querySelector( 'd' );
        const eModel = form.model.xml.querySelector( 'e' );

        form.input.setVal( dView, '3030', events.Change() );

        expect( aView.textContent ).to.equal( '' );
        expect( bModel.textContent ).to.equal( '' );
        expect( cModel.textContent ).to.equal( '' );
        expect( dView.value ).to.equal( '3030' );
        expect( dModel.textContent ).to.equal( '3030' );
        expect( eModel.textContent ).to.equal( 'default' );

        form.input.setVal( aView, '11', events.Change() );

        setTimeout( () => {
            expect( bModel.textContent ).to.equal( '2' );
            expect( cView.value ).to.equal( '11.11' );
            expect( cModel.textContent ).to.equal( '11.11' );
            expect( dView.value ).to.equal( '' );
            expect( dModel.textContent ).to.equal( '' );
            expect( eModel.textContent ).to.equal( '' );
            done();
        }, 100 );
    } );

    it( 'works if the setvalue trigger is a calculation', () => {
        const form = loadForm( 'setvalue-triggered-by-calc.xml' );
        form.init();
        const a = form.input.find( '/data/a', 0 );

        form.input.setVal( a, '1', events.Change() );

        // check calculated value
        expect( form.model.xml.querySelector( 'a_copy' ).textContent ).to.equal( '1' );
        // check setvalue-changed value
        expect( form.model.xml.querySelector( 'triggered' ).textContent ).to.equal( '11' );
    } );

} );
