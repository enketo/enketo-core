import loadForm from '../helpers/load-form';
import forms from '../mock/forms';
import { Form } from '../../src/js/form';

/*
 * These tests are for setvalue actions. Even though this functionality is part of calculate.js they are separated since they 
 * different features of XForms.
 */

describe( 'setvalue action to populate defaults', () => {

    it( 'works for questions with odk-instance-first-load outside of the XForms body', () => {
        const form1 = loadForm( 'setvalue.xml' );
        form1.init();
        expect( form1.model.xml.querySelector( 'a' ).textContent ).toEqual( '2' );
    } );

    it( 'works for questions with odk-instance-first-load inside of the XForms body', () => {
        const form1 = loadForm( 'setvalue.xml' );
        form1.init();
        expect( form1.model.xml.querySelector( 'b' ).textContent ).toEqual( '7' );
    } );

    describe( 'inside repeats', () => {


        describe( 'with only odk-new-repeat', () => {

            it( 'does not work for repeat questions inside default instances', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '' );
                expect( ages[ 1 ].textContent ).toEqual( '100' );
            } );

            it( 'does not work for repeat questions inside default instances (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '' );
                expect( ages[ 1 ].textContent ).toEqual( '100' );
            } );

            it( 'does not work for hidden repeat nodes inside default instances', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( '' );
                expect( ds[ 1 ].textContent ).toEqual( 'bb' );
            } );

            it( 'does not work for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( '' );
                expect( ds[ 1 ].textContent ).toEqual( 'bb' );
            } );

            it( 'works for newly created repeat questions', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '' );
                expect( ages[ 1 ].textContent ).toEqual( '100' );
                expect( ages[ 2 ].textContent ).toEqual( '5' );
            } );

            it( 'works for newly created repeat questions (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form1.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '' );
                expect( ages[ 1 ].textContent ).toEqual( '100' );
                expect( ages[ 2 ].textContent ).toEqual( '5' );
            } );

            it( 'works for newly created hidden repeat nodes', () => {
                const form1 = loadForm( 'setvalue.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( '' );
                expect( ds[ 1 ].textContent ).toEqual( 'bb' );
                expect( ds[ 2 ].textContent ).toEqual( 'a' );
            } );

            it( 'works for newly created hidden repeat nodes (form with jr:template)', () => {
                const form1 = loadForm( 'setvalue-template.xml' );
                form1.init();
                form1.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form1.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( '' );
                expect( ds[ 1 ].textContent ).toEqual( 'bb' );
                expect( ds[ 2 ].textContent ).toEqual( 'a' );
            } );

            it( 'works when jr:repeat-count is used', () => {
                const form1 = new Form(
                    forms[ 'setvalue.xml' ].html_form.replace( 'class="or-repeat-info"', 'class="or-repeat-info" data-repeat-count="/data/count"' ), {
                        modelStr: forms[ 'setvalue.xml' ].xml_model
                    }
                );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );
                const ds = form1.model.xml.querySelectorAll( 'd' );
                expect( ages.length ).toEqual( 6 );
                expect( [ ...ages ].map( el => el.textContent ) ).toEqual( [ '', '100', '5', '5', '5', '5' ] );
                expect( [ ...ds ].map( el => el.textContent ) ).toEqual( [ '', 'bb', 'a', 'a', 'a', 'a' ] );
            } );

            it( 'works when jr:repeat-count is used (form with jr:template)', () => {
                const form1 = new Form(
                    forms[ 'setvalue-template.xml' ].html_form.replace( 'class="or-repeat-info"', 'class="or-repeat-info" data-repeat-count="/data/count"' ), {
                        modelStr: forms[ 'setvalue-template.xml' ].xml_model
                    }
                );
                form1.init();
                const ages = form1.model.xml.querySelectorAll( 'age' );
                const ds = form1.model.xml.querySelectorAll( 'd' );
                expect( ages.length ).toEqual( 6 );
                expect( [ ...ages ].map( el => el.textContent ) ).toEqual( [ '', '100', '5', '5', '5', '5' ] );
                expect( [ ...ds ].map( el => el.textContent ) ).toEqual( [ '', 'bb', 'a', 'a', 'a', 'a' ] );
            } );

        } );

        describe( 'with only odk-instance-first-load', () => {

            it( 'works for repeat questions inside default instances', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).toEqual( '5' );
            } );

            it( 'works for repeat questions inside default instances (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).toEqual( '5' );
            } );

            it( 'works for hidden repeat nodes inside default instances', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                // Overwrites static default
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
            } );

            it( 'works for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                // Overwrites static default
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
            } );

            it( 'does not work for newly created repeat questions', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).toEqual( '5' );
                expect( ages[ 2 ].textContent ).toEqual( '' );
            } );

            it( 'does not work for newly created repeat questions (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form2.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                // Overwrites static default
                expect( ages[ 1 ].textContent ).toEqual( '5' );
                expect( ages[ 2 ].textContent ).toEqual( '1000' );
            } );

            it( 'does not work for hidden newly created repeat nodes', () => {
                const form2 = loadForm( 'setvalue.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
                expect( ds[ 2 ].textContent ).toEqual( '' );
            } );

            it( 'does not work for hidden newly created repeat nodes (form with jr:template)', () => {
                const form2 = loadForm( 'setvalue-template.xml' );
                form2.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load' );
                form2.init();
                form2.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form2.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
                expect( ds[ 2 ].textContent ).toEqual( 'templated' );
            } );

        } );

        describe( 'with both odk-instance-first-load and odk-new-repeat events', () => {

            it( 'works for repeat questions inside default instances', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                expect( ages[ 1 ].textContent ).toEqual( '5' );
            } );

            it( 'works for repeat questions inside default instances (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 2 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                expect( ages[ 1 ].textContent ).toEqual( '5' );
            } );

            it( 'works for hidden repeat nodes inside default instances', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
            } );

            it( 'works for hidden repeat nodes inside default instances (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 2 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
            } );

            it( 'works for newly created repeat questions', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                expect( ages[ 1 ].textContent ).toEqual( '5' );
                expect( ages[ 2 ].textContent ).toEqual( '5' );
            } );

            it( 'works for newly created repeat questions (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/age"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ages = form3.model.xml.querySelectorAll( 'age' );

                expect( ages.length ).toEqual( 3 );
                expect( ages[ 0 ].textContent ).toEqual( '5' );
                expect( ages[ 1 ].textContent ).toEqual( '5' );
                expect( ages[ 2 ].textContent ).toEqual( '5' );
            } );

            it( 'works for hidden newly created hidden repeat nodes', () => {
                const form3 = loadForm( 'setvalue.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
                expect( ds[ 2 ].textContent ).toEqual( 'a' );
            } );

            it( 'works for hidden newly created hidden repeat nodes (form with jr:template)', () => {
                const form3 = loadForm( 'setvalue-template.xml' );
                form3.view.html.querySelector( '[name="/data/person/d"]' ).setAttribute( 'data-event', 'odk-instance-first-load odk-new-repeat' );
                form3.init();
                form3.view.html.querySelector( '.add-repeat-btn' ).click();
                const ds = form3.model.xml.querySelectorAll( 'd' );

                expect( ds.length ).toEqual( 3 );
                expect( ds[ 0 ].textContent ).toEqual( 'a' );
                expect( ds[ 1 ].textContent ).toEqual( 'a' );
                expect( ds[ 2 ].textContent ).toEqual( 'a' );
            } );

        } );

    } );

} );
