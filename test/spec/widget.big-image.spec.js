import ImageViewer from '../../src/widget/big-image/image-viewer';
import { testBasicInstantiation, testStaticProperties } from '../helpers/test-widget';

const BIGSOURCE = 'https://enketo.org/big-image.png';
const SMALLSOURCE = 'https://enketo.org/small-image.png';
const FORM =
    `<label class="question">
        <a class="or-big-image" href="${BIGSOURCE}">
            <img lang="default" class="active" src="${SMALLSOURCE}" alt="image">
        </a>
        <input type="number" name="/data/node">
    </label>`;

testStaticProperties( ImageViewer );
testBasicInstantiation( ImageViewer, FORM );

describe( 'ImageViewer', () => {

    it( 'on widget click event does things', done => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( ImageViewer.selector );

        Promise.resolve()
            .then( () => new ImageViewer( control ) )
            .then( () => {
                const img = control.querySelector( 'img' );
                expect( img.src ).toEqual( SMALLSOURCE );
                control.click();
                expect( img.src ).toEqual( BIGSOURCE );
            } )
            .then( done, fail );
    } );

} );
