import Widget from '../../js/widget';
import events from '../../js/event';

/**
 * Clone text input fields value into new print-only element.
 * This is an unusual way to implement a feature, because it is not an actual widget,
 * but this is the easiest way to do it.
 */
class TextPrintWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        // The [data-for] exclusion prevents "comment" widgets from being included.
        // It is not quite correct to do this but atm the "for" attribute in XForms is only used for comment widgets.
        return '.question:not(.or-appearance-autocomplete):not(.or-appearance-url) > input[type=text]:not(.ignore):not([data-for]), .question:not(.or-appearance-autocomplete):not(.or-appearance-url) > textarea:not(.ignore):not([data-for])';
    }

    _init() {
        this.question.addEventListener(
            events.Printify().type,
            this._addWidget.bind(this)
        );
        this.question.addEventListener(
            events.DePrintify().type,
            this._removeWidget.bind(this)
        );
    }

    _addWidget() {
        if (!this.widget) {
            const className = 'print-input-text';
            const printElement = document.createElement('div');
            printElement.classList.add(className, 'widget');

            this.element.after(printElement);
            this.element.classList.add('print-hide');

            this.widget = this.element.parentElement.querySelector(
                `.${className}`
            );
            this.widget.innerHTML = this.element.value.replace(/\n/g, '<br>');
        }
    }

    _removeWidget() {
        if (this.widget) {
            this.element.classList.remove('print-hide');
            this.element.parentElement.removeChild(this.widget);
            this.widget = null;
        }
    }
}

export default TextPrintWidget;
