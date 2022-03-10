import { t } from 'enketo/translator';
import Widget from '../../js/widget';
import events from '../../js/event';
import { getSiblingElement } from '../../js/dom-utils';

const SELECTORS = 'path[id], g[id], circle[id]';

/**
 * Image Map widget that turns an SVG image into a clickable map
 * by matching radiobutton/checkbox values with id attribute values in the SVG.
 *
 * @augments Widget
 */
class ImageMap extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.simple-select.or-appearance-image-map label:first-child > input';
    }

    _init() {
        const img = this.question.querySelector('img');
        this.question.classList.add('or-image-map-initialized');
        /*
         * To facilitate Enketo Express' offline webforms,
         * where the img source is populated after form loading, we initialize upon image load
         * if the src attribute is not yet populated.
         *
         * We could use the same with online-only forms, but that would cause a loading delay.
         */

        if (!img) {
            this._showSvgNotFoundError();
        } else if (img.getAttribute('src')) {
            // return a promise, resolving with instance for asynchronous initialization
            return this._addMarkup(img)
                .then(this._addFunctionality.bind(this))
                .then(() => this);
        } else {
            return new Promise((resolve) => {
                img.addEventListener('load', () => {
                    this._addMarkup(img).then(
                        this._addFunctionality.bind(this)
                    );
                    resolve(this);
                });
            });
            // Ignore errors, because an img element without source may throw one.
            // E.g. in Enketo Express inside a repeat: https://github.com/kobotoolbox/enketo-express/issues/961
        }
    }

    /**
     * @param {object} widget - the widget element
     */
    _addFunctionality(widget) {
        if (widget) {
            this.svg = widget.querySelector('svg');
            this.tooltip = widget.querySelector('.image-map__ui__tooltip');
            if (this.props.readonly) {
                this.disable();
            }
            this._setSvgClickHandler();
            this._setChangeHandler();
            this._setHoverHandler();
            this._updateImage();
            this._setPageHandler();
        }
    }

    /**
     * @param {Element} img - the image element
     * @return {Promise} the widget element
     */
    _addMarkup(img) {
        const that = this;
        const src = img.getAttribute('src');

        /**
         * For translated forms, we now discard everything except the first image,
         * since we're assuming the images will be the same in all languages.
         */
        return fetch(src)
            .then((response) => response.text())
            .then((txt) => new DOMParser().parseFromString(txt, 'text/xml'))
            .then((doc) => {
                if (that._isSvgDoc(doc)) {
                    const svgFragment = that._removeUnmatchedIds(
                        doc.querySelector('svg')
                    );
                    const fragment = document
                        .createRange()
                        .createContextualFragment(
                            `<div class="widget image-map">
                            <div class="image-map__ui">
                                <span class="image-map__ui__tooltip"></span>
                            </div>
                        </div>`
                        );
                    fragment.querySelector('.widget').append(svgFragment);

                    // remove images in all languages
                    that.question
                        .querySelectorAll('img')
                        .forEach((el) => el.remove());
                    that.question
                        .querySelector('fieldset > .option-wrapper')
                        .before(fragment);
                    const widget = that.question.querySelector('.image-map');
                    const svg = widget.querySelector('svg');

                    // Use any explicitly defined viewPort and else define one using bounding box or attributes
                    if (!svg.getAttribute('viewBox')) {
                        this._setViewBox(svg);
                    }

                    return widget;
                }
                throw 'Image is not an SVG doc';
            })
            .catch(this._showSvgNotFoundError.bind(that));
    }

    _setViewBox(svg) {
        let viewBox;
        try {
            // Resize, using original unscaled SVG dimensions
            // Note that width and height will be zero if the SVG is currently not visible
            const bbox = svg.getBBox();
            viewBox = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
        } catch (e) {
            // svg.getBBox() only works after SVG has been added to DOM.
            // In FF getBBox causes an "NS_ERROR_FAILURE" exception likely because the SVG
            // image has not finished rendering. This doesn't always happen though.
            // For now, we just log the FF error, and hope that resizing is done correctly via
            // attributes.
            console.error('Could not obtain Boundary Box of SVG element', e);
            const width = svg.getAttribute('width');
            const height = svg.getAttribute('height');
            if (width && height) {
                viewBox = `0 0 ${parseInt(width, 10)} ${parseInt(height, 10)}`;
            }
        }
        svg.setAttribute('viewBox', viewBox);
    }

    /**
     * @param {Error} err - error message
     */
    _showSvgNotFoundError(err) {
        console.error(err);
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget image-map">
                <div class="image-map__error" data-i18n="imagemap.svgNotFound">${t(
                    'imagemap.svgNotFound'
                )}</div>
            </div>`
        );
        this.question.querySelector('.option-wrapper').before(fragment);
    }

    /**
     * Removes id attributes from unmatched path elements in order to prevent hover effect (and click listener).
     *
     * @param {Element} svg - SVG element
     * @return {Element} cleaned up SVG
     */
    _removeUnmatchedIds(svg) {
        svg.querySelectorAll(SELECTORS).forEach((el) => {
            if (!this._getInput(el.id)) {
                el.removeAttribute('id');
            }
        });

        return svg;
    }

    /**
     * @param {string} id - the option ID
     * @return {Element} input element with matching ID
     */
    _getInput(id) {
        return this.question.querySelector(`input[value="${CSS.escape(id)}"]`);
    }

    /**
     * Handles SVG click listener
     */
    _setSvgClickHandler() {
        this.svg.addEventListener('click', (ev) => {
            if (
                !ev.target.closest('svg').matches('[or-readonly]') &&
                (ev.target.matches(SELECTORS) || ev.target.closest(SELECTORS))
            ) {
                const id = ev.target.id || ev.target.closest('g[id]').id;
                const input = this._getInput(id);
                if (input) {
                    input.checked = !input.checked;
                    input.dispatchEvent(events.Change());
                    input.dispatchEvent(events.FakeFocus());
                }
            }
        });
    }

    /**
     * Handles change listener
     */
    _setChangeHandler() {
        this.question.addEventListener('change', this._updateImage.bind(this));
    }

    /**
     * Handles hover listener
     */
    _setHoverHandler() {
        this.svg.querySelectorAll(SELECTORS).forEach((el) => {
            el.addEventListener('mouseenter', (ev) => {
                const id = ev.target.id || ev.target.closest('g[id]').id;
                const label = getSiblingElement(
                    this._getInput(id),
                    '.option-label.active'
                );
                const optionLabel = label ? label.textContent : '';
                this.tooltip.textContent = optionLabel;
            });
            el.addEventListener('mouseleave', (ev) => {
                if (ev.target.matches(SELECTORS)) {
                    this.tooltip.textContent = '';
                }
            });
        });
    }

    /**
     * Handles page flip of page in which the widget is placed.
     */
    _setPageHandler() {
        const page = this.element.closest('[role="page"]');

        if (page) {
            page.addEventListener(events.PageFlip().type, () =>
                this._setViewBox(this.svg)
            );
        }
    }

    /**
     * @param {object} data - an object
     * @return {boolean} whether provided object is an SVG document
     */
    _isSvgDoc(data) {
        return typeof data === 'object' && data.querySelector('svg');
    }

    /**
     * Updates 'selected' attributes in SVG
     * Always update the map after the value has changed in the original input elements
     */
    _updateImage() {
        let values = this.originalInputValue;
        this.svg
            .querySelectorAll(
                'path[or-selected], g[or-selected], circle[or-selected]'
            )
            .forEach((el) => el.removeAttribute('or-selected'));

        if (typeof values === 'string') {
            values = [values];
        }

        values.forEach((value) => {
            if (value) {
                // if multiple values have the same id, change all of them (e.g. a province that is not contiguous)
                this.svg
                    .querySelectorAll(
                        `path#${CSS.escape(value)},g#${CSS.escape(
                            value
                        )},circle#${CSS.escape(value)}`
                    )
                    .forEach((el) => el.setAttribute('or-selected', ''));
            }
        });
    }

    /**
     * Disables widget
     */
    disable() {
        this.svg.setAttribute('or-readonly', '');
    }

    /**
     * Enables widget
     */
    enable() {
        this.svg.removeAttribute('or-readonly');
    }

    /**
     * Updates widget image
     */
    update() {
        this._updateImage();
    }

    /**
     * @type {string}
     */
    get value() {
        // This widget is unusual. It would better to get the value from the map.
        return this.originalInputValue;
    }

    set value(value) {
        // This widget is unusual. It would more consistent to set the value in the map perhaps.
        this.originalInputValue = value;
    }
}

export default ImageMap;
