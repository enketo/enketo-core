import SuperWidget from '../../src/js/widget';
import input from '../../src/js/input';

const FORM_CONTROL_TEMPLATE = `
    <label class="question">
        <input type="text" name="/data/node">
    </label>`;

function runAllCommonWidgetTests( Widget, template = FORM_CONTROL_TEMPLATE, value = '2', options ) {
    testStaticProperties( Widget );
    testRequiredMethods( Widget );
    testBasicInstantiation( Widget, template, options );
    testComplexInstantiation( Widget, template, value, options );
    testReset( Widget, template, value );
    testUpdate( Widget, template, value );
    testExcessiveChangeEventAvoidance( Widget, template, value );
}

function testStaticProperties( Widget ) {
    describe( `static properties for ${Widget.name}:`, () => {

        it( '"name" is exported', () => {
            expect( typeof Widget.name === 'string' ).toBe( true );
            expect( Widget.name.length > 0 ).toBe( true );
        } );

        it( '"selector" is exported', () => {
            expect( typeof Widget.selector === 'string' ).toBe( true );
            expect( Widget.selector.length > 0 ).toBe( true );
        } );

    } );
}

function testRequiredMethods( Widget ) {
    describe( `required methods for ${Widget.name}:`, () => {
        const widgetProtoValue = Object.getOwnPropertyDescriptor( Widget.prototype, 'value' );
        const superProtoValue = Object.getOwnPropertyDescriptor( SuperWidget.prototype, 'value' );

        it( 'value getter is present', () => {
            expect( widgetProtoValue.get ).not.toEqual( superProtoValue.get );
        } );

        it( 'value setter is present', () => {
            expect( widgetProtoValue.set ).not.toEqual( superProtoValue.set );
        } );

    } );
}

function testBasicInstantiation( Widget, template, options = { a: 'b' } ) {
    describe( `basic instantiation of ${Widget.name}:`, () => {

        it( 'passes options and populates widget props', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const question = Widget.selector === 'form' ? fragment.querySelector( 'form.or' ) : fragment.querySelector( '.question' );
            question.classList.add( 'or-appearance-one' );
            question.classList.add( 'or-appearance-two' );
            const control = fragment.querySelector( Widget.selector );

            Promise.resolve()
                .then( () => new Widget( control, options ) )
                .then( widget => {
                    expect( widget.element ).toEqual( control );
                    expect( widget.props.appearances.includes( 'one' ) ).toBe( true );
                    expect( widget.props.appearances.includes( 'two' ) ).toBe( true );
                    expect( widget.options ).toEqual( options );
                } )
                .then( done, fail );
        } );

        it( 'adds an "ignore" class to all form controls inside the widget', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const control = fragment.querySelector( Widget.selector );
            Promise.resolve()
                .then( () => new Widget( control ) )
                .then( widget => {
                    if ( widget.question ) {
                        const widgetEl = widget.question.querySelector( '.widget' );
                        if ( widgetEl ) {
                            let widgetControls = widgetEl.matches( 'input, select, textarea' ) ? [ widgetEl ] : [];
                            widgetControls = widgetControls.concat( [ ...widgetEl.querySelectorAll( 'input, select, textarea' ) ] );
                            expect( widgetControls.every( el => el.classList.contains( 'ignore' ) ) ).toBe( true );
                        }
                    }
                } )
                .then( done, fail );
        } );

    } );
}

function testComplexInstantiation( Widget, template, value, options ) {
    describe( `complex instantiation of ${Widget.name}:`, () => {

        it( 'loads default value', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const control = fragment.querySelector( Widget.selector );

            // Also needs to work for radiobuttons, checkboxes, selects.
            input.setVal( control, value, null );
            Promise.resolve()
                .then( () => new Widget( control, options ) )
                .then( widget => {
                    expect( widget.originalInputValue ).toEqual( value );
                    expect( widget.value ).toEqual( value );
                } )
                .then( done, fail );
        } );

    } );
}

function testReset( Widget, template, value ) {
    describe( `resetting of ${Widget.name} (if reset button exists):`, () => {

        it( 'works', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const control = fragment.querySelector( Widget.selector );

            // Also needs to work for radiobuttons, checkboxes, selects.
            input.setVal( control, value, null );

            Promise.resolve()
                .then( () => new Widget( control ) )
                .then( widget => {
                    expect( widget.originalInputValue ).toEqual( value );

                    const question = control.closest( '.question' );
                    const resetButton = question ? question.querySelector( '.btn-reset' ) : null;
                    if ( resetButton ) {
                        resetButton.click();
                        expect( widget.value ).toEqual( '' );
                        expect( widget.originalInputValue ).toEqual( '' );
                    }
                } )
                .then( done, fail );
        } );

    } );
}

function testUpdate( Widget, template, value ) {
    describe( `updating of ${Widget.name}:`, () => {

        it( 'works', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const control = fragment.querySelector( Widget.selector );

            Promise.resolve()
                .then( () => new Widget( control ) )
                .then( widget => {
                    expect( widget.originalInputValue ).toEqual( '' );

                    // Also needs to work for radiobuttons, checkboxes, selects.
                    input.setVal( control, value, null );
                    // Here we call widget.update() explicitly because we provided a null event parameter in input.setVal
                    widget.update();

                    expect( widget.value ).toEqual( value );
                    expect( widget.originalInputValue ).toEqual( value );
                } )
                .then( done, fail );
        } );

    } );
}

// This test checks for excessive firing of change events on the original input by the widget.
// i.e. firing a change event when the value hasn't actually changed.
function testExcessiveChangeEventAvoidance( Widget, template, value ) {
    describe( `programmatically updating ${Widget.name} to the same value it already has`, () => {

        it( 'does not lead to a change event firing', done => {
            const fragment = document.createRange().createContextualFragment( template );
            const control = fragment.querySelector( Widget.selector );

            Promise.resolve()
                .then( () => new Widget( control ) )
                .then( widget => {
                    // Also needs to work for radiobuttons, checkboxes, selects.
                    input.setVal( control, value, null );
                    // Here we call widget.update() explicitly because we provided a null event parameter in input.setVal
                    widget.update();

                    // Check setup
                    expect( widget.value ).toEqual( value );
                    expect( widget.originalInputValue ).toEqual( value );

                    // Actual test
                    let changeEventCounter = 0;
                    control.addEventListener( 'change', () => changeEventCounter++ );
                    // Calling update without changing the value.
                    widget.update();
                    expect( changeEventCounter ).toEqual( 0 );
                } )
                .then( done, fail );
        } );

    } );

}

export { runAllCommonWidgetTests, testStaticProperties, testRequiredMethods, testBasicInstantiation, testComplexInstantiation, testReset, testUpdate };
