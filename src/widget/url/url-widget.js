import Widget from '../../js/widget';

/**
 * @augments Widget
 */
class UrlWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-url input[type="text"]';
    }

    _init() {
        const fragment = document.createRange().createContextualFragment( '<a class="widget url-widget" target="_blank" rel="noopener"/>' );

        this.element.classList.add( 'hide' );
        this.element.after( fragment );

        this.value = this.originalInputValue;
    }

    /**
     * Updates widget
     */
    update() {
        this.value = this.originalInputValue;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.question.querySelector( '.url-widget' ).href;
    }

    set value( value ) {
        value = value || '';
        const link = this.question.querySelector( '.url-widget' );
        link.href = value;
        link.title = value;
        link.textContent = value;
    }
}

export default UrlWidget;
