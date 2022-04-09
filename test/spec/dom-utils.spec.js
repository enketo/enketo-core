import {
    getSiblingElements,
    getSiblingElementsAndSelf,
    getSiblingElement,
    getAncestors,
    closestAncestorUntil,
    getChildren,
    getChild,
    getXPath,
    hasNextSiblingElementSameName,
    hasSiblingElementSameName,
    hasPreviousSiblingElementSameName,
} from '../../src/js/dom-utils';

function getFragment(htmlStr) {
    return document.createRange().createContextualFragment(htmlStr);
}

describe('DOM utils', () => {
    describe('getSiblingElements', () => {
        const fragment = getFragment(`
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        `);

        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [getSiblingElements(a), [d, c, b]],
            [getSiblingElements(a, '.a'), [c, b]],
            [getSiblingElements(a, '.b'), [d]],
            [getSiblingElements(e), []],
            [getSiblingElements(e, '.b'), []],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.deep.equal(t[1]);
            });
        });
    });

    describe('getSiblingElementsAndSelf', () => {
        const fragment = getFragment(`
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        `);

        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [getSiblingElementsAndSelf(a), [d, c, b, a]],
            [getSiblingElementsAndSelf(a, '.a'), [c, b, a]],
            [getSiblingElementsAndSelf(a, '.b'), [d, a]],
            [getSiblingElementsAndSelf(e), [e]],
            [getSiblingElementsAndSelf(e, '.b'), [e]],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.deep.equal(t[1]);
            });
        });
    });

    describe('hasSiblingElement', () => {
        const fragment = getFragment(`
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        `);

        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [getSiblingElement(a), d],
            [getSiblingElement(a, '.a'), c],
            [getSiblingElement(a, '#a'), undefined],
            [getSiblingElement(a, '.b'), d],
            [getSiblingElement(d), c],
            [getSiblingElement(d, '#b'), b],
            [getSiblingElement(e), undefined],
            [getSiblingElement(e, '.b'), undefined],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.equal(t[1]);
            });
        });
    });

    describe('getChildren', () => {
        const fragment = getFragment(`
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        `);

        const root = fragment.querySelector('root');
        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [getChildren(e), [d, c, b, a]],
            [getChildren(e, '.a'), [c, b]],
            [getChildren(root), [e]],
            [getChildren(a), []],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.deep.equal(t[1]);
            });
        });
    });

    describe('getChild', () => {
        const fragment = getFragment(`
            <root>
                <div id="e">
                    <div id="d" class="or b"></div>
                    <div id="c" class="a something disabled"></div>
                    <div id="b" class="a"></div>
                    <div id="a" class="b"></div>
                </div>
            </root>
        `);

        const root = fragment.querySelector('root');
        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const a = fragment.querySelector('#a');

        [
            [getChild(e), d],
            [getChild(e, '.a'), c],
            [getChild(root), e],
            [getChild(a), undefined],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.equal(t[1]);
            });
        });
    });

    describe('getAncestors', () => {
        const fragment = getFragment(`
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
        `);

        const root = fragment.querySelector('root');
        const e = fragment.querySelector('#e');
        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [getAncestors(a, '.b', '.or'), [d]],
            [getAncestors(a, '.disabled', '.or'), [c]],
            [getAncestors(a, '.disabled', 'root'), [e, c]],
            [getAncestors(c, '.disabled'), [e]],
            [getAncestors(a, '.else', '.or'), []],
            [getAncestors(a, '.else'), [e]],
            [getAncestors(b, '.a', '.or'), [c]],
            [getAncestors(b, '.b', '.or'), [d]],
            [getAncestors(b, '.or', '.or'), [d]],
            [getAncestors(a), [root, e, d, c, b]],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.deep.equal(t[1]);
            });
        });
    });

    describe('closestAncestorUntil', () => {
        const fragment = getFragment(`
            <div id="e" class="disabled else">
                <div id="d" class="or b">
                    <div id="c" class="a something disabled">
                        <div id="b" class="a">
                            <div id="a" class="b"></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        const d = fragment.querySelector('#d');
        const c = fragment.querySelector('#c');
        const b = fragment.querySelector('#b');
        const a = fragment.querySelector('#a');

        [
            [closestAncestorUntil(a, '.b', '.or'), d],
            [closestAncestorUntil(a, '.disabled', '.or'), c],
            [closestAncestorUntil(a, '.else', '.or'), null],
            [closestAncestorUntil(b, '.a', '.or'), c],
            [closestAncestorUntil(b, '.b', '.or'), d],
            [closestAncestorUntil(b, '.or', '.or'), d],
            [closestAncestorUntil(c, '.disabled', '.or'), null],
        ].forEach((t) => {
            it('works', () => {
                expect(t[0]).to.equal(t[1]);
            });
        });
    });

    describe('getXPath', () => {
        const xmlStr = `
            <root>
                <path>
                    <to>
                        <node/>
                        <!-- some comment -->
                        <repeat>
                            <number/>
                        </repeat>
                        <repeat>
                            <!-- some comment -->
                            <number/>
                            <number/>
                            <!-- some comment -->
                        </repeat>
                    </to>
                </path>
            </root>`;
        const xml = new DOMParser().parseFromString(xmlStr, 'text/xml');

        it('returns /root/path/to/node without parameters', () => {
            const node = xml.querySelector('node');
            expect(getXPath(node)).to.equal('/root/path/to/node');
        });

        it('returns same /root/path/to/node if first parameter is null', () => {
            const node = xml.querySelector('node');
            expect(getXPath(node, null)).to.equal('/root/path/to/node');
        });

        it('returns same /root/path/to/node if first parameter is null and second parameter is true', () => {
            const node = xml.querySelector('node');
            expect(getXPath(node, null)).to.equal('/root/path/to/node');
        });

        it('returns path from context first node provided as parameter', () => {
            const node = xml.querySelector('node');
            expect(getXPath(node, 'root')).to.equal('/path/to/node');
        });

        it('returned path includes no positions if there are no siblings with the same name along the path', () => {
            const node = xml.querySelector('node');
            expect(getXPath(node, 'root', true)).to.equal('/path/to/node');
        });

        it('returned path includes positions when asked', () => {
            const node = xml.querySelectorAll('number')[1];
            expect(getXPath(node, 'root', true)).to.equal(
                '/path/to/repeat[2]/number'
            );
        });

        it('returned path includes position of first repeat if sibling repeat exists', () => {
            const node = xml.querySelector('number');
            expect(getXPath(node, 'root', true)).to.equal(
                '/path/to/repeat[1]/number'
            );
        });

        it('returned path includes positions when asked (multiple levels)', () => {
            const node = xml.querySelectorAll('number')[2];
            expect(getXPath(node, 'root', true)).to.equal(
                '/path/to/repeat[2]/number[2]'
            );
        });
    });

    describe('siblingElement functions', () => {
        const xmlStr = `
            <root>
                <path>
                    <to>
                        <node/>
                        <!-- some comment -->
                        <repeat>
                            <number />
                        </repeat>
                        <rogue/>
                        <!-- some comment -->
                        <repeat>
                            <number />
                        </repeat>
                        <!-- some comment -->
                        <rogue/>
                    </to>
                </path>
            </root>`;
        const xml = new DOMParser().parseFromString(xmlStr, 'text/xml');
        const repeats = xml.querySelectorAll('repeat');
        const node = xml.querySelector('node');

        describe('hasPreviousSiblingElementSameName', () => {
            [
                [repeats[0], false],
                [repeats[1], true],
                [node, false],
            ].forEach(([el, expected]) => {
                it('evaluates correctly', () => {
                    expect(hasPreviousSiblingElementSameName(el)).to.equal(
                        expected
                    );
                });
            });
        });

        describe('hasNextSiblingElementSameName', () => {
            [
                [repeats[0], true],
                [repeats[1], false],
                [node, false],
            ].forEach(([el, expected]) => {
                it('evaluates correctly', () => {
                    expect(hasNextSiblingElementSameName(el)).to.equal(
                        expected
                    );
                });
            });
        });

        describe('hasSiblingElementSameName', () => {
            [
                [repeats[0], true],
                [repeats[1], true],
                [node, false],
            ].forEach(([el, expected]) => {
                it('evaluates correctly', () => {
                    expect(hasSiblingElementSameName(el)).to.equal(expected);
                });
            });
        });
    });
});
