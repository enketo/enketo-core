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
        return 'input[type=text][data-type-xml="string"], textarea[data-type-xml="string"]';
    }

    _init() {
        const printElement = document.createElement( 'div' );

        const elementTagName = this.element.tagName.toLowerCase();
        let printElementClassName = 'print-' + elementTagName;
        if ( elementTagName === 'input' ) {
            printElementClassName += '-' + this.element.type;
        }
        printElement.className = printElementClassName + ' print-only';

        if ( getComputedStyle( this.element ).order !== '' ) {
            printElement.style.order = parseInt( getComputedStyle( this.element ).order, 10 ) + 1;
        }
        this.element.after( printElement );

        const widget = this.element.parentElement.querySelector( '.' + printElementClassName );
        if ( this.element.value !== '' ) {
            const widgetText = this.element.value.replace( /\n/g, '<br>' );
            widget.innerHTML = widgetText;
        }

        this.element.addEventListener( 'input', event => {
            const el = event.target;
            const widgetText = el.value.replace( /\n/g, '<br>' );
            widget.innerHTML = widgetText;
        } );
    }
}

export default TextPrintWidget;
