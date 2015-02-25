if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ "enketo-js/FormModel" ], function( Model ) {

    var getModel = function( filename ) {
        return new Model( mockForms1[ filename ].xml_model );
    };

    describe( "Data node getter", function() {
        var i, t =
            [
                [ "", null, null, 20 ],
                [ "", null, {},
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
                        noTemplate: true
                    },
                    20
                ],
                [ null, null, {
                        noTemplate: false
                    },
                    22
                ],
                [ null, null, {
                        onlyTemplate: true
                    },
                    1
                ],
                [ null, null, {
                        noEmpty: true
                    },
                    9 //when tested outside Form class, instanceID is not populated
                ],
                [ null, null, {
                        noEmpty: true,
                        noTemplate: false
                    },
                    10 //when tested outside Form class, instanceID is not populated
                ],
                [ "/thedata/nodeA", null, null, 1 ],
                [ "/thedata/nodeA", 1, null, 0 ],
                [ "/thedata/nodeA", null, {
                        noEmpty: true
                    },
                    0
                ], //"int"
                [ "/thedata/nodeA", null, {
                        onlyleaf: true
                    },
                    1
                ],
                [ "/thedata/nodeA", null, {
                        onlyTemplate: true
                    },
                    0
                ],
                [ "/thedata/nodeA", null, {
                        noTemplate: true
                    },
                    1
                ],
                [ "/thedata/nodeA", null, {
                        noTemplate: false
                    },
                    1
                ],
                [ "/thedata/repeatGroup", null, null, 3 ],
                [ "/thedata/repeatGroup", null, {
                        onlyTemplate: true
                    },
                    1
                ],
                [ "/thedata/repeatGroup", null, {
                        noTemplate: false
                    },
                    4
                ],
                [ "//nodeC", null, null, 3 ],
                [ "/thedata/repeatGroup/nodeC", null, null, 3 ],
                [ "/thedata/repeatGroup/nodeC", 2, null, 1 ],
                [ "/thedata/repeatGroup/nodeC", null, {
                        noEmpty: true
                    },
                    2
                ],
                [ "/thedata/repeatGroup/nodeC", null, {
                        onlyleaf: true
                    },
                    3
                ],
                [ "/thedata/repeatGroup/nodeC", null, {
                        onlyTemplate: true
                    },
                    0
                ],
                [ "/thedata/repeatGroup/nodeC", null, {
                        noTemplate: true
                    },
                    3
                ],
                [ "/thedata/repeatGroup/nodeC", null, {
                        noTemplate: false
                    },
                    4
                ]
            ],
            data = getModel( 'thedata.xml' ); //form.Data(dataStr1);

        function test( node ) {
            it( "obtains nodes (selector: " + node.selector + ", index: " + node.index + ", filter: " + JSON.stringify( node.filter ) + ")", function() {
                expect( data.node( node.selector, node.index, node.filter ).get().length ).toEqual( node.result );
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
            expect( data.node( "/thedata/nodeB" ).getVal() ).toEqual( [ 'b' ] );
        } );

        it( 'returns an array of multiple node values', function() {
            expect( data.node( "/thedata/repeatGroup/nodeC" ).getVal() ).toEqual( [ '', 'c2', 'c3' ] );
        } );

        it( 'returns an empty array', function() {
            expect( data.node( "/thedata/nodeX" ).getVal() ).toEqual( [] );
        } );

        it( 'obtains a node value of a node with a . in the name', function() {
            expect( data.node( "/thedata/someweights/w.3" ).getVal() ).toEqual( [ '5' ] );
        } );
    } );

    describe( 'Data node XML data type conversion & validation', function() {
        var i, data,
            t = [
                [ "/thedata/nodeA", null, null, 'val1', null, true ],
                [ "/thedata/nodeA", null, null, 'val3', 'somewrongtype', true ], //default type is string

                [ "/thedata/nodeA", 1, null, 'val13', 'string', null ], //non-existing node
                [ "/thedata/repeatGroup/nodeC", null, null, 'val', null ], //multiple nodes

                [ "/thedata/nodeA", 0, null, '4', 'double', true ], //double is a non-existing xml data type so turned into string
                [ "/thedata/nodeA", 0, null, 5, 'double', true ],

                [ "/thedata/nodeA", null, null, 'val2', 'string', true ],
                [ "/thedata/nodeA", 0, null, [ 'a', 'b', 'c' ], 'string', true ],
                [ "/thedata/nodeA", 0, null, [ 'd', 'e', 'f', '' ], 'string', true ],
                [ "/thedata/nodeA", 0, null, 'val12', 'string', true ],
                [ "/thedata/nodeA", 0, null, '14', 'string', true ],
                [ "/thedata/nodeA", 0, null, 1, 'string', true ],

                [ "/thedata/nodeA", null, null, 'val11', 'decimal', false ],

                [ "/thedata/nodeA", null, null, 'val4', 'int', false ],
                [ "/thedata/nodeA", 0, null, '2', 'int', true ],
                [ "/thedata/nodeA", 0, null, 3, 'int', true ],
                [ "/thedata/nodeA", 0, null, '2.', 'int', false ],
                [ "/thedata/nodeA", 0, null, '2.0', 'int', false ],

                [ "/thedata/nodeA", null, null, 'val5565ghgyuyuy', 'date', false ], //Chrome turns val5 into a valid date...
                [ "/thedata/nodeA", null, null, '2012-01-01', 'date', true ],
                [ "/thedata/nodeA", null, null, '2012-12-32', 'date', false ],
                //["/thedata/nodeA", null, null, 324, 'date', true], //fails in phantomjs

                [ "/thedata/nodeA", null, null, 'val5565ghgyuyua', 'datetime', false ], //Chrome turns val10 into a valid date..
                [ "/thedata/nodeA", null, null, '2012-01-01T00:00:00-06', 'datetime', true ],
                [ "/thedata/nodeA", null, null, '2012-12-32T00:00:00-06', 'datetime', false ],
                [ "/thedata/nodeA", null, null, '2012-12-31T23:59:59-06', 'datetime', true ],
                [ "/thedata/nodeA", null, null, '2012-12-31T23:59:59-06:30', 'datetime', true ],
                [ "/thedata/nodeA", null, null, '2012-12-31T23:59:59Z', 'datetime', true ],
                [ "/thedata/nodeA", null, null, '2012-01-01T30:00:00-06', 'datetime', false ],
                //["/thedata/nodeA", null, null, '2013-05-31T07:00-02', 'datetime', true],fails in phantomJSs

                [ "/thedata/nodeA", null, null, 'a', 'time', false ],
                [ "/thedata/nodeA", null, null, 'aa:bb', 'time', false ],
                [ "/thedata/nodeA", null, null, '0:0', 'time', true ],
                [ "/thedata/nodeA", null, null, '00:00', 'time', true ],
                [ "/thedata/nodeA", null, null, '23:59', 'time', true ],
                [ "/thedata/nodeA", null, null, '23:59:59', 'time', true ],
                [ "/thedata/nodeA", null, null, '24:00', 'time', false ],
                [ "/thedata/nodeA", null, null, '00:60', 'time', false ],
                [ "/thedata/nodeA", null, null, '00:00:60', 'time', false ],
                [ "/thedata/nodeA", null, null, '-01:00', 'time', false ],
                [ "/thedata/nodeA", null, null, '00:-01', 'time', false ],
                [ "/thedata/nodeA", null, null, '00:00:-01', 'time', false ],
                [ "/thedata/nodeA", null, null, '13:17:00.000-07', 'time', true ],

                [ "/thedata/nodeA", null, null, 'val2', 'barcode', true ],

                [ "/thedata/nodeA", null, null, '0 0 0 0', 'geopoint', true ],
                [ "/thedata/nodeA", null, null, '10 10', 'geopoint', true ],
                [ "/thedata/nodeA", null, null, '10 10 10', 'geopoint', true ],
                [ "/thedata/nodeA", null, null, '-90 -180', 'geopoint', true ],
                [ "/thedata/nodeA", null, null, '90 180', 'geopoint', true ],
                [ "/thedata/nodeA", null, null, '-91 -180', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '-90 -181', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '91 180', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '90 -181', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, 'a -180', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '0 a', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '0', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '0 0 a', 'geopoint', false ],
                [ "/thedata/nodeA", null, null, '0 0 0 a', 'geopoint', false ],

                [ "/thedata/nodeA", null, null, 'NaN', 'int', null ], //value remains "" so null 
                [ "/thedata/nodeA", null, null, 'NaN', 'decimal', null ] //value remains "" so null

                //TO DO binary (?)
            ];

        function test( n ) {
            it( "converts and validates xml-type " + n.type + " with value: " + n.value, function() {
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

    describe( "Data node cloner", function() {
        it( "has cloned a data node", function() {
            var data = getModel( 'thedata.xml' ),
                node = data.node( "/thedata/nodeA" ),
                $precedingTarget = data.node( "/thedata/repeatGroup/nodeC", 0 ).get();

            expect( data.node( '/thedata/repeatGroup/nodeA', 0 ).get().length ).toEqual( 0 );
            node.clone( $precedingTarget );
            expect( data.node( '/thedata/repeatGroup/nodeA', 0 ).get().length ).toEqual( 1 );
        } );
    } );

    describe( "Data node remover", function() {
        it( "has removed a data node", function() {
            var data = getModel( 'thedata.xml' ),
                node = data.node( "/thedata/nodeA" );

            expect( node.get().length ).toEqual( 1 );
            data.node( "/thedata/nodeA" ).remove();
            expect( node.get().length ).toEqual( 0 );
        } );
    } );

    describe( "XPath Evaluator (see github.com/MartijnR/xpathjs_javarosa for comprehensive tests!)", function() {
        var i, t = [
                [ "/thedata/nodeB", "string", null, 0, "b" ],
                [ "../nodeB", "string", "/thedata/nodeA", 0, "b" ],
                [ "/thedata/nodeB", "boolean", null, 0, true ],
                [ "/thedata/notexist", "boolean", null, 0, false ],
                [ "/thedata/repeatGroup[2]/nodeC", "string", null, 0, "c2" ],
                [ '/thedata/repeatGroup[position()=3]/nodeC', 'string', null, 0, 'c3' ],
                [ 'coalesce(/thedata/nodeA, /thedata/nodeB)', 'string', null, 0, 'b' ],
                [ 'coalesce(/thedata/nodeB, /thedata/nodeA)', 'string', null, 0, 'b' ],
                [ 'weighted-checklist(3, 3, /thedata/somenodes/A, /thedata/someweights/w2)', 'boolean', null, 0, true ],
                [ 'weighted-checklist(9, 9, /thedata/somenodes/*, /thedata/someweights/*)', 'boolean', null, 0, true ]
            ],
            data = getModel( 'thedata.xml' );

        function test( expr, resultType, contextSelector, index, result ) {
            it( "evaluates XPath: " + expr, function() {
                expect( data.evaluate( expr, resultType, contextSelector, index ) ).toEqual( result );
            } );
        }

        for ( i = 0; i < t.length; i++ ) {
            test( String( t[ i ][ 0 ] ), t[ i ][ 1 ], t[ i ][ 2 ], t[ i ][ 3 ], t[ i ][ 4 ] );
        }

        // this tests the makeBugCompliant() workaround that injects a position into an absolute path
        // for the issue described here: https://bitbucket.org/javarosa/javarosa/wiki/XFormDeviations
        it( "evaluates a repaired absolute XPath inside a repeat (makeBugCompliant())", function() {
            //data = getModel( 'thedata.xml' ); //new Form(formStr1, dataStr1);

            expect( data.evaluate( "/thedata/repeatGroup/nodeC", "string", "/thedata/repeatGroup/nodeC", 2 ) ).toEqual( "c3" );
        } );

        it( 'is able to address a secondary instance by id with the instance(id)/path/to/node syntax', function() {
            var dataO = getModel( 'new_cascading_selections.xml' );
            expect( dataO.evaluate( "instance('cities')/root/item/name", "string" ) ).toEqual( 'ams' );
            expect( dataO.evaluate( "instance('cities')/root/item[country=/new_cascading_selections/group4/country4]/name", "string" ) ).toEqual( 'den' );
            expect( dataO.evaluate( "instance('cities')/root/item[country=/new_cascading_selections/group4/country4 and 1<2]", "nodes" ).length ).toEqual( 3 );
            expect( dataO.evaluate( "instance('cities')/root/item[country=/new_cascading_selections/group4/country4 and name=/new_cascading_selections/group4/city4]", "nodes" ).length ).toEqual( 1 );
        } );
    } );


    describe( 'functionality to obtain string of the XML instance (DataXML.getStr() for storage or uploads)', function() {
        var str1, str2, str3, str4, str5, str6, str7, str8, str9, str10, str11, str12,
            modelA = getModel( 'new_cascading_selections.xml' ),
            modelB = getModel( 'thedata.xml' );
        modelA.init();
        modelB.init();
        str1 = modelA.getStr();
        str2 = modelA.getStr( null, null );
        str3 = modelA.getStr( false, false );
        str4 = modelA.getStr( true, false );
        str5 = modelA.getStr( false, true );
        str6 = modelA.getStr( true, true );
        str7 = modelA.getStr( true, true, false );
        str8 = modelA.getStr( null, null, true );
        str9 = modelA.getStr( true, true, true );

        str10 = modelB.getStr();
        str11 = modelB.getStr( true );
        str12 = modelB.getStr( false, false, true );

        testModelPresent = function( str ) {
            return isValidXML( str ) && new RegExp( /^<model/g ).test( str );
        };
        testInstancePresent = function( str ) {
            return isValidXML( str ) && new RegExp( /<instance[\s|>]/g ).test( str );
        };
        testInstanceNumber = function( str ) {
            return str.match( /<instance[\s|>]/g ).length;
        };
        //testNamespacePresent = function(str){return isValidXML(str) && new RegExp(/xmlns=/).test(str);};
        testTemplatePresent = function( str ) {
            return isValidXML( str ) && new RegExp( /template=/ ).test( str );
        };
        isValidXML = function( str ) {
            var $xml;
            try {
                $xml = $.parseXML( str );
            } catch ( e ) {}
            return typeof $xml === 'object';
        };

        it( 'returns a string of the primary instance only when called without 3rd parameter: true', function() {
            expect( testModelPresent( str1 ) ).toBe( false );
            expect( testInstancePresent( str1 ) ).toBe( false );
            expect( testModelPresent( str2 ) ).toBe( false );
            expect( testInstancePresent( str2 ) ).toBe( false );
            expect( testModelPresent( str3 ) ).toBe( false );
            expect( testInstancePresent( str3 ) ).toBe( false );
            expect( testModelPresent( str4 ) ).toBe( false );
            expect( testInstancePresent( str4 ) ).toBe( false );
            expect( testModelPresent( str5 ) ).toBe( false );
            expect( testInstancePresent( str5 ) ).toBe( false );
            expect( testModelPresent( str6 ) ).toBe( false );
            expect( testInstancePresent( str6 ) ).toBe( false );
            expect( testModelPresent( str7 ) ).toBe( false );
            expect( testInstancePresent( str7 ) ).toBe( false );
        } );

        it( 'returns a string of the model and all instances when called with 3rd parameter: true', function() {
            expect( testModelPresent( str8 ) ).toBe( true );
            expect( testInstancePresent( str8 ) ).toBe( true );
            expect( testInstanceNumber( str8 ) ).toBe( 4 );
            expect( testModelPresent( str9 ) ).toBe( true );
            expect( testInstancePresent( str9 ) ).toBe( true );
            expect( testInstanceNumber( str9 ) ).toBe( 4 );
            expect( testInstancePresent( str12 ) ).toBe( true );
            expect( testInstanceNumber( str12 ) ).toBe( 1 );
        } );

        it( 'returns a string with repeat templates included when called with 1st parameter: true', function() {
            expect( testTemplatePresent( str10 ) ).toBe( false );
            expect( testTemplatePresent( str11 ) ).toBe( true );
        } );

    } );

    describe( 'output data functionality', function() {
        var model;

        it( 'outputs a clone of the primary instance first child as a jQuery object if the object is wrapped inside <instance> and <model>', function() {
            model = new Model( '<model><instance><node/></instance><instance id="secondary"><secondary/></instance></model>' );
            expect( model.getInstanceClone().length ).toEqual( 1 );
            expect( model.getInstanceClone().prop( 'nodeName' ) ).toEqual( 'node' );
        } );

        it( 'outputs a clone of the first node as a jQuery object if the object is NOT wrapped inside <instance> and <model>', function() {
            model = new Model( '<node/>' );
            expect( model.getInstanceClone().length ).toEqual( 1 );
            expect( model.getInstanceClone().prop( 'nodeName' ) ).toEqual( 'node' );
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
            model = new Model( modelStr, [ {
                id: 'cities',
                xmlStr: citiesStr
            }, {
                id: 'neighborhoods',
                xmlStr: '<root/>'
            }, {
                id: 'countries',
                xmlStr: '<root/>'
            } ] );
            loadErrors = model.init();
            expect( loadErrors.length ).toEqual( 0 );
            expect( model.$.find( 'instance#cities > root > item > country:eq(0)' ).text() ).toEqual( 'nl' );
        } );

        it( 'outputs errors if an external instance is not valid XML', function() {
            model = new Model( modelStr, [ {
                id: 'cities',
                xmlStr: '<root>'
            }, {
                id: 'neighborhoods',
                xmlStr: '<root/>'
            }, {
                id: 'countries',
                xmlStr: '<root/>'
            } ] );
            loadErrors = model.init();
            expect( loadErrors.length ).toEqual( 4 );
            expect( loadErrors[ 0 ] ).toEqual( 'Error trying to parse XML instance "cities".' );
        } );
    } );

} );
