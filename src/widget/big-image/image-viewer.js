import Widget from '../../js/widget';

/**
 * Viewer for image labels that have set a big-image version.
 *
 * @augments Widget
 */
class ImageViewer extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return 'a.or-big-image';
    }

    _init() {
        this.element.addEventListener( 'click', event => {
            const href = this.element.getAttribute( 'href' );
            const img = this.element.querySelector( 'img' );
            const src = img.getAttribute( 'src' );

            this.element.setAttribute( 'href', src );
            img.setAttribute( 'src', href );
            this.element.classList.toggle( 'open' );

            event.preventDefault();
            event.stopPropagation();
        } );
    }
}

export default ImageViewer;
