import Widget from '../../js/widget';
import events from '../../js/event';

/**
 * Clone text input fields value into new print-only element.
 * This is an unusual way to implement a feature, because it is not an actual widget,
 * but this is the easiest way to do it.
 */
class TextPrintWidget extends Widget {
    /**
     * @type string
     */
    static get selector() {
        // The [data-for] exclusion prevents "comment" widgets from being included.
        // It is not quite correct to do this but atm the "for" attribute in XForms is only used for comment widgets.
        return '.question:not(.or-appearance-autocomplete):not(.or-appearance-url) > input[type=text]:not(.ignore):not([data-for]), .question:not(.or-appearance-autocomplete):not(.or-appearance-url) > textarea:not(.ignore):not([data-for])';
    }

    _init() {
        this.question.addEventListener( events.PrintifyText().type, this._addWidget.bind( this ) );
        this.question.addEventListener( events.DePrintifyText().type, this._removeWidget.bind( this ) );
    }

    _addWidget() {
        const className = 'print-text-input';
        const printElement = document.createElement( 'div' );
        printElement.classList.add( className, 'widget' );

        if ( getComputedStyle( this.element ).order !== '' ) {
            printElement.style.order = parseInt( getComputedStyle( this.element ).order, 10 ) + 1;
        }
        this.element.after( printElement );
        this.element.classList.add( 'print-only' );

        this.widget = this.element.parentElement.querySelector( `.${className}` );
        this.widget.innerHTML = this.element.value.replace( /\n/g, '<br>' );
    }

    _removeWidget() {
        this.element.classList.remove( 'print-only' );
        this.element.parentElement.removeChild( this.widget );
    }

    update() {
        this._addWidget();
    }
}

export default TextPrintWidget;
