// @ts-check

import SignaturePad from 'signature_pad';

/**
 * Gets the theoretical maximum width of a given element, determined by its own
 * computed `max-width` style (in `px` units), or that of one of its
 * `offsetParent`s. If no such element is found, the element's current
 * `offsetWidth` is returned.
 *
 * Note that this will fail for elements outside the visible DOM tree.
 *
 * @package - exported only for testing
 * @param {HTMLElement} element
 */
export const getMaxWidth = (element) => {
    /** @type {HTMLElement | null} */
    let clone = null;

    const { isConnected } = element;

    if (!isConnected) {
        throw new Error(
            'Max width cannot be computed for elements outside the visible DOM tree'
        );
    }

    let current = element;
    let { maxWidth } = getComputedStyle(current);

    while (maxWidth === 'none' && current.offsetParent != null) {
        maxWidth = getComputedStyle(current).maxWidth;
        current = /** @type {HTMLElement} */ (current.offsetParent);
    }

    if (maxWidth === 'none') {
        return element.offsetWidth;
    }

    const maxPixels = Number(maxWidth.replace(/^(\d+)px$/, '$1'));

    if (Number.isNaN(maxPixels)) {
        return element.offsetWidth;
    }

    if (current !== element) {
        element.classList.add('__TEMP_GET_MAX_WIDTH__');

        if (clone == null) {
            clone = /** @type {HTMLElement} */ (current.cloneNode(true));

            element.classList.remove('__TEMP_GET_MAX_WIDTH__');

            clone.style.opacity = '0';
            clone.style.position = 'absolute';
            clone.style.width = maxWidth;
            document.body.append(clone);
        }

        const { offsetWidth } = /** @type {HTMLElement} */ (
            clone.querySelector('.__TEMP_GET_MAX_WIDTH__')
        );

        clone.remove();

        return offsetWidth;
    }

    return maxPixels;
};

/**
 * @param {HTMLCanvasElement} canvas
 * @return {CanvasRenderingContext2D}
 */
const get2dRenderingContext = (canvas) => {
    const context = canvas.getContext('2d');

    if (context == null) {
        throw new Error('Could not get rendering context');
    }

    return context;
};

/**
 * For some reason, drawing `ImageBitmap` data to a canvas does nothing when the
 * canvas element is detached. As a workaround, we attach the canvas element to
 * this visibly hidden container to support that operation.
 */
const detachedCanvasContainer = document.createElement('div');

detachedCanvasContainer.ariaHidden = 'true';

Object.assign(detachedCanvasContainer.style, {
    postition: 'absolute',
    top: '-1px',
    left: '-1px',
    opacity: 0,
    width: '1px',
    height: '1px',
    overflow: 'hidden',
});
document.body.append(detachedCanvasContainer);

/**
 * @typedef {import('signature_pad').Options} SignaturePadOptions
 */

/**
 * @typedef {import('signature_pad').PointGroup} PointGroup
 */

/**
 * @extends {SignaturePad}
 * @implements {SignaturePad}
 */
export class ResizableSignaturePad extends SignaturePad {
    /**
     * Tracks which `ResizableSignaturePad` is associated with its canvas
     * element. This allows more efficient (and idiomatic) use of
     * `IntersectionObserver` and `ResizeObserver`, where the same logic is
     * attached and detached to individual elements as needed.
     *
     * @type {WeakMap<Element, ResizableSignaturePad>}
     */
    static canvasToPad = new WeakMap();

    /**
     * @private
     *
     * There are several non-obvious implications to how `intersectionObserver`
     * and {@link resizeObserver} are used to address, and in some cases improve
     * upon, several behaviors previously handled in `draw-widget.js`.
     *
     * In both this implementation and the prior one, some behavior is deferred
     * when the canvas element is determined not to be visible.
     *
     * - Previously, this determination was based on the canvas having a
     *   width/height of 0 (e.g. an inactive question in "pages" mode). When it
     *   was determined the canvas element is not visible, resize behavior would
     *   be deferred.
     *
     * - It is now determined by `IntersectionObserver`, now standard for
     *   determining element visibility, even if the element is below the fold
     *   but would otherwise be visible. While a canvas element is not visible
     *   in the viewport, it is removed from resize observation until it becomes
     *   visible again.
     *
     * In both implementations, there is logic to update state specific to
     * behaviors of both the HTML canvas API and the underlying `SignaturePad`
     * when the canvas element is resized.
     *
     * - Previously, resize logic was performed:
     *
     *      - any time the browser window was resized and the canvas element was
     *        determined to be visible
     *
     *      - explicitly when the editing state changes on mobile
     *
     *      - explicitly when the current page changes in "pages" mode
     *
     * - It is now determined by the standard `ResizeObserver`, and each canvas
     *   element is observed directly.
     *
     * In both implementations, there is a need to perform the same "resize"
     * logic upon initializtion, as the canvas element's default size may not
     * match the initial display size.
     *
     * - Previously, this was performed by explicitly invoking the resize logic
     *   at a specific point in the initialization process.
     *
     * - This initialization is now performed implicitly when each canvas
     *   element is observed (i.e. the built-in behavior of both observer APIs).
     */
    static intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const { target: canvas } = entry;
            const pad = this.canvasToPad.get(
                /** @type {HTMLCanvasElement} */ (canvas)
            );

            if (pad == null) {
                return;
            }

            const { isIntersecting: isVisible } = entry;

            // Note: the reason these observers are static members of
            // `ResizableSignatureObserver`, rather than top-level constants, is
            // to allow access to private instance members.
            pad.isVisible = isVisible;

            if (isVisible) {
                this.resizeObserver.observe(canvas);
            } else {
                this.resizeObserver.unobserve(canvas);
            }

            /**
             * TODO: how (if at all) should we handle removal of the canvas
             * element from the visible DOM tree? It seems at least probable
             * that:
             *
             * - The reference in {@link canvasToPad} will be freed eventually.
             *
             * - We'll detect that the canvas element is no longer visible _if
             *   it had been_, and its observation {@link resizeObserver} will
             *   be detached, but we won't stop observing visibility in any
             *   case. This would be sufficient to detect cases where the canvas
             *   may be reattached, but it's not clear how likely that is.
             *
             * - All other internal references/state will not be freed,
             *   potentially causing a leak.
             *
             * - If the canvas element **were reattached**, it would likely be
             *   detected as a **new instance** of the widget, creating a
             *   redundant instance of this class.
             *
             * It seems the most appropriate immediate solution would be to tear
             * down everything on DOM removal. This would probably be sufficient
             * for the currently implied tight coupling with `DrawWidget`. But
             * the design of `ResizableSignaturePad` is very nearly appropriate
             * to break that tight coupling and either contribute upstream or
             * release as a separate wrapper package. If that were the case,
             * we'd want to anticipate the more general case where
             * detaching/reattaching arbitrary DOM nodes is quite common.
             */
        });
    });

    /**
     * @private
     * @see {@link intersectionObserver}
     */
    static resizeObserver = new ResizeObserver((entries) => {
        const targets = [...new Set(entries.map(({ target }) => target))];

        targets.forEach((target) => {
            const pad = this.canvasToPad.get(target);

            if (pad == null) {
                return;
            }

            pad.redraw();
        });
    });

    /** @private */
    isChangePending = false;

    /** @private */
    accessorState = {
        isVisible: false,
        displayCanvasMaxWidth: 0,
    };

    /** @private */
    get isVisible() {
        return (
            this.accessorState.isVisible &&
            this.displayCanvas.offsetWidth > 0 &&
            this.displayCanvas.offsetHeight > 0
        );
    }

    /** @private */
    set isVisible(isVisible) {
        const wasVisible = this.accessorState.isVisible;

        this.accessorState.isVisible = isVisible;

        if (!wasVisible && isVisible && this.isChangePending) {
            this.dispatchChangeEvent();
        }
    }

    /** @private */
    get canvasHeightRatio() {
        return this.displayCanvas.offsetHeight / this.displayCanvas.offsetWidth;
    }

    /**
     * @private
     * @type {number}
     */
    get displayCanvasMaxWidth() {
        const { displayCanvasMaxWidth } = this.accessorState;

        if (displayCanvasMaxWidth) {
            return displayCanvasMaxWidth;
        }

        this.accessorState.displayCanvasMaxWidth = getMaxWidth(
            this.displayCanvas
        );

        return this.accessorState.displayCanvasMaxWidth;
    }

    /** @private */
    set displayCanvasMaxWidth(maxWidth) {
        /** @private */
        this.accessorState.displayCanvasMaxWidth = maxWidth;
    }

    /** @private */
    get displayCanvasMaxHeight() {
        return (this.displayCanvasMaxWidth ?? 0) * this.canvasHeightRatio;
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {SignaturePadOptions} [options]
     */
    constructor(canvas, options) {
        super(canvas, options);

        ResizableSignaturePad.canvasToPad.set(canvas, this);
        ResizableSignaturePad.intersectionObserver.observe(canvas);

        /**
         * @private
         * @readonly
         * @type {HTMLCanvasElement}
         */
        this.displayCanvas = canvas;

        /**
         * @private
         * @readonly
         * @type {HTMLCanvasElement}
         */
        this.fullSizeCanvas = document.createElement('canvas');

        /**
         * @see {@link detatchedCanvasContainer}
         */
        detachedCanvasContainer.append(this.fullSizeCanvas);

        /**
         * @private
         * @readonly
         * @type {SignaturePad}
         */
        this.fullSizePad = new SignaturePad(this.fullSizeCanvas, options);

        /**
         * @private
         * @type {PointGroup[]}
         */
        this.pointGroups = [];

        /**
         * @private
         * @type {ImageBitmap | null}
         * @see {@link drawBaseImage}
         */
        this.baseImage = null;

        /**
         * @private
         * @type {string}
         */
        this.objectURL = '';

        this.addEventListener('endStroke', () => {
            const maxWidthScale =
                this.displayCanvasMaxWidth / this.displayCanvas.offsetWidth;

            this.pointGroups = this.scalePointGroups(
                this.toData(),
                maxWidthScale
            );
            this.dispatchChangeEvent();
        });
    }

    /** @private */
    dispatchChangeEvent() {
        const { objectURL } = this;

        if (objectURL !== '') {
            // This will fail silently if it is performed after the request for
            // the current blob state below
            URL.revokeObjectURL(objectURL);
        }

        if (!this.isVisible) {
            this.isChangePending = true;

            return;
        }

        this.isChangePending = false;
        this.dispatchEvent(new Event('change'));
    }

    /** @private */
    resizeDisplayCanvas() {
        const { offsetWidth, offsetHeight } = this.displayCanvas;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        this.displayCanvas.width =
            (offsetWidth || this.displayCanvasMaxWidth) * ratio;
        this.displayCanvas.height =
            (offsetHeight || this.displayCanvasMaxHeight) * ratio;
        get2dRenderingContext(this.displayCanvas).scale(ratio, ratio);
    }

    /** @private */
    redraw() {
        this.clear();
        this.resizeDisplayCanvas();
        this.drawBaseImage();
        this.setDrawingData(this.pointGroups);
    }

    /**
     * @private
     * @param {HTMLCanvasElement} [canvas]
     *
     * While {@link setBaseImage} is inherently asynchronous, `drawBaseImage` is
     * able to be synchronous, because it uses a cached `ImageBitmap` instance.
     * This API is somewhat obscure, but its use results in significantly better
     * performance. The improvement is significant enough to eliminate the need
     * for artificial delays on `getObjectURL`. Combined with use of
     * `ResizeObserver`, it's also significant enough to eliminate the need for
     * throttling.
     *
     * This approach was discovered when, even with throttling, asynchronously
     * redrawing binary image data with the base library's `fromDataURL` would
     * cause flickering while resizing.
     */
    drawBaseImage(canvas = this.displayCanvas) {
        const { baseImage: baseImageBitmap } = this;

        if (baseImageBitmap == null) {
            const { width, height } = canvas;

            get2dRenderingContext(canvas).clearRect(0, 0, width, height);

            return;
        }

        const { offsetHeight, offsetWidth } = canvas;

        let { height, width } = baseImageBitmap;

        const widthRatio = this.displayCanvasMaxWidth / width;
        const heightRatio = this.displayCanvasMaxHeight / height;
        const bitmapRatio = Math.min(heightRatio, widthRatio);
        const canvasRatio = offsetWidth / this.displayCanvasMaxWidth;

        width = width * bitmapRatio * canvasRatio;
        height = height * bitmapRatio * canvasRatio;

        const xOffset = Math.max(0, (offsetWidth - width) / 2);
        const yOffset = Math.max(0, (offsetHeight - height) / 2);

        get2dRenderingContext(canvas).drawImage(
            baseImageBitmap,
            xOffset,
            yOffset,
            width,
            height
        );
    }

    /**
     * @param {string | Blob} image
     */
    async setBaseImage(image) {
        this.baseImage?.close();

        /** @type {Blob} */
        let blob;

        if (image instanceof Blob) {
            blob = image;
        } else {
            const response = await fetch(image);

            blob = await response.blob();
        }

        this.baseImage?.close();
        this.baseImage = await createImageBitmap(blob);
        this.redraw();
        this.dispatchChangeEvent();
    }

    /**
     * @private
     * @param {PointGroup[]} pointGroups
     * @param {number} scale
     * @param {number} [minLineWidth]
     * @param {number} [maxLineWidth]
     * @return {PointGroup[]}
     */
    scalePointGroups(
        pointGroups,
        scale,
        minLineWidth = 0.5,
        maxLineWidth = minLineWidth * 5
    ) {
        return pointGroups.map((group) => ({
            ...group,
            minWidth: minLineWidth,
            maxWidth: maxLineWidth,

            points: group.points.map((point) => {
                const { x, y, pressure, time, ...rest } = point;

                return {
                    ...rest,
                    x: x * scale,
                    y: y * scale,
                    pressure: pressure * scale,
                    time: time * scale,
                };
            }),
        }));
    }

    /**
     * @private
     * @param {PointGroup[]} pointGroups
     */
    setDrawingData(pointGroups) {
        const { displayCanvas, displayCanvasMaxWidth } = this;
        const { offsetWidth } = displayCanvas;
        const scale =
            offsetWidth === 0 ? 1 : offsetWidth / displayCanvasMaxWidth;
        const minLineWidth = Math.max(
            0.325,
            (0.5 * offsetWidth) / displayCanvasMaxWidth
        );
        const maxLineWidth = minLineWidth * 5;

        this.minWidth = minLineWidth;
        this.maxWidth = maxLineWidth;

        const scaled = this.scalePointGroups(
            pointGroups,
            scale,
            minLineWidth,
            maxLineWidth
        );

        this.pointGroups = pointGroups;

        this.fromData(scaled, {
            clear: false,
        });
    }

    /** @private */
    clearDrawingData() {
        this.clear();
        this.setDrawingData([]);
        this.drawBaseImage();
        this.dispatchChangeEvent();
    }

    undoStroke() {
        const { pointGroups } = this;

        this.setDrawingData(pointGroups.slice(0, pointGroups.length - 1));
        this.redraw();
        this.dispatchChangeEvent();
    }

    reset() {
        this.baseImage?.close();
        this.baseImage = null;
        this.clearDrawingData();
        super.clear();
        this.dispatchChangeEvent();
    }

    /** @private */
    resizeFullSizeCanvas() {
        let {
            displayCanvasMaxWidth: canvasWidth,
            displayCanvasMaxHeight: canvasHeight,
        } = this;

        if (this.baseImage != null) {
            const { canvasHeightRatio } = this;
            const { width, height } = this.baseImage;
            const heightRatio = height / width;

            canvasHeight =
                heightRatio > canvasHeightRatio
                    ? height
                    : width * canvasHeightRatio;
            canvasWidth = canvasHeight / canvasHeightRatio;
        }

        this.fullSizeCanvas.style.width = `${canvasWidth}px`;
        this.fullSizeCanvas.style.height = `${canvasHeight}px`;
        this.fullSizeCanvas.width = canvasWidth;
        this.fullSizeCanvas.height = canvasHeight;
        get2dRenderingContext(this.fullSizeCanvas).scale(1, 1);
    }

    async toObjectURL() {
        if (this.baseImage == null && this.pointGroups.length === 0) {
            this.objectURL = '';

            return '';
        }

        this.resizeFullSizeCanvas();

        const pointGroups = this.scalePointGroups(
            this.pointGroups,
            this.fullSizeCanvas.width / this.displayCanvasMaxWidth
        );

        this.fullSizePad.clear();
        this.drawBaseImage(this.fullSizeCanvas);
        this.fullSizePad.fromData(pointGroups, {
            clear: false,
        });

        const blob = await new Promise((resolve) => {
            this.fullSizeCanvas.toBlob((result) => {
                if (result instanceof Blob) {
                    resolve(result);
                } else {
                    resolve(null);
                }
            });
        });

        if (blob == null) {
            this.objectURL = '';

            return '';
        }

        this.objectURL = URL.createObjectURL(blob);

        return this.objectURL;
    }
}
