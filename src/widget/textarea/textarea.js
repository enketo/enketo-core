import Widget from '../../js/widget';

/**
 * Auto-resizes textarea elements.
 */
class TextareaWidget extends Widget {

    static get selector() {
        return 'form';
    }

    _init() {
        const textarea = this.element.querySelector( 'textarea' );
        const defaultHeight = textarea ? textarea.clientHeight : 20;
        this.element.addEventListener( 'input', event => {
            const el = event.target;
            if ( el.nodeName.toLowerCase() === 'textarea' ) {
                if ( el.scrollHeight > el.clientHeight && el.scrollHeight > defaultHeight ) {
                    // setting min-height instead of height, as height doesn't work in Grid Theme.
                    el.style[ 'min-height' ] = `${el.scrollHeight}px`;
                }
            }
        } );
    }
}

export default TextareaWidget;
