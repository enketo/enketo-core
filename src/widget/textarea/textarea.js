import Widget from '../../js/widget';

/**
 * Auto-resizes textarea elements.
 *
 * @extends Widget
 */
class TextareaWidget extends Widget {
    /**
     * @type string
     */
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
                    // using height instead of min-height to allow user to resize smaller manually
                    el.style[ 'height' ] = `${el.scrollHeight}px`;
                    // for the Grid theme:
                    el.style[ 'flex' ] = 'auto';
                }
            }
        } );
    }
}

export default TextareaWidget;
