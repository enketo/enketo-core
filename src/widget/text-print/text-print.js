import Widget from '../../js/widget';

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
        return '.question:not(.or-appearance-autocomplete) > input[type=text]:not(.ignore):not([data-for])';
    }

    _init() {
        this.question.classList.add( 'or-text-print-initialized' );

        const className = 'print-input-text';
        const printElement = document.createElement( 'div' );
        printElement.classList.add( className );
        printElement.classList.add( 'print-only' );

        if ( getComputedStyle( this.element ).order !== '' ) {
            printElement.style.order = parseInt( getComputedStyle( this.element ).order, 10 ) + 1;
        }
        this.element.after( printElement );

        this.widget = this.element.parentElement.querySelector( `.${className}` );
        this._copyValue();

        this.element.addEventListener( 'input', () => {
            this._copyValue();
        } );
    }

    _copyValue() {
        this.widget.innerHTML = this.element.value.replace( /\n/g, '<br>' );
    }

    update() {
        this._copyValue();
    }
}

export default TextPrintWidget;
