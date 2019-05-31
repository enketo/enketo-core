import { closestAncestorUntil } from '../../src/js/dom-utils';

function getFragment( htmlStr ) {
    return document.createRange().createContextualFragment( htmlStr );
}

describe( 'DOM utils', () => {

    describe( 'closestAncestorUntil', () => {
        const fragment = getFragment( `
            <div id="e" class="disabled else">
                <div id="d" class="or b">
                    <div id="c" class="a something disabled">
                        <div id="b" class="a">
                            <div id="a" class="b"></div>
                        </div>
                    </div>
                </div> 
            </div>
        ` );

        const d = fragment.querySelector( '#d' );
        const c = fragment.querySelector( '#c' );
        const b = fragment.querySelector( '#b' );
        const a = fragment.querySelector( '#a' );

        [
            [ closestAncestorUntil( a, '.b', '.or' ), d ],
            [ closestAncestorUntil( a, '.disabled', '.or' ), c ],
            [ closestAncestorUntil( a, '.else', '.or' ), null ],
            [ closestAncestorUntil( b, '.a', '.or' ), c ],
            [ closestAncestorUntil( b, '.b', '.or' ), d ],
            [ closestAncestorUntil( b, '.or', '.or' ), d ],
            [ closestAncestorUntil( c, '.disabled', '.or' ), null ],
        ].forEach( t => {
            it( 'works', () => {
                expect( t[ 0 ] ).toEqual( t[ 1 ] );
            } );
        } );

    } );

} );
