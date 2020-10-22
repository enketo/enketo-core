import Widget from '../../js/widget';
import events from '../../js/event';
import $ from 'jquery';

/**
 * Enhances radio buttons
 *
 * @augments Widget
 */
class Radiopicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return 'form';
    }

    _init() {
        const $form = $( this.element );
        const that = this;

        $form
            // Applies a data-checked attribute to the parent label of a checked radiobutton.
            .on( 'click', 'input[type="radio"]:not([readonly]):checked', function() {
                $( this ).parent( 'label' ).siblings().removeAttr( 'data-checked' ).end().attr( 'data-checked', 'true' );
            } )
            // Same for checkbox.
            .on( 'click', 'input[type="checkbox"]:not([readonly])', function() {
                that._updateDataChecked( this );
            } )
            // Detect programmatic changes to update data-checked attribute.
            .on( events.InputUpdate().type, 'input[type="radio"], input[type="checkbox"]', function() {
                this.closest( '.option-wrapper' )
                    .querySelectorAll( 'input[type="radio"],input[type="checkbox"]' )
                    .forEach( input => that._updateDataChecked( input ) );
            } )
            // Readonly buttons/checkboxes will not respond to clicks.
            .on( 'click', 'input[type="checkbox"][readonly],input[type="radio"][readonly]', event => {
                event.stopImmediatePropagation();

                return false;
            } )
            /*
             * In Safari a click on a readonly checkbox/radio button sets `checked` to true, **before** the click event fires.
             * This causes the model to update. The above clickhandler will set the checked back to false, but there is
             * no way to propagate that reversion back to the model.
             *
             * Disabling change handling on readonly checkboxes/radiobuttons is not an option, because of the scenario
             * described in Form.js in the comment above the change handler.
             *
             * The solution is to detect here whether the change event was triggered by a human, by checking if the
             * originalEvent property is defined.
             *
             * See more at https://github.com/enketo/enketo-core/issues/516
             */
            .on( events.Change().type, 'input[type="checkbox"][readonly],input[type="radio"][readonly]', function( event ) {
                const byProgram = typeof event.originalEvent === 'undefined';
                if ( !byProgram ) {
                    event.stopImmediatePropagation();
                    /*
                     * For radiobuttons, this is ugly and relies on the data-checked attribute.
                     * Without this, is it still possible to check a readonly radio button (although it won't propagate to the model).
                     * I think this is the only remnant of the usage of data-checked in Enketo. However, it is
                     * also still relied upon by Esri/Survey123.
                     */
                    if ( this.checked && this.parentNode.dataset.checked !== 'true' ) {
                        this.checked = false;
                    }
                }

                return byProgram;
            } )
            // Add unselect radio button functionality.
            .on( 'click', '[data-checked]>input[type="radio"]:not(.no-unselect)', function() {
                $( this ).prop( 'checked', false ).trigger( 'change' ).parent().removeAttr( 'data-checked' );
            } );

        // Defaults
        this.element
            .querySelectorAll( 'input[type="radio"]:checked, input[type="checkbox"]:checked' )
            .forEach( input => this._updateDataChecked( input ) );

    }

    /**
     * @param {Element} el - Element to update
     */
    _updateDataChecked( el ) {
        if ( el.checked ) {
            el.parentNode.dataset.checked = true;
        } else {
            delete el.parentNode.dataset.checked;
        }
    }
}

export default Radiopicker;
