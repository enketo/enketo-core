// @ts-check

import { expect } from 'chai';
import {
    getMaxWidth,
    ResizableSignaturePad,
} from '../../src/widget/draw/ResizableSignaturePad';

// This is tested independently, in anticipation that it may be general enough
// to reuse elsewhere
describe('Determining element max width', () => {
    const maxWidthElement = document.createElement('div');

    beforeEach(() => {
        document.body.append(maxWidthElement);
    });

    afterEach(() => {
        maxWidthElement.remove();
    });

    maxWidthElement.style.maxWidth = '720px';

    it("gets the max width on an element's direct styles", () => {
        const maxWidth = getMaxWidth(maxWidthElement);

        expect(maxWidth).to.equal(720);
    });

    it('fails to get the max width for disconnected elements', () => {
        maxWidthElement.remove();

        const fn = () => getMaxWidth(maxWidthElement);

        expect(fn).to.throw();
    });

    it('gets the max width of a descendant element', () => {
        const outer = document.createElement('div');
        const inner = document.createElement('div');

        maxWidthElement.append(outer);
        outer.append(inner);

        const maxWidth = getMaxWidth(inner);

        expect(maxWidth).to.equal(720);
    });

    it('accounts for reduced space inside the ancestors', () => {
        const outer = document.createElement('div');
        const inner = document.createElement('div');

        maxWidthElement.append(outer);
        outer.append(inner);

        [maxWidthElement, outer].forEach((element) => {
            element.style.boxSizing = 'border-box';
            element.style.padding = '10px';
        });

        const maxWidth = getMaxWidth(inner);

        expect(maxWidth).to.equal(680);
    });
});

describe('Resizable extensions to the signature_pad library', () => {
    // Several of these tests depend on comparing actual bitmap binary data to
    // fixture images which were manually created in Chrome. Those tests will
    // fail in other browsers, due to very minor differences in rasterization.
    // For now, we'll skip this suite except in the main Chrome run.
    if (!navigator.userAgent.includes('HeadlessChrome')) {
        return;
    }

    const mutationObserver = new MutationObserver(() => {});

    const waitForNextAnimationFrame = async () => {
        await new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    };

    const waitForIdleDOM = async () => {
        await waitForNextAnimationFrame();

        do {
            // This could probably be accomplished with an async generator, but
            // the intent would be much less obvious
            // eslint-disable-next-line no-await-in-loop
            await waitForNextAnimationFrame();
        } while (mutationObserver.takeRecords().length > 0);
    };

    /**
     * @return {Promise<ImageBitmap | void>}
     */
    const loadPadImage = async () => {
        await waitForIdleDOM();

        const url = await pad.toObjectURL();

        if (url === '') {
            return;
        }

        const response = await fetch(url);
        const blob = await response.blob();

        return createImageBitmap(blob);
    };

    /**
     * @param {string} url
     */
    const getJSON = async (url) => {
        const response = await fetch(url);

        return response.json();
    };

    /**
     * @param {string} url
     */
    const getImageData = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        return new Int8Array(arrayBuffer);
    };

    /**
     * @param {ResizableSignaturePad} pad
     */
    const getPadRasterImageData = async (pad) => {
        const url = await pad.toObjectURL();

        return getImageData(url);
    };

    /**
     * @param {string} fileName
     */
    const fixture = (fileName) =>
        `${window.location.origin}/base/test/fixtures/ResizableSignaturePad/${fileName}`;

    /** @type {sinon.SinonSandbox} */
    let sandbox;

    /** @type {HTMLDivElement} */
    let container;

    /** @type {HTMLDivElement} */
    let inner;

    /** @type {HTMLCanvasElement} */
    let canvas;

    /** @type {ResizableSignaturePad} */
    let pad;

    /** @type {HTMLImageElement} */
    let image;

    /** @type {number} */
    let devicePixelRatio;

    /** @type {sinon.SinonSpy | null} */
    let onChange = null;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        devicePixelRatio = 1;
        sandbox.stub(window, 'devicePixelRatio').get(() => devicePixelRatio);

        container = document.createElement('div');
        inner = document.createElement('div');
        canvas = document.createElement('canvas');

        Object.assign(container.style, {
            position: 'relative',
            width: '720px',
        });

        Object.assign(inner.style, {
            position: 'relative',
            width: '100%',
            paddingTop: '75%',
        });

        Object.assign(canvas.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
        });

        document.body.append(container);
        container.append(inner);
        inner.append(canvas);

        await waitForIdleDOM();

        canvas.width = 1;
        canvas.height = 1;

        image = new Image();

        container.append(image);

        pad = new ResizableSignaturePad(canvas);

        onChange = null;

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
        });
    });

    afterEach(async () => {
        sandbox.restore();
        container.remove();

        if (onChange != null) {
            pad.removeEventListener('change', onChange);
        }

        await waitForIdleDOM();

        mutationObserver.disconnect();
        mutationObserver.takeRecords();
    });

    it('scales the displayed canvas on load', async () => {
        await waitForIdleDOM();

        expect(canvas.width).to.equal(720);
        expect(canvas.height).to.equal(540);
    });

    it('scales the displayed canvas when resized by its container', async () => {
        container.style.width = '500px';

        await waitForIdleDOM();

        expect(canvas.width).to.equal(500);
        expect(canvas.height).to.equal(375);
    });

    it('scales the displayed canvas with the current pixel ratio', async () => {
        devicePixelRatio = 2;

        await waitForIdleDOM();

        expect(canvas.width).to.equal(1440);
        expect(canvas.height).to.equal(1080);
    });

    it('does not scale below a pixel ratio of 1', async () => {
        devicePixelRatio = 0.5;

        await waitForIdleDOM();

        expect(canvas.width).to.equal(720);
        expect(canvas.height).to.equal(540);
    });

    it('sets a base image by URL', async () => {
        const url = fixture('720x540.png');

        await pad.setBaseImage(url);
        await waitForIdleDOM();

        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    /**
     * @param {string} url
     */
    const getFile = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();

        return new File([blob], 'file-name');
    };

    it('sets a base image by File', async () => {
        const url = fixture('720x540.png');
        const file = await getFile(url);

        await pad.setBaseImage(file);
        await waitForIdleDOM();

        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    it.skip('renders drawing data on a base image', async () => {
        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        const url = fixture('720x540-with-drawing.png');
        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    it('rasterizes the scaled image at the maximum display size', async () => {
        devicePixelRatio = 2;

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        container.style.width = '500px';

        await waitForIdleDOM();

        const { width, height } = (await loadPadImage()) ?? {};

        expect(width).to.equal(720);
        expect(height).to.equal(540);
    });

    const fixturesToDimensions = [
        {
            fileName: '400x400.png',
            constraint: 'height',
            dimensions: {
                width: 533,
                height: 400,
            },
        },
        {
            fileName: '1200x540.png',
            constraint: 'width',
            dimensions: {
                width: 1200,
                height: 900,
            },
        },
    ];

    fixturesToDimensions.forEach(({ fileName, constraint, dimensions }) => {
        it(`scales the rasterized image proportionally to fit the base image's ${constraint}`, async () => {
            devicePixelRatio = 2;

            const baseImageURL = fixture(fileName);

            await pad.setBaseImage(baseImageURL);
            await waitForIdleDOM();

            const { width, height } = (await loadPadImage()) ?? {};

            expect({ width, height }).to.deep.equal(dimensions);
        });
    });

    it.skip('renders drawing data at full size fidelity when the canvas has been resized by its container, then restored to its maximum size', async () => {
        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        container.style.width = '500px';

        await waitForIdleDOM();

        container.style.width = '720px';

        await waitForIdleDOM();

        const url = fixture('720x540-with-drawing.png');
        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    // The implementation details under test here are the same as with the test
    // above. This test was written first, but initially failed because the
    // internal drawing data was being stored internally at the canvas element's
    // current scale after a resize, causing minor inconsistencies (likely due
    // to float precision errors). The above test is also meaningful in terms of
    // describing the behavior, so both are kept despite total overlap of the
    // underlying behavior under test.
    it.skip('renders drawing data at full size fidelity when the canvas is currently resized by its container', async () => {
        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        container.style.width = '500px';

        await waitForIdleDOM();

        const url = fixture('720x540-with-drawing.png');
        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    it.skip('reverts the most recent stroke', async () => {
        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        pad.undoStroke();

        const url = fixture('720x540-after-undo.png');
        const expected = await getImageData(url);
        const actual = await getPadRasterImageData(pad);

        expect(actual).to.deep.equal(expected);
    });

    it('resets the base image and drawing', async () => {
        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        const drawingDataURL = fixture('drawing-data.json');
        const drawingData = await getJSON(drawingDataURL);

        sandbox.stub(pad, 'toData').callsFake(() => drawingData);
        pad.dispatchEvent(new CustomEvent('endStroke'));

        await waitForIdleDOM();

        pad.reset();

        const objectURL = await pad.toObjectURL();

        expect(objectURL).to.equal('');
    });

    it('dispatches a change event when the canvas becomes visible', async () => {
        onChange = sandbox.fake();
        pad.addEventListener('change', onChange);

        container.style.display = 'none';

        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        expect(onChange.callCount).to.equal(0);

        container.style.display = 'block';

        await waitForIdleDOM();

        expect(onChange.callCount).to.equal(1);
    });

    it('revokes previously created object URLs on change, to release the reference to their underlying `Blob`s', async () => {
        const initialBaseImageURL = fixture('400x400.png');

        await pad.setBaseImage(initialBaseImageURL);
        await waitForIdleDOM();

        const initialObjectURL = await pad.toObjectURL();

        const fetchInitialBlob = async () => {
            try {
                const response = await fetch(initialObjectURL);
                const blob = await response.blob();

                return blob;
            } catch {
                return null;
            }
        };

        let initialBlob = await fetchInitialBlob();

        expect(initialBlob).to.be.an.instanceOf(Blob);

        const baseImageURL = fixture('720x540.png');

        await pad.setBaseImage(baseImageURL);
        await waitForIdleDOM();

        initialBlob = await fetchInitialBlob();

        expect(initialBlob).to.equal(null);
    });
});
