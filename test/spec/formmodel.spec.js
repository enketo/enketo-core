if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ 'enketo-js/FormModel' ], function( Model ) {

    var getModel = function( filename ) {
        var model = new Model( mockForms1[ filename ].xml_model );
        model.init();
        return model;
    };

    // I don't remember why this functionality exists
    describe( 'Primary instance node values', function() {
        var model = new Model( '<model><instance><data><nodeA> 2  </nodeA></data></instance></model>' );
        model.init();
        it( 'are trimmed during initialization', function() {
            expect( model.getStr() ).toEqual( '<data><nodeA>2</nodeA></data>' );
        } );
    } );

    describe( 'Instantiating a model', function() {
        var modelStr = '<model><instance><data id="data"><nodeA>2</nodeA></data></instance>' +
            '<instance id="countries"><root><item><country>NL</country></item></root></instance></model>';

        it( 'without options, it includes all instances', function() {
            var model = new Model( modelStr );
            model.init();
            expect( model.xml.querySelector( 'model > instance#countries' ) ).not.toBeNull();
            expect( model.xml.querySelector( 'model > instance#countries > root > item > country' ).textContent ).toEqual( 'NL' );
        } );

        it( 'with option.full = true, it includes all instances', function() {
            var model = new Model( modelStr, {
                full: true
            } );
            model.init();
            expect( model.xml.querySelector( 'model > instance#countries' ) ).not.toBeNull();
            expect( model.xml.querySelector( 'model > instance#countries > root > item > country' ).textContent ).toEqual( 'NL' );
        } );

        it( 'with options.full = false, strips the secondary instances', function() {
            var model = new Model( modelStr, {
                full: false
            } );
            model.init();
            expect( model.xml.querySelector( 'model > instance#countries' ) ).toBeNull();
        } );
    } );

    describe( 'Data node getter', function() {
        var i, t =
            [
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
                [ null, null, {
                        noEmpty: true
                    },
                    9 //when tested outside Form class, instanceID is not populated
                ],
                [ '/thedata/nodeA', null, null, 1 ],
                [ '/thedata/nodeA', 1, null, 0 ],
                [ '/thedata/nodeA', null, {
                        noEmpty: true
                    },
                    0
                ], //"int"
                [ '/thedata/nodeA', null, {
                        onlyleaf: true
                    },
                    1
                ],
                [ '/thedata/repeatGroup', null, null, 3 ],

                [ '//nodeC', null, null, 3 ],
                [ '/thedata/repeatGroup/nodeC', null, null, 3 ],
                [ '/thedata/repeatGroup/nodeC', 2, null, 1 ],
                [ '/thedata/repeatGroup/nodeC', null, {
                        noEmpty: true
                    },
                    2
                ],
                [ '/thedata/repeatGroup/nodeC', null, {
                        onlyleaf: true
                    },
                    3
                ]
            ],
            model = new Model( '<model><instance><thedata id="thedata"><nodeA/><nodeB>b</nodeB>' +
                '<repeatGroup template=""><nodeC>cdefault</nodeC></repeatGroup><repeatGroup><nodeC/></repeatGroup>' +
                '<repeatGroup><nodeC>c2</nodeC></repeatGroup>' +
                '<repeatGroup><nodeC>c3</nodeC></repeatGroup>' +
                '<somenodes><A>one</A><B>one</B><C>one</C></somenodes><someweights><w1>1</w1><w2>3</w2><w.3>5</w.3></someweights><nodeF/>' +
                '<meta><instanceID/></meta></thedata></instance></model>' );

        model.init();

        function test( node ) {
            it( 'obtains nodes (selector: ' + node.selector + ', index: ' + node.index + ', filter: ' + JSON.stringify( node.filter ) + ')', function() {
                expect( model.node( node.selector, node.index, node.filter ).get().length ).toEqual( node.result );
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

    describe( 'Date node (&) value getter', function() {
        var data = getModel( 'thedata.xml' ); //dataStr1);

        it( 'returns an array of one node value', function() {
            expect( data.node( '/thedata/nodeB' ).getVal() ).toEqual( [ 'b' ] );
        } );

        it( 'returns an array of multiple node values', function() {
            expect( data.node( '/thedata/repeatGroup/nodeC' ).getVal() ).toEqual( [ '', 'c2', 'c3' ] );
        } );

        it( 'returns an empty array', function() {
            expect( data.node( '/thedata/nodeX' ).getVal() ).toEqual( [] );
        } );

        it( 'obtains a node value of a node with a . in the name', function() {
            expect( data.node( '/thedata/someweights/w.3' ).getVal() ).toEqual( [ '5' ] );
        } );
    } );

    describe( 'Data node XML data type conversion & validation', function() {
        var i, data,
            t = [
                [ '/thedata/nodeA', null, null, 'val1', null, true ],
                [ '/thedata/nodeA', null, null, 'val3', 'somewrongtype', true ], //default type is string

                [ '/thedata/nodeA', 1, null, 'val13', 'string', null ], //non-existing node
                [ '/thedata/repeatGroup/nodeC', null, null, 'val', null, null ], //multiple nodes

                [ '/thedata/nodeA', 0, null, '4', 'double', true ], //double is a non-existing xml data type so turned into string
                [ '/thedata/nodeA', 0, null, 5, 'double', true ],

                [ '/thedata/nodeA', null, null, 'val2', 'string', true ],
                [ '/thedata/nodeA', 0, null, [ 'a', 'b', 'c' ], 'string', true ],
                [ '/thedata/nodeA', 0, null, [ 'd', 'e', 'f', '' ], 'string', true ],
                [ '/thedata/nodeA', 0, null, 'val12', 'string', true ],
                [ '/thedata/nodeA', 0, null, '14', 'string', true ],
                [ '/thedata/nodeA', 0, null, 1, 'string', true ],

                [ '/thedata/nodeA', null, null, 'val11', 'decimal', false ],

                [ '/thedata/nodeA', null, null, 'val4', 'int', false ],
                [ '/thedata/nodeA', 0, null, '2', 'int', true ],
                [ '/thedata/nodeA', 0, null, 3, 'int', true ],
                [ '/thedata/nodeA', 0, null, '2.', 'int', false ],
                [ '/thedata/nodeA', 0, null, '2.0', 'int', false ],

                [ '/thedata/nodeA', null, null, 'val5565ghgyuyuy', 'date', false ], //Chrome turns val5 into a valid date...
                [ '/thedata/nodeA', null, null, '2012-01-01', 'date', true ],
                [ '/thedata/nodeA', null, null, '2012-12-32', 'date', false ],
                //['/thedata/nodeA', null, null, 324, 'date', true], //fails in phantomjs

                [ '/thedata/nodeA', null, null, 'val5565ghgyuyua', 'datetime', false ], //Chrome turns val10 into a valid date..
                [ '/thedata/nodeA', null, null, '2012-01-01T00:00:00-06', 'datetime', true ],
                [ '/thedata/nodeA', null, null, '2012-12-32T00:00:00-06', 'datetime', false ],
                [ '/thedata/nodeA', null, null, '2012-12-31T23:59:59-06', 'datetime', true ],
                [ '/thedata/nodeA', null, null, '2012-12-31T23:59:59-06:30', 'datetime', true ],
                [ '/thedata/nodeA', null, null, '2012-12-31T23:59:59Z', 'datetime', true ],
                [ '/thedata/nodeA', null, null, '2012-01-01T30:00:00-06', 'datetime', false ],
                //['/thedata/nodeA', null, null, '2013-05-31T07:00-02', 'datetime', true],fails in phantomJSs

                [ '/thedata/nodeA', null, null, 'a', 'time', false ],
                [ '/thedata/nodeA', null, null, 'aa:bb', 'time', false ],
                [ '/thedata/nodeA', null, null, '0:0', 'time', true ],
                [ '/thedata/nodeA', null, null, '00:00', 'time', true ],
                [ '/thedata/nodeA', null, null, '23:59', 'time', true ],
                [ '/thedata/nodeA', null, null, '23:59:59', 'time', true ],
                [ '/thedata/nodeA', null, null, '24:00', 'time', false ],
                [ '/thedata/nodeA', null, null, '00:60', 'time', false ],
                [ '/thedata/nodeA', null, null, '00:00:60', 'time', false ],
                [ '/thedata/nodeA', null, null, '-01:00', 'time', false ],
                [ '/thedata/nodeA', null, null, '00:-01', 'time', false ],
                [ '/thedata/nodeA', null, null, '00:00:-01', 'time', false ],
                [ '/thedata/nodeA', null, null, '13:17:00.000-07', 'time', true ],

                [ '/thedata/nodeA', null, null, 'val2', 'barcode', true ],

                [ '/thedata/nodeA', null, null, '0 0 0 0', 'geopoint', true ],
                [ '/thedata/nodeA', null, null, '10 10', 'geopoint', true ],
                [ '/thedata/nodeA', null, null, '10 10 10', 'geopoint', true ],
                [ '/thedata/nodeA', null, null, '-90 -180', 'geopoint', true ],
                [ '/thedata/nodeA', null, null, '90 180', 'geopoint', true ],
                [ '/thedata/nodeA', null, null, '-91 -180', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '-90 -181', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '91 180', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '90 -181', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, 'a -180', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '0 a', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '0', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '0 0 a', 'geopoint', false ],
                [ '/thedata/nodeA', null, null, '0 0 0 a', 'geopoint', false ],

                [ '/thedata/nodeA', null, null, 'NaN', 'int', null ], //value remains "" so null 
                [ '/thedata/nodeA', null, null, 'NaN', 'decimal', null ] //value remains "" so null

                //TO DO binary (?)
            ];

        function test( n ) {
            it( 'converts and validates xml-type ' + n.type + ' with value: ' + n.value, function() {
                data = getModel( 'thedata.xml' ); //dataStr1);
                expect( data.node( n.selector, n.index, n.filter ).setVal( n.value, null, n.type ) ).toEqual( n.result );
            } );
        }

        for ( i = 0; i < t.length; i++ ) {
            test( {
                selector: t[ i ][ 0 ],
                index: t[ i ][ 1 ],
                filter: t[ i ][ 2 ],
                value: t[ i ][ 3 ],
                type: t[ i ][ 4 ],
                result: t[ i ][ 5 ]
            } );
        }

        it( 'converts NaN to "" (quietly) for nodes with type=int', function() {
            var result,
                node = getModel( 'thedata.xml' ).node( '/thedata/nodeA' );
            // prime the node with a value
            node.setVal( 5, null, 'int' );
            expect( node.getVal() ).toEqual( [ '5' ] );
            // attempt to set the value to NaN
            result = node.setVal( 'NaN', null, 'int' );
            expect( result ).toEqual( true );
            expect( node.getVal() ).toEqual( [ '' ] );
        } );

        it( 'converts NaN to "" (quietly) for nodes with type=decimal', function() {
            var result,
                node = getModel( 'thedata.xml' ).node( '/thedata/nodeA' );
            // prime the node with a value
            node.setVal( 5.1, null, 'decimal' );
            expect( node.getVal() ).toEqual( [ '5.1' ] );
            // attempt to set the value to NaN
            result = node.setVal( 'NaN', null, 'decimal' );
            expect( result ).toEqual( true );
            expect( node.getVal() ).toEqual( [ '' ] );
        } );

        it( 'sets a non-empty value to empty', function() {
            var node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
            node.setVal( 'value', null, 'string' );
            expect( node.setVal( '' ) ).toBe( true );
        } );

        it( 'adds a file attribute to data nodes with a value and with xml-type: binary', function() {
            var node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
            expect( node.get().attr( 'type' ) ).toBe( undefined );
            node.setVal( 'this.jpg', null, 'binary' );
            expect( node.get().attr( 'type' ) ).toBe( 'file' );
        } );

        it( 'removes a file attribute from EMPTY data nodes with xml-type: binary', function() {
            var node = getModel( 'thedata.xml' ).node( '/thedata/nodeA', null, null );
            node.setVal( 'this.jpg', null, 'binary' );
            expect( node.get().attr( 'type' ) ).toBe( 'file' );
            node.setVal( '', null, 'binary' );
            expect( node.get().attr( 'type' ) ).toBe( undefined );
        } );

    } );

    describe( 'Data node remover', function() {
        it( 'has removed a data node', function() {
            var data = getModel( 'thedata.xml' ),
                node = data.node( '/thedata/nodeA' );

            expect( node.get().length ).toEqual( 1 );
            /*data.node( '/thedata/nodeA' )*/
            node.remove();
            expect( node.get().length ).toEqual( 0 );
            expect( data.node( '/thedata/nodeA' ).get().length ).toEqual( 0 );
        } );
    } );

    describe( 'XPath Evaluator (see github.com/MartijnR/xpathjs_javarosa for comprehensive tests!)', function() {
        var i, t = [
                [ '/thedata/nodeB', 'string', null, 0, 'b' ],
                [ '../nodeB', 'string', '/thedata/nodeA', 0, 'b' ],
                [ '/thedata/nodeB', 'boolean', null, 0, true ],
                [ '/thedata/notexist', 'boolean', null, 0, false ],
                [ '/thedata/repeatGroup[2]/nodeC', 'string', null, 0, 'c2' ],
                [ '/thedata/repeatGroup[position()=3]/nodeC', 'string', null, 0, 'c3' ],
                [ 'coalesce(/thedata/nodeA, /thedata/nodeB)', 'string', null, 0, 'b' ],
                [ 'coalesce(/thedata/nodeB, /thedata/nodeA)', 'string', null, 0, 'b' ],
                [ 'weighted-checklist(3, 3, /thedata/somenodes/A, /thedata/someweights/w2)', 'boolean', null, 0, true ],
                [ 'weighted-checklist(9, 9, /thedata/somenodes/*, /thedata/someweights/*)', 'boolean', null, 0, true ]
            ],
            data = getModel( 'thedata.xml' );

        function test( expr, resultType, contextSelector, index, result ) {
            it( 'evaluates XPath: ' + expr, function() {
                expect( data.evaluate( expr, resultType, contextSelector, index ) ).toEqual( result );
            } );
        }

        for ( i = 0; i < t.length; i++ ) {
            test( String( t[ i ][ 0 ] ), t[ i ][ 1 ], t[ i ][ 2 ], t[ i ][ 3 ], t[ i ][ 4 ] );
        }

        // this tests the makeBugCompliant() workaround that injects a position into an absolute path
        // for the issue described here: https://bitbucket.org/javarosa/javarosa/wiki/XFormDeviations
        it( 'evaluates a repaired absolute XPath inside a repeat (makeBugCompliant())', function() {
            //data = getModel( 'thedata.xml' ); //new Form(formStr1, dataStr1);

            expect( data.evaluate( '/thedata/repeatGroup/nodeC', 'string', '/thedata/repeatGroup/nodeC', 2 ) ).toEqual( 'c3' );
        } );

        it( 'is able to address a secondary instance by id with the instance(id)/path/to/node syntax', function() {
            var dataO = getModel( 'new_cascading_selections.xml' );
            expect( dataO.evaluate( 'instance("cities")/root/item/name', 'string' ) ).toEqual( 'ams' );
            expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4]/name', 'string' ) ).toEqual( 'den' );
            expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4 and 1<2]', 'nodes' ).length ).toEqual( 3 );
            expect( dataO.evaluate( 'instance("cities")/root/item[country=/new_cascading_selections/group4/country4 and name=/new_cascading_selections/group4/city4]', 'nodes' ).length ).toEqual( 1 );
        } );
    } );

    describe( 'functionality to obtain string of the primary XML instance for storage or uploads)', function() {
        it( 'returns primary instance without templates - A', function() {
            var model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><data><group jr:template=""><a/></group></data></instance></model>' );
            model.init();
            expect( model.getStr() ).toEqual( '<data><group><a/></group></data>' );
        } );

        it( 'returns primary instance without templates - B', function() {
            var model = new Model( '<model><instance><data><group    template=""><a/></group></data></instance></model>' );
            model.init();
            expect( model.getStr() ).toEqual( '<data><group><a/></group></data>' );
        } );

        it( 'returns primary instance and leaves namespaces intact', function() {
            var model = new Model( '<model><instance><data xmlns="https://some.namespace.com/"><a/></data></instance></model>' );
            model.init();
            expect( model.getStr() ).toEqual( '<data xmlns="https://some.namespace.com/"><a/></data>' );
        } );
    } );

    describe( 'converting absolute paths', function() {
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

            // to leave unchanged
            [ 'path/to/node' ],
            [ 'concat(path/to/node, "2")' ],
            [ '../path/to/node' + '../node' ],
            [ '/model/path/to/node' ]

        ].forEach( function( test ) {
            it( 'converts correctly when the model and instance node are included in the model', function() {
                var model = new Model( '<model><instance/></model>' );
                var expected = test[ 1 ] || test[ 0 ];
                model.init();
                expect( model.shiftRoot( test[ 0 ] ) ).toEqual( expected );
            } );
            it( 'does nothing if model and instance node are absent in the model', function() {
                var model = new Model( '<data><nodeA/></data>' );
                expect( model.shiftRoot( test[ 0 ] ) ).toEqual( test[ 0 ] );
            } );
        } );
    } );

    describe( 'converting instance("id") to absolute paths', function() {
        [
            [ 'instance("a")/path/to/node', '/model/instance[@id="a"]/path/to/node' ]

        ].forEach( function( test ) {
            it( 'happens correctly', function() {
                var model = new Model( '<model><instance/></model>' );
                var expected = test[ 1 ];
                model.init();
                expect( model.replaceInstanceFn( test[ 0 ] ) ).toEqual( expected );
            } );
        } );
    } );

    describe( 'converting expressions with current()', function() {
        [
            [ 'instance("a")/path/to/node[current()/.. = /path/to/value]', 'instance("a")/path/to/node[.. = /path/to/value]' ],
            [ 'instance("a")/path/to/node[current()/. = /path/to/value]', 'instance("a")/path/to/node[. = /path/to/value]' ],
            [ 'instance("a")/path/to/node[current()/path/to/wut = /path/to/value]', 'instance("a")/path/to/node[/path/to/wut = /path/to/value]' ]

        ].forEach( function( test ) {
            it( 'happens correctly', function() {
                var model = new Model( '<model><instance/></model>' );
                var expected = test[ 1 ];
                model.init();
                expect( model.replaceCurrentFn( test[ 0 ] ) ).toEqual( expected );
            } );
        } );
    } );

    describe( 'converting indexed-repeat() ', function() {
        [
            [ 'indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2)', '/path/to/repeat[position() = 2]/node' ],
            [ ' indexed-repeat( /path/to/repeat/node , /path/to/repeat , 2 )', ' /path/to/repeat[position() = 2]/node' ],
            [ '1 + indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2)', '1 + /path/to/repeat[position() = 2]/node' ],
            [ 'concat(indexed-repeat(/path/to/repeat/node, /path/to/repeat, 2), "fluff")', 'concat(/path/to/repeat[position() = 2]/node, "fluff")' ],
            [ 'indexed-repeat(/p/t/r/ar/node, /p/t/r, 2, /p/t/r/ar, 3 )', '/p/t/r[position() = 2]/ar[position() = 3]/node' ]
        ].forEach( function( test ) {
            it( 'works, with a number as 3rd (5th, 7th) parameter', function() {
                var model = new Model( '<model><instance/></model>' );
                var expected = test[ 1 ];
                model.init();
                expect( model.replaceIndexedRepeatFn( test[ 0 ] ) ).toEqual( expected );
            } );
        } );

        [
            [ 'indexed-repeat( /p/t/r/node,  /p/t/r , position(..)    )', '/p/t/r[position() = 3]/node' ],
            [ 'indexed-repeat( /p/t/r/node,  /p/t/r , position(..) - 1)', '/p/t/r[position() = 2]/node' ],
        ].forEach( function( test ) {
            it( 'works, with an expresssion as 3rd (5th, 7th) parameter', function() {
                var model = new Model( '<model><instance><p><t><r><node/></r><r><node/></r><r><node/></r></t></p></instance></model>' );
                var expected = test[ 1 ];
                model.init();
                expect( model.replaceIndexedRepeatFn( test[ 0 ], '/p/t/r/node', 2 ) ).toEqual( expected );
            } );
        } );
    } );

    describe( 'external instances functionality', function() {
        var loadErrors, model,
            modelStr = '<model><instance><cascade_external id="cascade_external" version=""><country/><city/><neighborhood/><meta><instanceID/></meta></cascade_external></instance><instance id="cities" src="jr://file/cities.xml" /><instance id="neighborhoods" src="jr://file/neighbourhoods.xml" /><instance id="countries" src="jr://file/countries.xml" /></model>',
            citiesStr = '<root><item><itextId>static_instance-cities-0</itextId><country>nl</country><name>ams</name></item></root>';

        it( 'outputs errors if external instances in the model are not provided upon instantiation', function() {
            model = new Model( modelStr );
            loadErrors = model.init();
            expect( loadErrors.length ).toEqual( 3 );
            expect( loadErrors[ 0 ] ).toEqual( 'External instance "cities" is empty.' );
            expect( loadErrors[ 1 ] ).toEqual( 'External instance "neighborhoods" is empty.' );
            expect( loadErrors[ 2 ] ).toEqual( 'External instance "countries" is empty.' );
        } );

        it( 'populates matching external instances', function() {
            model = new Model( {
                modelStr: modelStr,
                external: [ {
                    id: 'cities',
                    xmlStr: citiesStr
                }, {
                    id: 'neighborhoods',
                    xmlStr: '<root/>'
                }, {
                    id: 'countries',
                    xmlStr: '<root/>'
                } ]
            } );
            loadErrors = model.init();
            expect( loadErrors.length ).toEqual( 0 );
            expect( model.$.find( 'instance#cities > root > item > country:eq(0)' ).text() ).toEqual( 'nl' );
        } );

        it( 'outputs errors if an external instance is not valid XML', function() {
            model = new Model( {
                modelStr: modelStr,
                external: [ {
                    id: 'cities',
                    xmlStr: '<root>'
                }, {
                    id: 'neighborhoods',
                    xmlStr: '<root/>'
                }, {
                    id: 'countries',
                    xmlStr: '<root/>'
                } ]
            } );
            loadErrors = model.init();
            expect( loadErrors.length ).toEqual( 4 );
            expect( loadErrors[ 0 ] ).toEqual( 'Error trying to parse XML instance "cities". Invalid XML: <root>' );
        } );
    } );

    describe( 'getting templates', function() {
        var model = new Model( '<model></model>' );
        model.templates = {
            '/path/to/some/repeat/template': 'a template'
        };

        it( 'works for the exact path to the repeat', function() {
            expect( model.getTemplatePath( '/path/to/some/repeat/template' ) ).toEqual( '/path/to/some/repeat/template' );
        } );

        it( 'works for a child node of the template', function() {
            expect( model.getTemplatePath( '/path/to/some/repeat/template/group/leaf' ) ).toEqual( '/path/to/some/repeat/template' );
        } );

        it( 'returns undefined when template is not available', function() {
            expect( model.getTemplatePath( '/path' ) ).not.toBeDefined();
        } );
    } );

    describe( 'auto-cloning repeats in empty model', function() {
        var model = new Model( '<model xmlns:jr="http://openrosa.org/javarosa"><instance><data><rep1 jr:template=""><one/><rep2 jr:template=""><two/>' +
            '<rep3 jr:template=""><three/></rep3></rep2></rep1></data></instance></model>' );
        model.init();

        it( 'works for nested repeats', function() {
            expect( model.getStr() ).toEqual( '<data><rep1><one/><rep2><two/><rep3><three/></rep3></rep2></rep1></data>' );
        } );

    } );

    describe( 'Using XPath with default namespace', function() {

        describe( 'on the primary instance child', function() {
            var model = new Model( '<model><instance><data xmlns="http://unknown.namespace.com/34324sdagd"><nodeA>5</nodeA></data></instance></model>' );

            model.init();

            it( 'works for Nodeset().get()', function() {
                expect( model.node( '/data/nodeA' ).get().length ).toEqual( 1 );
                expect( model.node( '/data/nodeA' ).getVal()[ 0 ] ).toEqual( '5' );
            } );

            it( 'works for evaluate()', function() {
                expect( model.evaluate( '/data/nodeA', 'nodes' ).length ).toEqual( 1 );
                expect( model.evaluate( '/data/nodeA', 'string' ) ).toEqual( '5' );
            } );

        } );

        describe( ' on the model', function() {
            var model = new Model( '<model xmlns="http://www.w3.org/2002/xforms"><instance><data><nodeA>5</nodeA></data></instance></model>' );

            model.init();

            it( 'works for Nodeset().get()', function() {
                expect( model.node( '/data/nodeA' ).get().length ).toEqual( 1 );
                expect( model.node( '/data/nodeA' ).getVal()[ 0 ] ).toEqual( '5' );
            } );

            it( 'works for evaluate()', function() {
                expect( model.evaluate( '/data/nodeA', 'nodes' ).length ).toEqual( 1 );
                expect( model.evaluate( '/data/nodeA', 'string' ) ).toEqual( '5' );
            } );

        } );

    } );

} );
