import { FormModel as Model } from '../../src/js/form-model';
import events from '../../src/js/event';
import forms from '../mock/forms';
import config from '../../config';

const getModel = filename => {
    const model = new Model( forms[ filename ].xml_model );
    model.init();

    return model;
};

// suppress particular console.warn messages
console.__warn = console.warn;
console.warn = ( msg ) => {
    const surpressedMessages = [
        'Model has no instanceID element'
    ];
    if ( surpressedMessages.includes( msg ) ){
        return;
    } else {
        console.__warn( msg );
    }
};

// I don't remember why this functionality exists
describe( 'Primary instance node values', () => {
    const model = new Model( '<model><instance><data><nodeA> 2  </nodeA><meta><instanceID/></meta></data></instance></model>' );
    model.init();
    it( 'are trimmed during initialization', () => {
        expect( model.getStr() ).toContain( '<nodeA>2</nodeA>' );
    } );
} );

describe( 'Instantiating a model', () => {
    const modelStr = '<model><instance><data id="data"><nodeA>2</nodeA></data></instance>' +
        '<instance id="countries"><root><item><country>NL</country></item></root></instance></model>';

    it( 'without options, it includes all instances', () => {
        const model = new Model( modelStr );
        model.init();
        expect( model.xml.querySelector( 'model > instance#countries' ) ).not.toBeNull();
        expect( model.xml.querySelector( 'model > instance#countries > root > item > country' ).textContent ).toEqual( 'NL' );
    } );

    it( 'with option.full = true, it includes all instances', () => {
        const model = new Model( modelStr, {
            full: true
        } );
        model.init();
        expect( model.xml.querySelector( 'model > instance#countries' ) ).not.toBeNull();
        expect( model.xml.querySelector( 'model > instance#countries > root > item > country' ).textContent ).toEqual( 'NL' );
    } );

    it( 'with options.full = false, strips the secondary instances', () => {
        const model = new Model( modelStr, {
            full: false
        } );
        model.init();
        expect( model.xml.querySelector( 'model > instance#countries' ) ).toBeNull();
    } );

    it( 'without an instanceID node, returns an error', () => {
        const result = new Model( '<data></data>' ).init();

        expect( result.length ).toEqual( 1 );
        expect( /Missing\sinstanceID/.test( result[ 0 ] ) ).toEqual( true );
    } );
} );


describe( 'Data node getter', () => {
    let i;

    const t = [
        [ '', null, null, 20 ],
        [ '', null, {},
            20
        ],
        //["/", null, {}, 9], //issue with xfind, not important
        [ false, null, {},
            20
        ],
        [ null, null, {},
            20
        ],
        [ null, null, { noEmpty: true }, 10 ], //instanceID is populated by model
        //[ 1 ],
        [ '/thedata/nodeA', 1, null, 0 ],
        [ '/thedata/nodeA', null, { noEmpty: true }, 0 ], //"int"
        [ '/thedata/nodeA', null, { onlyleaf: true }, 1 ],
        [ '/thedata/repeatGroup', null, null, 3 ],

        [ '//nodeC', null, null, 3 ],
        [ '/thedata/repeatGroup/nodeC', null, null, 3 ],
        [ '/thedata/repeatGroup/nodeC', 2, null, 1 ],
        [ '/thedata/repeatGroup/nodeC', null, { noEmpty: true }, 2 ],
        [ '/thedata/repeatGroup/nodeC', null, { onlyleaf: true }, 3 ]
    ];

    const model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><thedata id="thedata"><nodeA/><nodeB>b</nodeB>' +
        '<repeatGroup jr:template=""><nodeC>cdefault</nodeC></repeatGroup><repeatGroup><nodeC/></repeatGroup>' +
        '<repeatGroup><nodeC>c2</nodeC></repeatGroup>' +
        '<repeatGroup><nodeC>c3</nodeC></repeatGroup>' +
        '<somenodes><A>one</A><B>one</B><C>one</C></somenodes><someweights><w1>1</w1><w2>3</w2><w.3>5</w.3></someweights><nodeF/>' +
        '<meta><instanceID/></meta></thedata></instance></model>' );

    model.init();

    function test( node ) {
        it( `obtains nodes (selector: ${node.selector}, index: ${node.index}, filter: ${JSON.stringify( node.filter )})`, () => {
            expect( model.node( node.selector, node.index, node.filter ).getElements().length ).toEqual( node.result );
        } );
    }
    for ( i = 0; i < t.length; i++ ) {
        test( {
            selector: t[ i ][ 0 ],
            index: t[ i ][ 1 ],
            filter: t[ i ][ 2 ],
            result: t[ i ][ 3 ]
        } );
    }
} );

describe( 'Data node (&) value getter', () => {
    const data = getModel( 'thedata.xml' ); //dataStr1);

    it( 'returns an array of one node value', () => {
        expect( data.node( '/thedata/nodeB' ).getVal() ).toEqual( 'b' );
    } );

    it( 'returns the first node value of multiple nodes', () => {
        expect( data.node( '/thedata/repeatGroup/nodeC' ).getVal() ).toEqual( '' );
    } );

    it( 'returns null', () => {
        expect( data.node( '/thedata/nodeX' ).getVal() ).toEqual( undefined );
    } );

    it( 'obtains a node value of a node with a . in the name', () => {
        expect( data.node( '/thedata/someweights/w.3' ).getVal() ).toEqual( '5' );
    } );
} );

describe( 'Data node XML data type', () => {
    let i;
    const t = [
        [ 'val1', null, true ],
        [ 'val3', 'somewrongtype', true ], //default type is string

        [ '4', 'double', true ], //double is a non-existing xml data type so turned into string
        [ 5, 'double', true, '5' ],

        [ 'val2', 'string', true ],
        [
            [ 'a', 'b', 'c' ], 'string', true, 'a b c'
        ],
        [
            [ 'd', 'e', 'f', '' ], 'string', true, 'd e f '
        ],
        [ 'val12', 'string', true ],
        [ '14', 'string', true ],
        [ 1, 'string', true, '1' ],

        [ 'val4', 'int', false, '' ],
        [ '2', 'int', true ],
        [ 3, 'int', true, '3' ],
        [ '2.', 'int', false, '2' ],
        [ '2.66', 'int', false, '2' ],
        [ '-2.66', 'int', false, '-2' ],
        [ '-2.2', 'int', false, '-2' ],
        [ '2.0', 'int', false, '2' ],
        [ 'NaN', 'int', false, '' ],
        [ 'Infinity', 'int', false, '' ],
        [ '-Infinity', 'int', false, '' ],

        [ 'val11', 'decimal', false, '' ],
        [ '2', 'decimal', true ],
        [ '2.22', 'decimal', true ],
        [ 'NaN', 'decimal', false, '' ],
        [ 'Infinity', 'decimal', false, '' ],
        [ '-Infinity', 'decimal', false, '' ],

        [ 'val5565ghgyuyuy', 'date', false, '' ], //Chrome turns val5 into a valid date...
        [ '2012-01-01', 'date', true ],
        [ '2012-11-31', 'date', false, '' ],
        // The tests below are dependent on OS time zone of test machine
        [ 324, 'date', false, '1970-11-20' ],

        [ 'val5565ghgyuyua', 'datetime', false, '' ], //Chrome turns val10 into a valid date..
        [ '2012-01-01T00:00:00-06', 'datetime', false, '2012-01-01T00:00:00-06:00' ],
        [ '2012-01-01T00:00:00-06:00', 'datetime', true ],
        [ '2012-01-01T00:00:00.123-06:00', 'datetime', true, '2012-01-01T00:00:00.123-06:00' ],
        [ '2012-12-32T00:00:00-06:00', 'datetime', false, '' ],
        [ '2012-12-31T23:59:59-06', 'datetime', false, '2012-12-31T23:59:59-06:00' ],
        [ '2012-12-31T23:59:59-06:30', 'datetime', true ],
        [ '2012-01-01T30:00:00-06', 'datetime', false, '' ],
        // The tests below are dependent on OS time zone of test machine
        [ '2012-12-31T23:59:59Z', 'datetime', false, '2012-12-31T23:59:59+00:00' ],
        [ 324, 'datetime', false, '1970-11-20T17:00:00.000-07:00' ],
        [ '2013-05-31T07:00-02', 'datetime', false, '2013-05-31T07:00:00-02:00' ],

        [ 'a', 'time', false, '' ],
        [ 'aa:bb', 'time', false, '' ],
        [ '0:0', 'time', false, '00:00:00.000-07:00' ],
        [ '00:00:00+03', 'time', false, '00:00:00.000+03:00' ],
        [ '00:00:00.000+03', 'time', false, '00:00:00.000+03:00' ],
        [ '00:00', 'time', false, '00:00:00.000-07:00' ],
        [ '23:59', 'time', false, '23:59:00.000-07:00' ],
        [ '23:59:59', 'time', false, '23:59:59.000-07:00' ],
        [ '23:60:59.000-06:00', 'time', false, '' ],
        [ '24:00', 'time', false, '' ],
        [ '00:60', 'time', false, '' ],
        [ '01:01:01.abcdefg', 'time', false, '' ],
        [ '00:00:60', 'time', false, '' ],
        [ '-01:00', 'time', false, '' ],
        [ '00:-01', 'time', false, '' ],
        //[ '00:00:-01', 'time', false, '' ],
        [ '13:17:00.000-07:00', 'time', true ],
        [ '01:02:03.123+04:00', 'time', true ],

        [ 'val2', 'barcode', true ],

        [ '0 0 0 0', 'geopoint', true ],
        [ '10 10', 'geopoint', true ],
        [ '10 10 10', 'geopoint', true ],
        [ '-90 -180', 'geopoint', true ],
        [ '90 180', 'geopoint', true ],
        [ '-91 -180', 'geopoint', false ],
        [ '91 180', 'geopoint', false ],
        [ 'a -180', 'geopoint', false ],
        [ '0 a', 'geopoint', false ],
        [ '0', 'geopoint', false ],
        [ '0 0 a', 'geopoint', false ],
        [ '0 0 0 a', 'geopoint', false ],

    ];

    function typeConversionTest( n ) {
        it( `is converted for XML type: ${n.type} with value: ${n.value}`, () => {
            const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', 0, n.filter );
            const expected = typeof n.converted !== 'undefined' ? n.converted : n.value;
            node.setVal( n.value, n.type );
            expect( node.getVal() ).toEqual( expected );
        } );
    }

    function typeValidationTest( n ) {
        it( `is (in)validated for XML type: ${n.type} with value:${n.value}`, done => {
            const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', 0, n.filter );
            // set the value without conversion (as string)
            node.setVal( n.value );
            node.validateConstraintAndType( null, n.type )
                .then( result => {
                    expect( result ).toEqual( n.valid );
                } )
                .then( done )
                .catch( done );
        } );
    }

    for ( i = 0; i < t.length; i++ ) {
        typeConversionTest( {
            value: t[ i ][ 0 ],
            type: t[ i ][ 1 ],
            valid: t[ i ][ 2 ],
            converted: t[ i ][ 3 ]
        } );

        typeValidationTest( {
            value: t[ i ][ 0 ],
            type: t[ i ][ 1 ],
            valid: t[ i ][ 2 ]
        } );
    }

    it( 'returns a null result for a non-existing node', () => {
        const data = getModel( 'thedata.xml' );
        expect( data.node( '/thedata/nodeA', 1, null ).setVal( 'val13', 'string' ) ).toEqual( null );
    } );

    it( 'returns a null result when attempting to set the value of multiple nodes', () => {
        const data = getModel( 'thedata.xml' );
        expect( data.node( '/thedata/repeatGroup/nodeC', null, null ).setVal( 'val' ) ).toEqual( null );
    } );

    it( 'sets a non-empty value to empty', done => {
        const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
        node.setVal( 'value', 'string' );
        node.setVal( '' );
        node.validateConstraintAndType( null, 'string' )
            .then( passed => {
                expect( passed ).toBe( true );
            } )
            .then( done )
            .catch( done );
    } );

    it( 'adds a file attribute to data nodes with a value and with xml-type: binary', () => {
        const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
        expect( node.getElement().getAttribute( 'type' ) ).toBe( null );
        node.setVal( 'this.jpg', 'binary' );
        expect( node.getElement().getAttribute( 'type' ) ).toBe( 'file' );
    } );

    it( 'removes a file attribute from EMPTY data nodes with xml-type: binary', () => {
        const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
        node.setVal( 'this.jpg', 'binary' );
        expect( node.getElement().getAttribute( 'type' ) ).toBe( 'file' );
        node.setVal( '', 'binary' );
        expect( node.getElement().getAttribute( 'type' ) ).toBe( null );
    } );

    it( 'does not trim a string value', () => {
        const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
        const value = ' a  ';
        node.setVal( value, 'string' );
        expect( node.getVal() ).toEqual( value );
    } );

    describe( 'does convert whitespace-only values', () => {
        const node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );

        function whiteSpaceTest( whiteSpaceValue ) {
            it( 'to ""', () => {
                // first prime node a with some non-whitespace value
                node.setVal( 'aa', 'string' );
                expect( node.getVal() ).toEqual( 'aa' );
                node.setVal( whiteSpaceValue, 'string' );
                expect( node.getVal() ).toEqual( '' );
            } );
        }

        [
            '    ',
            '\t',
            '\n',
            '  \t\n\r'
        ].forEach( whiteSpaceTest );
    } );

} );

describe( 'dataupdate event, is fired on model.$events and includes', () => {
    it( 'object with repeatPath and repeatIndex for a node inside a repeatSeries of more than 1 instance', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><b><c/></b><b><c/></b><meta><instanceID/></meta></a></instance></model>'
        } );
        const eventObjects = [];
        model.events.addEventListener( 'dataupdate', event => {
            eventObjects.push( event.detail );
        } );
        model.init();
        model.node( '/a/b/c', 1 ).setVal( 'boo' );
        // the first event is for /meta/instanceID
        expect( eventObjects.length ).toEqual( 2 );
        expect( eventObjects[ 1 ].repeatPath ).toEqual( '/a/b' );
        expect( eventObjects[ 1 ].repeatIndex ).toEqual( 1 );
        expect( eventObjects[ 1 ].nodes ).toEqual( [ 'c' ] );
    } );
} );

describe( 'Data node remover', () => {
    it( 'has removed a data node', () => {
        const data = getModel( 'thedata.xml' ),
            node = data.node( '/thedata/nodeA' );

        expect( node.getElements().length ).toEqual( 1 );

        node.remove();
        expect( node.getElements().length ).toEqual( 0 );
        expect( data.node( '/thedata/nodeA' ).getElements().length ).toEqual( 0 );
    } );

    it( 'can remove nodes with a . in the nodeName', () => {
        const model = new Model( '<model><instance><data><F27./><meta><instanceID/></meta></data></instance></model>' );
        const path = '/data/F27.';
        let node;

        model.init();
        node = model.node( path );

        expect( node.getElements().length ).toEqual( 1 );
        node.remove();
        expect( model.node( path ).getElements().length ).toEqual( 0 );
    } );
} );

describe( 'DeprecatedID value getter', () => {
    it( 'returns "" if deprecatedID node does not exist', () => {
        const model = new Model( '<model><instance><data><meta><instanceID/></meta></data></instance></model>' );
        model.init();
        expect( model.deprecatedID ).toEqual( '' );
    } );
    it( 'returns value of deprecatedID node', () => {
        const model = new Model( '<model><instance><data><meta><instanceID/><deprecatedID>a</deprecatedID></meta></data></instance></model>' );
        model.init();
        expect( model.deprecatedID ).toEqual( 'a' );
    } );
} );

describe( 'getRepeatSeries', () => {
    // Note the strategic placements of whitespace '\n'
    const model = new Model( `
        <model>
            <instance>
                <a>
                    <r>
                        <b/>
                        <nR/>
                        <nR/>
                    </r>
                    <r>
                        <b/>
                        <nR/>
                        <nR/>
                        <nR/>
                    </r>
                    <meta>
                        <instanceID/>
                    </meta>
                </a>
            </instance>
        </model>` );
    model.init();
    model.extractFakeTemplates( [ '/a/r', '/a/r/nR' ] );
    it( 'returns the elements in one series of repeats', () => {
        expect( model.getRepeatSeries( '/a/r', 0 ).length ).toEqual( 2 );
        expect( model.getRepeatSeries( '/a/r/nR', 0 ).length ).toEqual( 2 );
        expect( model.getRepeatSeries( '/a/r/nR', 1 ).length ).toEqual( 3 );
    } );
} );

describe( 'XPath Evaluator (see github.com/enketo/enketo-xpathjs for comprehensive tests!)', () => {
    let i;

    const t = [
        [ '/thedata/nodeB', 'string', null, 0, 'b' ],
        [ '../nodeB', 'string', '/thedata/nodeA', 0, 'b' ],
        [ '/thedata/nodeB', 'boolean', null, 0, true ],
        [ '/thedata/notexist', 'boolean', null, 0, false ],
        [ '/thedata/repeatGroup[2]/nodeC', 'string', null, 0, 'c2' ],
        [ '/thedata/repeatGroup[position()=3]/nodeC', 'string', null, 0, 'c3' ],
        [ 'coalesce(/thedata/nodeA, /thedata/nodeB)', 'string', null, 0, 'b' ],
        [ 'coalesce(/thedata/nodeB, /thedata/nodeA)', 'string', null, 0, 'b' ],
        [ 'weighted-checklist(3, 3, /thedata/somenodes/A, /thedata/someweights/w2)', 'boolean', null, 0, true ],
        [ 'weighted-checklist(9, 9, /thedata/somenodes/*, /thedata/someweights/*)', 'boolean', null, 0, true ],
        [ '"2012-07-24" > "2012-07-23"', 'boolean', null, 0, true ],
    ];

    const data = getModel( 'thedata.xml' );

    function test( expr, resultType, contextSelector, index, result ) {
        it( `evaluates XPath: ${expr}`, () => {
            expect( data.evaluate( expr, resultType, contextSelector, index ) ).toEqual( result );
        } );
    }

    for ( i = 0; i < t.length; i++ ) {
        test( String( t[ i ][ 0 ] ), t[ i ][ 1 ], t[ i ][ 2 ], t[ i ][ 3 ], t[ i ][ 4 ] );
    }

    // this tests the makeBugCompliant() workaround that injects a position into an absolute path
    // for the issue described here: https://bitbucket.org/javarosa/javarosa/wiki/XFormDeviations
    it( 'evaluates a repaired absolute XPath inside a repeat (makeBugCompliant())', () => {
        expect( data.evaluate( '/thedata/repeatGroup/nodeC', 'string', '/thedata/repeatGroup/nodeC', 2 ) ).toEqual( 'c3' );
    } );

    it( 'is able to address a secondary instance by id with the instance(id)/path/to/node syntax', () => {
        const dataO = getModel( 'new_cascading_selections.xml' );
        expect( dataO.evaluate( 'instance("cities")/root/item/name', 'string' ) ).toEqual( 'ams' );
        expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4]/name', 'string' ) ).toEqual( 'den' );
        expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4 and 1<2]', 'nodes' ).length ).toEqual( 3 );
        expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4 and name=/new_cascading_selections/group4/city4]', 'nodes' ).length ).toEqual( 1 );
    } );
} );

// This test makes sure that whatever date strings are returned by the XPath evaluator can be dealt with by the form engine
describe( 'dates returned by the XPath evaluator ', () => {
    const model = new Model( '<model><instance><data><meta><instanceID/></meta></data></instance></model>' );
    model.init();
    [
        [ 'date("2018-01-01")', '2018-01-01', 'date' ],
        [ 'date("2018-01-01")', '2018-01-01T00:00:00.000-07:00', 'datetime' ],
        [ 'date(decimal-date-time( "2018-01-01" ) + 14)', '2018-01-15', 'date' ],
        // For some reason, when running this with karma,
        // there is 28.8 second difference both in headless and browser. This difference does not occur when the app runs in the browser outside of karma.
        //[ 'date(decimal-date-time( "2018-01-01" ) + 14)', '2018-01-15T00:00:00.000-07:00', 'datetime' ],
        [ 'date("2018-01-01"  + 14)', '2018-01-15', 'date' ],
        // Fails in Travis but passes locally:
        //[ 'date("2018-01-01" + 14)', '2018-01-15T00:00:00.000-07:00', 'datetime' ],
        [ 'date("2018-10-35")', '', 'date' ]
    ].forEach( test => {
        it( `are recognized and converted, if necessary by the type convertor: ${test[ 0 ]}`, () => {
            expect( model.types[ test[ 2 ] ].convert( model.evaluate( test[ 0 ], 'string' ) ) ).toEqual( test[ 1 ] );
        } );
    } );

} );

describe( 'functionality to obtain string of the primary XML instance for storage or uploads)', () => {
    it( 'returns primary instance without templates - A', () => {
        const model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><data><group jr:template=""><a/></group></data></instance></model>' );
        model.init();
        expect( model.getStr() ).toEqual( '<data></data>' );
    } );

    it( 'returns primary instance without templates - B', () => {
        const model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><data><group    jr:template=""><a/></group></data></instance></model>' );
        model.init();
        expect( model.getStr() ).toEqual( '<data></data>' );
    } );

    it( 'returns primary instance and leaves namespaces intact', () => {
        const model = new Model( '<model><instance><data xmlns="https://some.namespace.com/"><a/></data></instance></model>' );
        model.init();
        expect( model.getStr() ).toEqual( '<data xmlns="https://some.namespace.com/"><a/></data>' );
    } );
} );

describe( 'converting absolute paths', () => {
    [
        // to be converted
        [ '/path/to/node', '/model/instance[1]/path/to/node' ],
        [ '/_member_/new/*', '/model/instance[1]/_member_/new/*' ],
        [ '/_member-/new/*', '/model/instance[1]/_member-/new/*' ],
        [ '/models/to/node', '/model/instance[1]/models/to/node' ],
        [ '/*/meta/instanceID', '/model/instance[1]/*/meta/instanceID' ],
        [ '/outputs_in_repeats/rep/name', '/model/instance[1]/outputs_in_repeats/rep/name' ],
        [ '/path/to/node[/path/to/node]', '/model/instance[1]/path/to/node[/model/instance[1]/path/to/node]' ],
        [ '/path/to/node[ /path/to/node ]', '/model/instance[1]/path/to/node[ /model/instance[1]/path/to/node ]' ],
        [ 'concat(/output_in_repeats/to/node, "2")', 'concat(/model/instance[1]/output_in_repeats/to/node, "2")' ],
        [ 'concat(/path/to/node, "2")', 'concat(/model/instance[1]/path/to/node, "2")' ],
        [ 'concat( /path/to/node, "2" )', 'concat( /model/instance[1]/path/to/node, "2" )' ],
        [ 'join(\' \', if( /r/a > 0, \'a\', \'-\'), if( /r/o > 0, \'b\', \'\'))',
            'join(\' \', if( /model/instance[1]/r/a > 0, \'a\', \'-\'), if( /model/instance[1]/r/o > 0, \'b\', \'\'))'
        ],
        [ 'join(\' \', if( /r/a > 0, \'a\', \'\'), if( /r/o > 0, \'b\', \'\'))',
            // note the 3rd arg of the first if() is emtpy string! https://github.com/kobotoolbox/enketo-express/issues/559
            'join(\' \', if( /model/instance[1]/r/a > 0, \'a\', \'\'), if( /model/instance[1]/r/o > 0, \'b\', \'\'))'
        ],


        // to leave unchanged
        [ 'path/to/node' ],
        [ '"path/to/node"' ],
        [ '\'path/to/node\'' ],
        [ 'concat(path/to/node, "2")' ],
        [ '../path/to/node' + '../node' ],
        [ '/model/path/to/node' ],
        [ 'concat("/", "path/to/node")' ],
        [ 'concat(\'/path/to/node\')' ],
        [ 'concat("a", "[/path/to/node]")' ],
        [ 'concat("\'", "/path/to/node", "\'")' ],
        [ '""', '""' ],
        [ '\'\'', '\'\'' ],
        [ '', '' ]

    ].forEach( test => {
        it( 'converts correctly when the model and instance node are included in the model', () => {
            const model = new Model( '<model><instance><root><meta><instanceID/></meta></root></instance></model>' );
            const expected = test[ 1 ] || test[ 0 ];
            model.init();
            expect( model.shiftRoot( test[ 0 ] ) ).toEqual( expected );
        } );
        it( 'does nothing if model and instance node are absent in the model', () => {
            const model = new Model( '<data><nodeA/><meta><instanceID/></meta></data>' );
            expect( model.shiftRoot( test[ 0 ] ) ).toEqual( test[ 0 ] );
        } );
    } );
} );

describe( 'converting instance("id") to absolute paths', () => {
    [
        [ 'instance("a")/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
        [ 'instance("a.-_")/path/to/node', '/model/instance[@id="a.-_"]/path/to/node' ],
        [ 'instance( "a")/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
        [ 'instance( "a"   )/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
        [ 'instance(\'a\')/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
        [ 'instance( \'a\')/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
        [ 'instance( \'a\'   )/path/to/node', '/model/instance[@id="a"]/path/to/node' ],
    ].forEach( test => {
        it( 'happens correctly', () => {
            const model = new Model( '<model><instance><root/></instance><instance id="a"/><instance id="a.-_"/></model>' );
            const expected = test[ 1 ];
            model.init();
            expect( model.replaceInstanceFn( test[ 0 ] ) ).toEqual( expected );
        } );
    } );
} );

describe( 'converting expressions with current() for context /data/node', () => {
    const context = '/data/node';

    // Note: these test include current()/node paths that may not have a use case in ODK XForms
    [
        [ 'instance("a")/path/to/node[filter = current()/some/nodeA]', 'instance("a")/path/to/node[filter = /data/node/some/nodeA]' ],
        [ 'instance("a")/path/to/node[filter = current()/.]', 'instance("a")/path/to/node[filter = /data/node/.]' ],
        [ 'instance("a")/path/to/node[filter = current()/../some/node]', 'instance("a")/path/to/node[filter = /data/node/../some/node]' ],
        [ 'instance("a")/path/to/node[animaltypes = current()/../animaltype and groupanimals = current()/../groupanimal ]',
            'instance("a")/path/to/node[animaltypes = /data/node/../animaltype and groupanimals = /data/node/../groupanimal ]'
        ],
        [ 'instance("a")/path/to/node[filtera = current()/../some/node and filterb = current()/../some/node and filterc = current()/a and filterd = current()/a]',
            'instance("a")/path/to/node[filtera = /data/node/../some/node and filterb = /data/node/../some/node and filterc = /data/node/a and filterd = /data/node/a]'
        ],
        [ 'instance("a")/root/item[name = current()/. or not(/data/repeat/option) ]',
            'instance("a")/root/item[name = /data/node/. or not(/data/repeat/option) ]'
        ],
        [ 'instance("a")/root/item[name = current() or not(/data/repeat/option) ]',
            'instance("a")/root/item[name = /data/node or not(/data/repeat/option) ]'
        ],
    ].forEach( test => {
        it( 'happens correctly', () => {
            const model = new Model( '<model><instance><root/></instance></model>' );
            const expected = test[ 1 ];
            model.init();
            expect( model.replaceCurrentFn( test[ 0 ], context ) ).toEqual( expected );
        } );
    } );
} );

describe( 'replacing version() calls', () => {
    [
        [ 'version()', '"123"' ],
        [ 'version(  )', '"123"' ],
        [ 'concat("version: ", version())', 'concat("version: ", "123")' ],
    ].forEach( test => {
        it( 'happens correctly', () => {
            const model = new Model( '<model><instance><root version="123"><a/></root></instance></model>' );
            const expected = test[ 1 ];
            model.init();
            expect( model.replaceVersionFn( test[ 0 ] ) ).toEqual( expected );
        } );
    } );
} );

describe( 'converting indexed-repeat() ', () => {
    [
        [ 'indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2)', '/path/to/repeat[position() = 2]/node' ],
        [ ' indexed-repeat( /path/to/repeat/node , /path/to/repeat , 2 )', ' /path/to/repeat[position() = 2]/node' ],
        [ '1 + indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2)', '1 + /path/to/repeat[position() = 2]/node' ],
        [ 'concat(indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2), "fluff")', 'concat(/path/to/repeat[position() = 2]/node, "fluff")' ],
        [ 'indexed-repeat(/p/t/r/ar/node, /p/t/r, 2, /p/t/r/ar, 3 )', '/p/t/r[position() = 2]/ar[position() = 3]/node' ]
    ].forEach( test => {
        it( 'works, with a number as 3rd (5th, 7th) parameter', () => {
            const model = new Model( '<model><instance><root/></instance></model>' );
            const expected = test[ 1 ];
            model.init();
            expect( model.replaceIndexedRepeatFn( test[ 0 ] ) ).toEqual( expected );
        } );
    } );

    [
        [ 'indexed-repeat( /p/t/r/node,  /p/t/r , position(..)    )', '/p/t/r[position() = 3]/node' ],
        [ 'indexed-repeat( /p/t/r/node,  /p/t/r , position(..) - 1)', '/p/t/r[position() = 2]/node' ],
    ].forEach( test => {
        it( 'works, with an expresssion as 3rd (5th, 7th) parameter', () => {
            const model = new Model( '<model><instance><p><t><r><node/></r><r><node/></r><r><node/></r></t></p></instance></model>' );
            const expected = test[ 1 ];
            model.init();
            expect( model.replaceIndexedRepeatFn( test[ 0 ], '/p/t/r/node', 2 ) ).toEqual( expected );
        } );
    } );
} );


describe( 'converting pulldata() ', () => {
    [
        [ 'pulldata(\'hhplotdata\', \'plot1size\', \'hhid_key\', 2)', 'instance(\'hhplotdata\')/root/item[hhid_key = \'2\']/plot1size' ],
        [ 'pulldata( \'hhplotdata\', \'plot1size\', \'hhid_key\' , 2 )', 'instance(\'hhplotdata\')/root/item[hhid_key = \'2\']/plot1size' ],
        [ 'pulldata(\'hhplotdata\', \'plot1size\', \'hhid_key\', \'two\')', 'instance(\'hhplotdata\')/root/item[hhid_key = \'two\']/plot1size' ],
        [ 'pulldata(\'hhplotdata\', \'plot1size\', \'hhid_key\', /data/a)', 'instance(\'hhplotdata\')/root/item[hhid_key = \'aa\']/plot1size' ],
        [ 'pulldata(\'hhplotdata\', \'plot1size\', \'hhid_key\', /data/b)', 'instance(\'hhplotdata\')/root/item[hhid_key = \'22\']/plot1size' ],
        [ 'pulldata(\'hhplotdata\', \'plot1size\', \'hhid_key\', /data/c)', 'instance(\'hhplotdata\')/root/item[hhid_key = \'12E345\']/plot1size' ],
    ].forEach( test => {
        it( 'works', () => {
            const model = new Model( '<model><instance><data><a>aa</a><b>22</b><c>12E345</c></data></instance></model>' );
            const fn = test[ 0 ];
            const expected = test[ 1 ];
            model.init();
            expect( model.convertPullDataFn( fn )[ fn ] ).toEqual( expected );
        } );
    } );
} );

describe( 'external instances functionality', () => {
    const parser = new DOMParser();
    let loadErrors;
    let model;
    const modelStr = '<model><instance><cascade_external id="cascade_external" version=""><country/><city/><neighborhood/><meta><instanceID/></meta></cascade_external></instance><instance id="cities" src="jr://file/cities.xml" /><instance id="neighborhoods" src="jr://file/neighbourhoods.xml" /><instance id="countries" src="jr://file/countries.xml" /></model>';
    const citiesStr = '<root><item><itextId>static_instance-cities-0</itextId><country>nl</country><name>ams</name></item></root>';

    it( 'outputs errors if external instances in the model are not provided upon instantiation', () => {
        model = new Model( modelStr );
        loadErrors = model.init();
        expect( loadErrors.length ).toEqual( 3 );
        expect( loadErrors[ 0 ] ).toEqual( 'External instance "cities" is empty.' );
        expect( loadErrors[ 1 ] ).toEqual( 'External instance "neighborhoods" is empty.' );
        expect( loadErrors[ 2 ] ).toEqual( 'External instance "countries" is empty.' );
    } );

    it( 'populates matching external instances provided as XML Document, and leaves original XML doc intact', () => {
        const external = [ {
            id: 'cities',
            xml: parser.parseFromString( citiesStr, 'text/xml' )
        }, {
            id: 'neighborhoods',
            xml: parser.parseFromString( '<root/>', 'text/xml' )
        }, {
            id: 'countries',
            xml: parser.parseFromString( '<root/>', 'text/xml' )
        } ];

        model = new Model( {
            modelStr,
            external
        } );
        loadErrors = model.init();
        expect( loadErrors.length ).toEqual( 0 );
        expect( model.xml.querySelector( 'instance#cities > root > item > country' ).textContent ).toEqual( 'nl' );

        // Now check that the orginal external XML docs are stil the same. Very important for e.g.
        // form reset functionality in apps.
        // https://github.com/kobotoolbox/enketo-express/issues/1086
        expect( external[ 0 ].xml.querySelector( 'country' ).textContent ).toEqual( 'nl' );
    } );

    it( 'removes existing (internal) content before adding external instances', () => {
        const populatedInstance = '<instance id="cities" src="jr://file/cities.xml"><existing>existing</existing><another>something</another></instance>';
        model = new Model( {
            modelStr: modelStr.replace( '<instance id="cities" src="jr://file/cities.xml" />', populatedInstance ),
            external: [ {
                id: 'cities',
                xml: parser.parseFromString( citiesStr, 'text/xml' )
            }, {
                id: 'neighborhoods',
                xml: parser.parseFromString( '<root/>', 'text/xml' )
            }, {
                id: 'countries',
                xml: parser.parseFromString( '<root/>', 'text/xml' )
            } ]
        } );
        loadErrors = model.init();
        expect( loadErrors.length ).toEqual( 0 );
        expect( model.xml.querySelectorAll( 'instance#cities > existing' ).length ).toEqual( 0 );
        expect( model.xml.querySelectorAll( 'instance#cities > another' ).length ).toEqual( 0 );
    } );
} );

describe( 'cloning repeats in empty model', () => {
    config.repeatOrdinals = false;
    const model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><data><rep1 jr:template=""><one/><rep2 jr:template=""><two/>' +
        '<rep3 jr:template=""><three/></rep3></rep2></rep1></data></instance></model>' );
    model.init();
    model.addRepeat( '/data/rep1', 0 );
    model.addRepeat( '/data/rep1/rep2', 0 );
    model.addRepeat( '/data/rep1/rep2/rep3', 0 );
    it( 'works for nested repeats', () => {
        expect( model.getStr() ).toEqual( '<data><rep1><one/><rep2><two/><rep3><three/></rep3></rep2></rep1></data>' );
    } );

} );

describe( 'Using XPath with default namespace', () => {

    describe( 'on the primary instance child', () => {
        const model = new Model( '<model><instance><data xmlns="http://unknown.namespace.com/34324sdagd"><nodeA>5</nodeA></data></instance></model>' );

        model.init();

        it( 'works for Nodeset().getElements()', () => {
            expect( model.node( '/data/nodeA' ).getElements().length ).toEqual( 1 );
            expect( model.node( '/data/nodeA' ).getVal() ).toEqual( '5' );
        } );

        it( 'works for evaluate()', () => {
            expect( model.evaluate( '/data/nodeA', 'nodes' ).length ).toEqual( 1 );
            expect( model.evaluate( '/data/nodeA', 'string' ) ).toEqual( '5' );
        } );

    } );

    describe( ' on the model', () => {
        const model = new Model( '<model xmlns="http://www.w3.org/2002/xforms"><instance><data><nodeA>5</nodeA></data></instance></model>' );

        model.init();

        it( 'works for Nodeset().getElements()', () => {
            expect( model.node( '/data/nodeA' ).getElements().length ).toEqual( 1 );
            expect( model.node( '/data/nodeA' ).getVal() ).toEqual( '5' );
        } );

        it( 'works for evaluate()', () => {
            expect( model.evaluate( '/data/nodeA', 'nodes' ).length ).toEqual( 1 );
            expect( model.evaluate( '/data/nodeA', 'string' ) ).toEqual( '5' );
        } );

    } );

} );

describe( 'Using XPath with non-default namespaces', () => {

    describe( 'on secondary instances', () => {
        const SEC_INSTANCE_CONTENT = '<sec xmlns:this="a"><this:b this:at="that">3</this:b></sec>';

        [ {
            modelStr: `<model><instance><data/></instance><instance id="s">${SEC_INSTANCE_CONTENT}</instance></model>`
        }, {
            modelStr: '<model><instance><data/></instance><instance id="s" src="something"/></model>',
            external: [ { id: 's', xml: new DOMParser().parseFromString( SEC_INSTANCE_CONTENT, 'text/xml' ) } ]
        } ].forEach( testObj => {
            const model = new Model( testObj );
            const type = testObj.external ? 'external' : 'internal';
            model.init();
            it( `works for simple namespaced node retrieval on ${type} instances`, () => {
                expect( model.evaluate( 'instance("s")/sec/this:b', 'string' ) ).toEqual( '3' );
            } );

            it( `works for simple namespaced attribute retrieval on ${type} instances`, () => {
                expect( model.evaluate( 'instance("s")/sec/this:b/@this:at', 'string' ) ).toEqual( 'that' );
            } );
        } );

    } );

} );

describe( 'Repeat without ordinals', () => {
    const modelStr = '<model><instance><a><rep.dot><b/></rep.dot><rep.dot><b/></rep.dot></a></instance></model>';
    const modelStrWithTemplate = '<model xmlns:jr="http://openrosa.org/javarosa">' +
        '<instance><a><rep.dot jr:template=""><b/></rep.dot><rep.dot><b/></rep.dot><rep.dot><b/></rep.dot></a></instance></model>';

    it( 'are cloned when necessary when repeat has dot in nodeName without template', () => {
        const model = new Model( modelStr );
        model.init();
        //model.extractFakeTemplates( [ '/a/rep.dot' ] );

        expect( model.evaluate( '/a/rep.dot', 'nodes' ).length ).toEqual( 2 );
        model.addRepeat( '/a/rep.dot', 0, false );
        expect( model.evaluate( '/a/rep.dot', 'nodes' ).length ).toEqual( 3 );
    } );

    it( 'are cloned when necessary when repeat has dot in nodeName with template', () => {
        const model = new Model( modelStrWithTemplate );
        model.init();

        expect( model.evaluate( '/a/rep.dot', 'nodes' ).length ).toEqual( 2 );
        model.addRepeat( '/a/rep.dot', 0, false );
        expect( model.evaluate( '/a/rep.dot', 'nodes' ).length ).toEqual( 3 );
    } );

    it( 'will use the first repeat instance as template and empty the leaf nodes', () => {
        const model = new Model( '<model><instance><data><repeat><n>1</n></repeat></data></instance></model>' );
        model.init();
        model.addRepeat( '/data/repeat', 0, false );
        expect( model.getStr() ).toEqual( '<data><repeat><n>1</n></repeat><repeat><n/></repeat></data>' );
    } );

    it( 'adds the template also when node.remove is called, and removes a repeat even if it is the only instance', () => {
        const model = new Model( '<model><instance><data><repeat><n>1</n></repeat></data></instance></model>' );
        model.init();
        model.node( '/data/repeat', 0 ).remove();
        expect( model.getStr() ).toEqual( '<data></data>' ); // not self-closing because comment was removed with regex replace
        model.addRepeat( '/data/repeat', 0, false );
        expect( model.getStr() ).toEqual( '<data><repeat><n/></repeat></data>' );
    } );

} );

describe( 'Ordinals in repeats', () => {
    const dflt = config[ 'repeat ordinals' ];
    const wr = '<root xmlns:enk="http://enketo.org/xforms">{{c}}</root>';
    const wrt = '<root xmlns:jr="http://openrosa.org/javarosa" xmlns:enk="http://enketo.org/xforms">{{c}}</root>';
    const r = '<repeat><node/></repeat>';
    const rt = '<repeat jr:template=""><node/></repeat>';
    const start = '<model><instance><root>';
    const startNs = '<model><instance><root xmlns:jr="http://openrosa.org/javarosa">';
    const end = '</root></instance></model>';


    beforeAll( () => {
        config.repeatOrdinals = true;
    } );

    afterAll( () => {
        config.repeatOrdinals = dflt;
    } );

    describe( 'that have no jr:template', () => {
        const m1 = start + r + end;
        const m2 = start + r + r + end;
        const m3 = `${start}<repeat>${r.replace( /repeat/g, 'nr' )}</repeat>${end}`;
        const m4 = `${start}<repeat>${r.replace( /repeat/g, 'nr' )}${r.replace( /repeat/g, 'nr' )}</repeat>${end}`;
        //var paths = [ '/root/repeat', '/root/repeat/nr' ];

        it( 'get added to newly cloned repeats', () => {
            const model = new Model( m1 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1"><node/></repeat><repeat enk:ordinal="2"><node/></repeat>' ) );
        } );

        it( 'get added to newly cloned repeats if multiple instances are present in default model', () => {
            const model = new Model( m2 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1"><node/></repeat><repeat enk:ordinal="2"><node/></repeat>' +
                '<repeat enk:ordinal="3"><node/></repeat>' ) );
        } );

        it( 'get added to newly cloned NESTED repeats', () => {
            const model = new Model( m3 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="2"><nr><node/></nr></repeat>' ) );
        } );

        // Very theoretical. Situation will never occur with OC.
        xit( 'get added to newly cloned NESTED repeats if multiple instances of the nested repeat are present in default model', () => {
            const model = new Model( m4 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="2"><nr enk:last-used-ordinal="2" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr></repeat>' ) );
        } );

        it( 'retains original ordinals when a repeat or NESTED repeat instance in between is removed', () => {
            const model = new Model( m3 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.node( '/root/repeat', 1 ).remove();
            model.node( '/root/repeat/nr', 1 ).remove();
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="3"><nr><node/></nr></repeat>' ) );
        } );

        it( 'continues ordinal numbering when the last repeat or NESTED repeat instance is removed and a new repeat is created', () => {
            const model = new Model( m3 );
            model.init();
            //model.extractFakeTemplates( paths );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.node( '/root/repeat', 1 ).remove();
            model.node( '/root/repeat/nr', 1 ).remove();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            expect( model.getStr() ).toEqual( wr.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="3"><nr><node/></nr></repeat>' ) );
        } );

    } );

    describe( 'that have a jr:template', () => {
        const m1 = startNs + rt + end;
        const m2 = startNs + rt + r + end;
        const m3 = startNs + rt.replace( '<node/>', rt.replace( /repeat/g, 'nr' ) ) + end;
        const m4 = startNs + rt.replace( '<node/>', rt.replace( /repeat/g, 'nr' ) + r.replace( /repeat/g, 'nr' ) ) + end;

        it( 'get added to newly cloned repeats', () => {
            const model = new Model( m1 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1"><node/></repeat><repeat enk:ordinal="2"><node/></repeat>'
            ) );
        } );

        it( 'get added to newly cloned repeats if multiple instances are present in default model', () => {
            const model = new Model( m2 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1"><node/></repeat><repeat enk:ordinal="2"><node/></repeat>' +
                '<repeat enk:ordinal="3"><node/></repeat>' ) );
        } );

        it( 'get added to newly cloned NESTED repeats', () => {
            const model = new Model( m3 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 1 );
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="2"><nr enk:last-used-ordinal="1" enk:ordinal="1"><node/></nr></repeat>' ) );
        } );

        // Very theoretical. Situation will never occur with OC.
        xit( 'get added to newly cloned NESTED repeats if multiple instances of the nested repeat are present in default model', () => {
            const model = new Model( m4 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 1 );
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="2" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="2" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr>' +
                '</repeat>' +
                '<repeat enk:ordinal="2"><nr enk:last-used-ordinal="2" enk:ordinal="1"><node/></nr><nr enk:ordinal="2"><node/></nr></repeat>' ) );
        } );

        it( 'retains original ordinals when a repeat or NESTED repeat instance in between is removed', () => {
            const model = new Model( m3 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 2 );
            model.node( '/root/repeat', 1 ).remove();
            model.node( '/root/repeat/nr', 1 ).remove();
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="3"><nr enk:last-used-ordinal="1" enk:ordinal="1"><node/></nr></repeat>' ) );
        } );

        it( 'continues ordinal numbering when the last repeat or NESTED repeat instance is removed and a new repeat is created', () => {
            const model = new Model( m3 );
            model.init();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 1 );
            model.node( '/root/repeat', 1 ).remove();
            model.node( '/root/repeat/nr', 1 ).remove();
            model.addRepeat( '/root/repeat', 0 );
            model.addRepeat( '/root/repeat/nr', 0 );
            model.addRepeat( '/root/repeat/nr', 1 );
            expect( model.getStr() ).toEqual( wrt.replace( '{{c}}',
                '<repeat enk:last-used-ordinal="3" enk:ordinal="1">' +
                '<nr enk:last-used-ordinal="3" enk:ordinal="1"><node/></nr><nr enk:ordinal="3"><node/></nr>' +
                '</repeat><repeat enk:ordinal="3"><nr enk:last-used-ordinal="1" enk:ordinal="1"><node/></nr></repeat>' ) );
        } );

    } );

} );

describe( 'makes Enketo repeat-bug-compliant by injecting positions to correct incorrect XPath expressions', () => {
    const modelStr = '<model><instance><abcabce id="abcabce"><n/><ab><ynab/></ab><a><ynaa>1</ynaa><c/></a><a><ynaa>2</ynaa><c/></a><meta><instanceID/></meta></abcabce></instance></model>';

    it( 'as designed', () => {
        const model = new Model( modelStr );
        model.init();
        expect( model.makeBugCompliant( '/model/instance[1]/abcabce/a/c = 1', '/abcabce/a/ynaa', 0 ) ).toEqual( '/model/instance[1]/abcabce/a[1]/c = 1' );
        expect( model.makeBugCompliant( '/model/instance[1]/abcabce/a/c = 1', '/abcabce/a/ynaa', 1 ) ).toEqual( '/model/instance[1]/abcabce/a[2]/c = 1' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/594
    it( ' without getting confused by /path/to/node/a/ab/node', () => {
        const model = new Model( modelStr );
        model.init();

        expect( model.makeBugCompliant( '/model/instance[1]/abcabce/ab/ynab = 1', '/abcabce/a/ynaa', 0 ) ).toEqual( '/model/instance[1]/abcabce/ab/ynab = 1' );
        expect( model.makeBugCompliant( '/model/instance[1]/abcabce/ab/ynab = 1', '/abcabce/a/ynaa', 1 ) ).toEqual( '/model/instance[1]/abcabce/ab/ynab = 1' );
    } );

} );

describe( 'merging an instance into the model', () => {

    config.repeatOrdinals = false;

    describe( '', () => {
        [
            // partial record, empty
            [ '<a><b/></a>', '<model><instance><a><b/><c/></a></instance></model>', '<model><instance><a><b/><c/></a></instance></model>' ],
            // record value overrides model (default) value
            [ '<a><b>record</b></a>', '<model><instance><a><b>model</b></a></instance></model>', '<model><instance><a><b>record</b></a></instance></model>' ],
            // record value overrides model (default) value with an empty value
            [ '<a><b/></a>', '<model><instance><a><b>default</b></a></instance></model>', '<model><instance><a><b/></a></instance></model>' ],
            // record value overrides model (default) value inside a repeat with an empty value
            [ '<a><re><b/></re><re><b/></re></a>', '<model><instance><a><re><b>default1</b></re><re><b>default2</b></re></a></instance></model>',
                '<model><instance><a><re><b/></re><re><b/></re></a></instance></model>'
            ],
            // preserve non-alphabetic document order of model
            [ '<a><c/></a>', '<model><instance><a><c/><b/></a></instance></model>', '<model><instance><a><c/><b/></a></instance></model>' ],
            // repeated nodes in record get added (including repeat childnodes that are missing from record)
            [ '<a><c><d>record</d></c><c/></a>', '<model><instance><a><c><d>model</d></c></a></instance></model>',
                '<model><instance><a><!--repeat://a/c--><c><d>record</d></c><c><d/></c></a></instance></model>'
            ],
            // more difficult case, with empty group in record for instance where group contains nothing other than 1 repeat.
            [
                '<M><code>a</code><f1/><survey><MB></MB></survey><meta><instanceID/></meta></M>',
                '<model xmlns:jr="http://openrosa.org/javarosa"><instance><M><code/><f1/><survey><MB><mBr1 jr:template=""><mem/><MBg1><name/></MBg1></mBr1></MB></survey><meta><instanceID/></meta></M></instance></model>',
                '<model xmlns:jr="http://openrosa.org/javarosa"><instance><M><code>a</code><f1/><survey><MB><!--repeat://M/survey/MB/mBr1--></MB></survey><meta><instanceID/></meta></M></instance></model>'
            ],
            // nested repeated nodes in record (both c and d are repeats)
            [ '<a><c><d>record</d></c><c><d>one</d><d>two</d></c></a>', '<model><instance><a><c><d>model</d></c></a></instance></model>',
                '<model><instance><a><!--repeat://a/c--><c><!--repeat://a/c/d--><d>record</d></c><c><!--repeat://a/c/d--><d>one</d><d>two</d></c></a></instance></model>'
            ],
            // nested repeated nodes in record special difficult case that may result in out-of-order repeat insertion (but not sure why)
            [
                '<q><P><I><Partner><pi><pn>a</pn><Camp><cn>a1</cn></Camp><Camp><cn>a2</cn></Camp></pi></Partner><Partner><pi><pn>b</pn><Camp><cn>b1</cn></Camp><Camp><cn>b2</cn></Camp><Camp><cn>b3</cn></Camp></pi></Partner></I></P><meta><instanceID>a</instanceID></meta></q>',
                '<model><instance><q id="Test2" ><P><I><Partner><pi><pn/><Camp><cn/></Camp><bud/></pi></Partner></I></P><meta><instanceID/></meta></q></instance></model>',
                '<model><instance><q id="Test2"><P><I><!--repeat://q/P/I/Partner--><Partner><pi><pn>a</pn><!--repeat://q/P/I/Partner/pi/Camp--><Camp><cn>a1</cn></Camp><Camp><cn>a2</cn></Camp><bud/></pi></Partner><Partner><pi><pn>b</pn><!--repeat://q/P/I/Partner/pi/Camp--><Camp><cn>b1</cn></Camp><Camp><cn>b2</cn></Camp><Camp><cn>b3</cn></Camp><bud/></pi></Partner></I></P><meta><instanceID>a</instanceID></meta></q></instance></model>'
            ],
            // repeated nodes in record get added in the right order
            [ '<a><r/><r/></a>', '<model><instance><a><r/><meta/></a></instance></model>', '<model><instance><a><!--repeat://a/r--><r/><r/><meta/></a></instance></model>' ],
            // same as above but there are text nodes as siblings of repeats
            [ '<a><r/>\n<r/></a>', '<model><instance><a><r/><meta/></a></instance></model>', '<model><instance><a><!--repeat://a/r--><r/><r/><meta/></a></instance></model>' ],
            // repeated groups with missing template nodes in record get added
            [ '<a><r/><r/></a>', '<model><instance><a><r><b/></r><meta/></a></instance></model>', '<model><instance><a><!--repeat://a/r--><r><b/></r><r><b/></r><meta/></a></instance></model>' ],
            // unused model namespaces preserved:
            [ '<a><c>record</c></a>', '<model xmlns:cc="http://cc.com"><instance><a><c/></a></instance></model>', '<model xmlns:cc="http://cc.com"><instance><a><c>record</c></a></instance></model>' ],
            // used model namespaces preserved (though interestingly the result includes a duplicate namespace declaration - probably a minor bug in merge-xml-js)
            [ '<a><c>record</c></a>', '<model xmlns:cc="http://cc.com"><instance><a><c/><cc:meta><cc:instanceID/></cc:meta></a></instance></model>',
                '<model xmlns:cc="http://cc.com"><instance><a><c>record</c><cc:meta xmlns:cc="http://cc.com"><cc:instanceID/></cc:meta></a></instance></model>'
            ],
            // namespaces used in both record and model (though now with triple equal namespace declarations..:
            [ '<a xmlns:cc="http://cc.com"><c>record</c><cc:meta><cc:instanceID>a</cc:instanceID></cc:meta></a>',
                '<model xmlns:cc="http://cc.com"><instance><a><c/><cc:meta><cc:instanceID/></cc:meta></a></instance></model>',
                '<model xmlns:cc="http://cc.com"><instance><a xmlns:cc="http://cc.com"><c>record</c><cc:meta xmlns:cc="http://cc.com"><cc:instanceID>a</cc:instanceID></cc:meta></a></instance></model>'
            ],
            // record and model contain same node but in different namespace creates 2nd meta groups and 2 instanceID nodes!
            [ '<a><c/><meta><instanceID>a</instanceID></meta></a>',
                '<model xmlns:cc="http://cc.com"><instance><a><c/><cc:meta><cc:instanceID/></cc:meta></a></instance></model>',
                '<model xmlns:cc="http://cc.com"><instance><a><c/><cc:meta xmlns:cc="http://cc.com"><cc:instanceID/></cc:meta><meta><instanceID>a</instanceID></meta></a></instance></model>'
            ],
            // model has xml declaration and instance has not
            [ '<a/>', '<?xml version="1.0" encoding="UTF-8"?><model><instance><a><b/></a></instance></model>',
                '<?xml version="1.0" encoding="UTF-8"?><model><instance><a><b/></a></instance></model>'
            ],
            // record and instance have different default namespace
            [ '<a xmlns="http://rogue.opendatakit.namespace"><c>record</c></a>',
                '<model><instance><a><c/></a></instance></model>',
                '<model><instance><a><c>record</c></a></instance></model>'
            ],
            // rogue record contains a node with a template or jr:template attribute
            //[ '<a xmlns:jr="http://openrosa.org/javarosa"><r jr:template=""><b>ignore</b></r></a>', '<model><instance><a><r><b/></r><meta/></a></instance></model>', '<model><instance><a><r><b/></r><meta/></a></instance></model>' ],
            [ '<a xmlns:jr="http://someth.ing"><r jr:template=""><b>ignore</b></r></a>', '<model><instance><a><r><b/></r><meta/></a></instance></model>',
                '<model><instance><a xmlns:jr="http://someth.ing"><r><b/></r><meta/></a></instance></model>'
            ],
            // empty group in record
            [ '<data><age>7</age><details/></data>', '<model><instance><data><age/><details><name>Baby ...</name></details></data></instance></model>',
                '<model><instance><data><age>7</age><details><name/></details></data></instance></model>'
            ]
        ].forEach( test => {
            let result;
            let expected;

            const model = new Model( {
                modelStr: test[ 1 ]
            } );

            model.init();
            model.mergeXml( test[ 0 ] );

            // remove __session instance
            model.xml.querySelector( 'instance[id="__session"]' ).remove();
            result = ( new XMLSerializer() ).serializeToString( model.xml, 'text/xml' ).replace( /\n/g, '' );
            expected = test[ 2 ];

            it( `produces the expected result for instance: ${test[ 0 ]}`, () => {
                expect( result ).toEqual( expected );
            } );
        } );
    } );

    describe( 'when the record contains a repeat comment', () => {
        // This test covers a case where for some reason the record includes a repeat comment.
        it( 'does not create duplicate repeat comment', () => {
            let result;
            const instanceStr = '<a><!--repeat://a/r--><r><node/></r><b>2</b></a>';
            const model = new Model( {
                modelStr: '<model><instance><a><r><node/></r><b/></a></instance></model>',
                instanceStr
            } );
            model.init();

            // remove __session instance
            model.xml.querySelector( 'instance[id="__session"]' ).remove();

            // Now we specifically force Enketo to go through its repeat initialization routine for /a/r,
            // which includes the creation of special repeat comments.
            model.extractFakeTemplates( [ '/a/r' ] );
            result = ( new XMLSerializer() ).serializeToString( model.xml, 'text/xml' ).replace( /\n/g, '' );
            expect( result ).toEqual( `<model><instance>${instanceStr}</instance></model>` );
        } );
    } );

    describe( 'when a deprecatedID node is not present in the form format', () => {
        const model = new Model( {
            modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/></meta></thedata></instance></model>',
            instanceStr: '<thedata id="thedata"><meta><instanceID>7c990ed9-8aab-42ba-84f5-bf23277154ad</instanceID></meta><nodeA>2012</nodeA></thedata>'
        } );

        const loadErrors = model.init();

        it( 'outputs no load errors', () => {
            expect( loadErrors.length ).toEqual( 0 );
        } );

        it( 'adds a deprecatedID node', () => {
            expect( model.node( '/thedata/meta/deprecatedID' ).getElements().length ).toEqual( 1 );
        } );

        //this is an important test even though it may not seem to be...
        it( 'includes the deprecatedID in the string to be submitted', () => {
            expect( model.getStr().indexOf( '<deprecatedID>' ) ).not.toEqual( -1 );
        } );

        it( 'gives the new deprecatedID node the old value of the instanceID node of the instance-to-edit', () => {
            expect( model.node( '/thedata/meta/deprecatedID' ).getVal() ).toEqual( '7c990ed9-8aab-42ba-84f5-bf23277154ad' );
        } );

        it( 'generates a new instanceID', () => {
            expect( model.node( '/thedata/meta/instanceID' ).getVal() ).not.toEqual( '7c990ed9-8aab-42ba-84f5-bf23277154ad' );
            expect( model.node( '/thedata/meta/instanceID' ).getVal().length ).toEqual( 41 );
        } );
    } );

    describe( 'when instanceID and deprecatedID nodes are already present in the form format', () => {
        const model = new Model( {
            modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/><deprecatedID/></meta></thedata></instance></model>',
            instanceStr: '<thedata id="something"><meta><instanceID>7c990ed9-8aab-42ba-84f5-bf23277154ad</instanceID></meta><nodeA>2012</nodeA></thedata>'
        } );

        const loadErrors = model.init();

        it( 'outputs no load errors', () => {
            expect( loadErrors.length ).toEqual( 0 );
        } );

        it( 'does not NOT add another instanceID node', () => {
            expect( model.node( '/thedata/meta/instanceID' ).getElements().length ).toEqual( 1 );
        } );

        it( 'does not NOT add another deprecatedID node', () => {
            expect( model.node( '/thedata/meta/deprecatedID' ).getElements().length ).toEqual( 1 );
        } );

        it( 'gives the deprecatedID node the old value of the instanceID node of the instance-to-edit', () => {
            expect( model.node( '/thedata/meta/deprecatedID' ).getVal() ).toEqual( '7c990ed9-8aab-42ba-84f5-bf23277154ad' );
        } );
    } );


    describe( 'when the model contains templates', () => {
        [
            // with proper jr:template="" and namespace definition
            [ '<a><r><b>5</b></r><r><b>6</b></r><meta/></a>', '<model xmlns:jr="http://openrosa.org/javarosa"><instance><a><r jr:template=""><b>0</b></r><meta><instanceID/></meta></a></instance></model>', '<instance><a><r><b>5</b></r><r><b>6</b></r>' ],
        ].forEach( test => {
            let result;
            let expected;

            const model = new Model( {
                modelStr: test[ 1 ],
                instanceStr: test[ 0 ]
            } );

            model.init();

            result = ( new XMLSerializer() ).serializeToString( model.xml, 'text/xml' ).replace( /<!--[^>]*-->/g, '' );
            expected = test[ 2 ];

            it( 'the initialization will merge the repeat values correctly and remove the templates', () => {
                expect( model.xml.querySelectorAll( 'a > r' ).length ).toEqual( 2 );
                expect( result ).toContain( expected );
            } );
        } );
    } );

    describe( 'when the record contains namespaced attributes, the merged result is CORRECTLY namespaced', () => {
        const ns = 'http://enketo.org/xforms';
        // issue: https://github.com/kobotoolbox/enketo-express/issues/565
        [
            // with repeat template
            [ `<a xmlns:enk="${ns}"><r enk:last-used-ordinal="2" enk:ordinal="1"><b>6</b></r></a>`,
                '<model><instance><a><r><b>5</b></r><meta/></a></instance></model>'
            ],
            // with repeat template
            [ `<a xmlns:enk="${ns}"><r enk:last-used-ordinal="2" enk:ordinal="1"><b>6</b></r></a>`,
                '<model><instance><a><r jr:template=""><b>5</b></r><meta/></a></instance></model>'
            ]
        ].forEach( test => {
            const model = new Model( {
                modelStr: test[ 1 ],
                instanceStr: test[ 0 ]
            } );
            model.init();

            it( 'namespaces are added correctly', () => {
                // these tests assume a fix attribute order which is a bit fragile
                expect( model.xml.querySelector( 'r' ).getAttributeNS( ns, 'last-used-ordinal' ) ).toEqual( '2' );
                expect( model.xml.querySelector( 'r' ).getAttributeNS( ns, 'ordinal' ) ).toEqual( '1' );
                //expect( model.xml.querySelector( 'r' ).attributes[ 1 ].localName ).toEqual( 'ordinal' ); // without prefix!
                //expect( model.xml.querySelector( 'r' ).attributes[ 1 ].namespaceURI ).toEqual( ns );
            } );
        } );
    } );

    describe( 'returns load errors upon initialization', () => {
        const originalErrorLog = console.error;

        beforeAll( ()=> {
            console.error = () => {};
        } );

        afterAll( ()=> {
            console.error = originalErrorLog;
        } );

        it( 'when the instance-to-edit contains nodes that are not present in the default instance', () => {
            const model = new Model( {
                modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/></meta></thedata></instance></model>',
                instanceStr: '<thedata_updated id="something"><meta><instanceID>7c99</instanceID></meta><nodeA>2012</nodeA></thedata_updated>'
            } );
            const loadErrors = model.init();

            expect( loadErrors.length ).toEqual( 1 );
            expect( loadErrors[ 0 ] ).toEqual( 'Error trying to parse XML record. Different root nodes' );
        } );

        it( 'when an instance-to-edit is provided with to a model that does not contain an instanceID node', () => {
            const model = new Model( {
                modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta></meta></thedata></instance></model>',
                instanceStr: '<thedata id="something"><meta><instanceID>7c99</instanceID></meta><nodeA>2012</nodeA></thedata>'
            } );
            const loadErrors = model.init();

            expect( loadErrors.length ).toEqual( 1 );
            expect( loadErrors[ 0 ] ).toEqual( 'Invalid primary instance. Missing instanceID node.' );
        } );
    } );

    describe( 'when the model contains secondary instance', () => {
        const INSTANCE_A_CONTENT = 'choiceaFilteredachoicebFilteredbchoicecc';

        it( 'leaves those secondary instances intact if empty leaf node in record with default value in XForm', () => {
            const model = new Model( {
                modelStr: forms[ 'merge-empty-instance.xml' ].xml_model,
                instanceStr: '<data id="Problem_Reproducing_Form_retry"><A/><B/><C><CA>hey</CA></C><meta><instanceID>uuid:c</instanceID></meta></data>'
            } );
            model.init();
            const instanceContent = model.xml.querySelector( 'instance#A' ).textContent.replace( /\s/g, '' );
            expect( instanceContent ).toEqual( INSTANCE_A_CONTENT );
        } );

        it( 'leaves those secondary instances intact if empty group node in record with childnodes with default value in XForm', () => {
            const model = new Model( {
                modelStr: forms[ 'merge-empty-instance.xml' ].xml_model,
                instanceStr: '<data id="Problem_Reproducing_Form_retry"><A/><B/><C/><meta><instanceID>uuid:c</instanceID></meta></data>'
            } );
            model.init();
            const instanceContent = model.xml.querySelector( 'instance#A' ).textContent.replace( /\s/g, '' );
            expect( instanceContent ).toEqual( INSTANCE_A_CONTENT );

            // double-check primary instance too:
            const ca = model.xml.querySelectorAll( 'CA' );
            expect( ca.length ).toEqual( 1 );
            expect( ca[ 0 ].textContent ).toEqual( '' );
        } );

    } );

} );

// Runs fine headlessly locally, but not on Travis for some reason.
describe( 'instanceID and deprecatedID are populated upon model initilization', () => {
    it( 'for a new record', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><meta><instanceID/></meta></a></instance></model>'
        } );
        model.init();

        expect( model.getStr() ).toMatch( /<a><meta><instanceID>[^\s]{41}<\/instanceID><\/meta><\/a>/ );
    } );

    it( 'for an existing unsubmitted record', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><meta><instanceID/></meta></a></instance></model>',
            instanceStr: '<a><meta><instanceID>abc</instanceID></meta></a>',
            submitted: false
        } );
        model.init();

        expect( model.getStr() ).toEqual( '<a><meta><instanceID>abc</instanceID></meta></a>' );
    } );

    it( 'for an existing previously-submitted record(1)', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><meta><instanceID/></meta></a></instance></model>',
            instanceStr: '<a><meta><instanceID>abc</instanceID></meta></a>'
        } );
        model.init();

        expect( model.getStr() ).toMatch( /<a><meta><instanceID>[^\s]{41}<\/instanceID><deprecatedID>abc<\/deprecatedID><\/meta><\/a>/ );
    } );

    it( 'for an existing previously-submitted record (2)', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><meta><instanceID/></meta></a></instance></model>',
            instanceStr: '<a><meta><instanceID>abc</instanceID></meta></a>',
            submitted: true
        } );
        model.init();

        expect( model.getStr() ).toMatch( /<a><meta><instanceID>[^\s]{41}<\/instanceID><deprecatedID>abc<\/deprecatedID><\/meta><\/a>/ );
    } );

    it( 'and fires dataupdate events for instanceID and deprecatedID on model.$events', () => {
        const model = new Model( {
            modelStr: '<model><instance><a><meta><instanceID/></meta></a></instance></model>',
            instanceStr: '<a><meta><instanceID>abc</instanceID></meta></a>',
            submitted: true
        } );
        const eventObjects = [];
        model.events.addEventListener( 'dataupdate', event => {
            eventObjects.push( event.detail );
        } );
        model.init();
        expect( eventObjects.length ).toEqual( 2 );
        expect( eventObjects[ 0 ].nodes ).toEqual( [ 'instanceID' ] );
        expect( eventObjects[ 1 ].nodes ).toEqual( [ 'deprecatedID' ] );

    } );

} );

describe( 'odk-instance-first-load event', () => {

    const modelStr = '<model><instance><data><a><meta><instanceID/></meta></a></data></instance></model>';
    const instanceStr = '<data><a>1</a></data>';

    it( 'fires once when starting a new record', () => {
        const model = new Model( { modelStr } );
        let eventsOccurred = 0;

        model.events.addEventListener( events.InstanceFirstLoad().type, () => eventsOccurred++ );
        model.init();
        expect( eventsOccurred ).toEqual( 1 );
    } );

    it( 'does not fire when loading an existing record', () => {
        const model = new Model( { modelStr, instanceStr } );
        let eventsOccurred = 0;

        model.events.addEventListener( events.InstanceFirstLoad().type, () => eventsOccurred++ );
        model.init();
        expect( eventsOccurred ).toEqual( 0 );
    } );

} );

