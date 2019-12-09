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
        return '.question > input[type=text]:not(.autocomplete):not(.ignore)';
    }

    _init() {
        this.question.classList.add( 'or-text-print-initialized' );

        const printElement = document.createElement( 'div' );
        printElement.classList.add( this._getClassName() );
        printElement.classList.add( 'print-only' );

        if ( getComputedStyle( this.element ).order !== '' ) {
            printElement.style.order = parseInt( getComputedStyle( this.element ).order, 10 ) + 1;
        }
        this.element.after( printElement );

        const widget = this.element.parentElement.querySelector( `.${this._getClassName()}` );
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

    _getClassName() {
        const elementTagName = this.element.tagName.toLowerCase();
        let printElementClassName = 'print-' + elementTagName;
        if ( elementTagName === 'input' ) {
            printElementClassName += '-' + this.element.type;
        }

        return printElementClassName;
    }

    update() {
        if ( this.element.getAttribute( 'data-calculate' ) !== null && this.element.getAttribute( 'data-calculate' ) !== '' ) {
            const dataCalculateValue = this.element.getAttribute( 'data-calculate' ).trim();
            const dataCalculateElement = document.querySelector( `[name="${dataCalculateValue}"]` );
            if ( dataCalculateElement ) {
                const widget = this.element.parentElement.querySelector( `.${this._getClassName()}` );
                if ( dataCalculateElement.value !== '' ) {
                    const widgetText = dataCalculateElement.value.replace( /\n/g, '<br>' );
                    widget.innerHTML = widgetText;
                }
            }
        }
    }
}

export default TextPrintWidget;
