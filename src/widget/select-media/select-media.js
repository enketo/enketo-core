import Widget from '../../js/widget';
import { getSiblingElement } from '../../js/dom-utils';

/**
 * Media Picker. Hides text labels if a media label is present.
 *
 * @augments Widget
 */
class MediaPicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-no-buttons';
    }

    _init() {
        this.element
            .querySelectorAll('.option-label')
            .forEach((optionLabel) => {
                if (getSiblingElement(optionLabel, 'img, video, audio')) {
                    optionLabel.style.display = 'none';
                }
            });
    }
}

export default MediaPicker;
