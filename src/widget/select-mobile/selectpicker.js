import Widget from '../../js/widget';
import support from '../../js/support';


/**
 * An enhancement for the native multi-selectpicker found on most mobile devices,
 * that shows the selected values next to the select box
 */
class MobileSelectPicker extends Widget {

    static get selector() {
        return 'select[multiple]';
    }

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

    update() {
        this._showSelectedValues();
    }
}

export default MobileSelectPicker;
