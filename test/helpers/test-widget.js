import SuperWidget from '../../src/js/widget';
import input from '../../src/js/input';
import events from '../../src/js/event';

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
            expect( typeof Widget.name === 'string' ).to.equal( true );
            expect( Widget.name.length > 0 ).to.equal( true );
        } );

        it( '"selector" is exported', () => {
            expect( typeof Widget.selector === 'string' ).to.equal( true );
            expect( Widget.selector.length > 0 ).to.equal( true );
        } );

    } );
}

function testRequiredMethods( Widget ) {
    describe( `required methods for ${Widget.name}:`, () => {
        const widgetProtoValue = Object.getOwnPropertyDescriptor( Widget.prototype, 'value' );
        const superProtoValue = Object.getOwnPropertyDescriptor( SuperWidget.prototype, 'value' );

        it( 'value getter is present', () => {
            expect( widgetProtoValue.get ).not.to.equal( superProtoValue.get );
        } );

        it( 'value setter is present', () => {
            expect( widgetProtoValue.set ).not.to.equal( superProtoValue.set );
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
                    expect( widget.element ).to.equal( control );
                    expect( widget.props.appearances.includes( 'one' ) ).to.equal( true );
                    expect( widget.props.appearances.includes( 'two' ) ).to.equal( true );
                    expect( widget.options ).to.equal( options );
                } )
                .then( done, done );
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
                            expect( widgetControls.every( el => el.classList.contains( 'ignore' ) ) ).to.equal( true );
                        }
                    }
                } )
                .then( done, done );
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
                    expect( widget.originalInputValue ).to.equal( value );
                    expect( widget.value ).to.equal( value );
                } )
                .then( done, done );
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
                    expect( widget.originalInputValue ).to.equal( value );

                    const question = control.closest( '.question' );
                    const resetButton = question ? question.querySelector( '.btn-reset' ) : null;
                    if ( resetButton ) {
                        resetButton.click();
                        expect( widget.value ).to.equal( '' );
                        expect( widget.originalInputValue ).to.equal( '' );
                    }
                } )
                .then( done, done );
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
                    expect( widget.originalInputValue ).to.equal( '' );

                    // Also needs to work for radiobuttons, checkboxes, selects.
                    input.setVal( control, value, null );
                    // Here we call widget.update() explicitly because we provided a null event parameter in input.setVal
                    widget.update();

                    expect( widget.value ).to.equal( value );
                    expect( widget.originalInputValue ).to.equal( value );
                } )
                .then( done, done );
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
                    expect( widget.value ).to.equal( value );
                    expect( widget.originalInputValue ).to.equal( value );

                    // Actual test
                    let changeEventCounter = 0;
                    control.addEventListener( events.Change().type, () => changeEventCounter++ );
                    // Calling update without changing the value.
                    widget.update();
                    expect( changeEventCounter ).to.equal( 0 );
                } )
                .then( done, done );
        } );

    } );

}

export { runAllCommonWidgetTests, testStaticProperties, testRequiredMethods, testBasicInstantiation, testComplexInstantiation, testReset, testUpdate };
