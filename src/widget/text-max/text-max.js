import config from 'enketo/config';
import Widget from '../../js/widget';

/**
 * Hardcodes a maximum character length to text input fields.
 * This is an unusual way to implement a feature, because it is not an actual widget,
 * but this is the easiest way to do it.
 */
class TextMaxWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '[data-type-xml="string"]';
    }

    _init() {
        const max = Number(config.textMaxChars);
        if (!isNaN(max) && max > 0) {
            this.element.setAttribute('maxlength', config.textMaxChars);
        }
    }
}

export default TextMaxWidget;
