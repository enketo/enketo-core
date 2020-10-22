import Widget from '../../js/widget';
import support from '../../js/support';

/**
 * An enhancement for the native multi-selectpicker found on most mobile devices,
 * to show the selected values next to the select box
 *
 * @augments Widget
 */
class MobileSelectPicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question select[multiple]';
    }

    /**
     * @return {boolean} Whether additional condition to instantiate the widget is met.
     */
    static condition() {
        return support.touch;
    }

    _init() {
        const fragment = document.createRange().createContextualFragment( '<span class="widget mobileselect"></span>' );
        this.element.after( fragment );
        this.widget = this.element.parentElement.querySelector( '.widget' );

        // Show values on change
        this.element.addEventListener( 'change', () => {
            this._showSelectedValues();
        } );

        // Show defaults
        this._showSelectedValues();
    }

    /**
     * Display the selected values
     */
    _showSelectedValues() {
        this.widget.textContent = this.originalInputValue.join( ', ' );
    }

    /**
     * Updates widget
     */
    update() {
        this._showSelectedValues();
    }
}

export default MobileSelectPicker;
