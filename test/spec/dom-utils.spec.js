import { getSiblingElements, getSiblingElementsAndSelf, getAncestors, closestAncestorUntil, getChildren, getXPath } from '../../src/js/dom-utils';

function getFragment( htmlStr ) {
    return document.createRange().createContextualFragment( htmlStr );
}

describe( 'DOM utils', () => {

    describe( 'getSiblingElements', () => {
        const fragment = getFragment( `
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        ` );

        const e = fragment.querySelector( '#e' );
        const d = fragment.querySelector( '#d' );
        const c = fragment.querySelector( '#c' );
        const b = fragment.querySelector( '#b' );
        const a = fragment.querySelector( '#a' );

        [
            [ getSiblingElements( a ), [ d, c, b ] ],
            [ getSiblingElements( a, '.a' ), [ c, b ] ],
            [ getSiblingElements( a, '.b' ), [ d ] ],
            [ getSiblingElements( e ), [] ],
            [ getSiblingElements( e, '.b' ), [] ]
        ].forEach( t => {
            it( 'works', () => {
                expect( t[ 0 ] ).toEqual( t[ 1 ] );
            } );
        } );
    } );

    describe( 'getSiblingElementsAndSelf', () => {
        const fragment = getFragment( `
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        ` );

        const e = fragment.querySelector( '#e' );
        const d = fragment.querySelector( '#d' );
        const c = fragment.querySelector( '#c' );
        const b = fragment.querySelector( '#b' );
        const a = fragment.querySelector( '#a' );

        [
            [ getSiblingElementsAndSelf( a ), [ d, c, b, a ] ],
            [ getSiblingElementsAndSelf( a, '.a' ), [ c, b, a ] ],
            [ getSiblingElementsAndSelf( a, '.b' ), [ d, a ] ],
            [ getSiblingElementsAndSelf( e ), [ e ] ],
            [ getSiblingElementsAndSelf( e, '.b' ), [ e ] ]
        ].forEach( t => {
            it( 'works', () => {
                expect( t[ 0 ] ).toEqual( t[ 1 ] );
            } );
        } );
    } );

    describe( 'getChildren', () => {
        const fragment = getFragment( `
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        ` );

        const root = fragment.querySelector( 'root' );
        const e = fragment.querySelector( '#e' );
        const d = fragment.querySelector( '#d' );
        const c = fragment.querySelector( '#c' );
        const b = fragment.querySelector( '#b' );
        const a = fragment.querySelector( '#a' );

        [
            [ getChildren( e ), [ d, c, b, a ] ],
            [ getChildren( e, '.a' ), [ c, b ] ],
            [ getChildren( root ), [ e ] ],
            [ getChildren( a ), [] ]
        ].forEach( t => {
            it( 'works', () => {
                expect( t[ 0 ] ).toEqual( t[ 1 ] );
            } );
        } );
    } );

    describe( 'getAncestors', () => {
        const fragment = getFragment( `
            <root>
                <div id="e" class="disabled else">
                    <div id="d" class="or b">
                        <div id="c" class="a something disabled">
                            <div id="b" class="a">
                                <div id="a" class="b"></div>
                            </div>
                        </div>
                    </div> 
                </div>
            </root>
        ` );

        const root = fragment.querySelector( 'root' );
        const e = fragment.querySelector( '#e' );
        const d = fragment.querySelector( '#d' );
        const c = fragment.querySelector( '#c' );
        const b = fragment.querySelector( '#b' );
        const a = fragment.querySelector( '#a' );

        [
            [ getAncestors( a, '.b', '.or' ), [ d ] ],
            [ getAncestors( a, '.disabled', '.or' ), [ c ] ],
            [ getAncestors( a, '.disabled', 'root' ), [ e, c ] ],
            [ getAncestors( c, '.disabled' ), [ e ] ],
            [ getAncestors( a, '.else', '.or' ), [] ],
            [ getAncestors( a, '.else' ), [ e ] ],
            [ getAncestors( b, '.a', '.or' ), [ c ] ],
            [ getAncestors( b, '.b', '.or' ), [ d ] ],
            [ getAncestors( b, '.or', '.or' ), [ d ] ],
            [ getAncestors( a ), [ root, e, d, c, b ] ]

        ].forEach( t => {
            it( 'works', () => {
                expect( t[ 0 ] ).toEqual( t[ 1 ] );
            } );
        } );

    } );


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

    describe( 'getXPath', () => {
        const xmlStr = `
            <root>
                <path>
                    <to>
                        <node/>
                        <repeat>
                            <number/>
                        </repeat>
                        <repeat>
                            <number/>
                            <number/>
                        </repeat>
                    </to>
                </path>
            </root>`;
        const xml = new DOMParser().parseFromString( xmlStr, 'text/xml' );

        it( 'returns /root/path/to/node without parameters', () => {
            const node = xml.querySelector( 'node' );
            expect( getXPath( node ) ).toEqual( '/root/path/to/node' );
        } );

        it( 'returns same /root/path/to/node if first parameter is null', () => {
            const node = xml.querySelector( 'node' );
            expect( getXPath( node, null ) ).toEqual( '/root/path/to/node' );
        } );

        it( 'returns path from context first node provided as parameter', () => {
            const node = xml.querySelector( 'node' );
            expect( getXPath( node, 'root' ) ).toEqual( '/path/to/node' );
        } );
        it( 'returned path includes no positions if there are no siblings with the same name along the path', () => {
            const node = xml.querySelector( 'node' );
            expect( getXPath( node, 'root', true ) ).toEqual( '/path/to/node' );
        } );
        it( 'returned path includes positions when asked', () => {
            const node = xml.querySelectorAll( 'number' )[ 1 ];
            expect( getXPath( node, 'root', true ) ).toEqual( '/path/to/repeat[2]/number' );
        } );
        it( 'returned path includes positions when asked (multiple levels)', () => {
            const node = xml.querySelectorAll( 'number' )[ 2 ];
            expect( getXPath( node, 'root', true ) ).toEqual( '/path/to/repeat[2]/number[2]' );
        } );
    } );



} );
