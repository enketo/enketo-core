import * as utils from '../../src/js/utils';

describe('Parsing expressions', () => {
    const t = [
        ['func(b,c)', '', []],
        ['func(b,c)', undefined, []],
        ['func(b,c)', null, []],
        ['func(b,c)', false, []],
        ['', 'func', []],
        [undefined, 'func', []],
        [null, 'func', []],
        [false, 'func', []],
        ['func()', 'func', [['func()', []]]],
        ['concat("version: ", version())', 'version', [['version()', []]]],
        ['func(  )', 'func', [['func(  )', ['']]]],
        ['func(b,c)', 'func', [['func(b,c)', ['b', 'c']]]],
        ['func( b ,c)', 'func', [['func( b ,c)', ['b', 'c']]]],
        [
            'func(b,func(c))',
            'func',
            [
                ['func(b,func(c))', ['b', 'func(c)']],
                ['func(c)', ['c']],
            ],
        ],
        [
            'func(b, func(func( c )))',
            'func',
            [
                ['func(b, func(func( c )))', ['b', 'func(func( c ))']],
                ['func(func( c ))', ['func( c )']],
                ['func( c )', ['c']],
            ],
        ],
        [
            'func(b,c(1+funca(4,7)))',
            'func',
            [['func(b,c(1+funca(4,7)))', ['b', 'c(1+funca(4,7))']]],
        ],
        [
            'func(a,b) + 5 + func(b,c)',
            'func',
            [
                ['func(a,b)', ['a', 'b']],
                ['func(b,c)', ['b', 'c']],
            ],
        ],
        [
            '"blabla" + indexed-repeat(/path/to/a, /path/to, position(..) - 1) + "what"',
            'indexed-repeat',
            [
                [
                    'indexed-repeat(/path/to/a, /path/to, position(..) - 1)',
                    ['/path/to/a', '/path/to', 'position(..) - 1'],
                ],
            ],
        ],
    ];

    function test(expr, func, expected) {
        it(`extracts the calls to ${func} and their parameters as a string from ${expr}`, () => {
            const result = utils.parseFunctionFromExpression(expr, func);
            expect(result).to.deep.equal(expected);
        });
    }

    for (let i = 0; i < t.length; i++) {
        test(t[i][0], t[i][1], t[i][2]);
    }
});

describe('return postfixed filenames', () => {
    [
        ['myname', '-mypostfix', 'myname-mypostfix'],
        ['myname.jpg', '-mypostfix', 'myname-mypostfix.jpg'],
        ['myname.dot.jpg', '-mypostfix', 'myname.dot-mypostfix.jpg'],
        ['myname.000', '-mypostfix', 'myname-mypostfix.000'],
        [undefined, 'mypostfix', ''],
        [null, 'mypostfix', ''],
        [false, 'mypostfix', ''],
        ['myname', undefined, 'myname'],
        ['myname', null, 'myname'],
        ['myname', false, 'myname'],
    ].forEach(([name, postfix, expected]) => {
        it(`returns the filename ${expected} from ${name} and ${postfix}`, () => {
            const file = new Blob(['a'], {
                type: 'text',
            });
            file.name = name;

            expect(utils.getFilename(file, postfix)).to.deep.equal(expected);
        });
    });
});
