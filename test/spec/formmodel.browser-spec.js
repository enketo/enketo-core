if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

/*
 * In a future version of PhantomJS with DOMParser support for XML Documents, these tests can move to the regular spec.
 */

define( [ 'enketo-js/FormModel' ], function( Model ) {

    describe( 'merging an instance into the model', function() {

        describe( '', function() {
            [
                // partial record, empty
                [ '<a><b/></a>', '<model><instance><a><b/><c/></a></instance></model>', '<model><instance><a><b/><c/></a></instance></model>' ],
                // record value overrides model (default) value
                [ '<a><b>record</b></a>', '<model><instance><a><b>model</b></a></instance></model>', '<model><instance><a><b>record</b></a></instance></model>' ],
                // preserve non-alphabetic document order of model
                [ '<a><c/></a>', '<model><instance><a><c/><b/></a></instance></model>', '<model><instance><a><c/><b/></a></instance></model>' ],
                // repeated nodes in record get added (including repeat childnodes that are missing from record)
                [ '<a><c><d>record</d></c><c/></a>', '<model><instance><a><c><d>model</d></c></a></instance></model>',
                    '<model><instance><a><c><d>record</d></c><c><d/></c></a></instance></model>'
                ],
                // repeated nodes in record get added in the right order
                [ '<a><r/><r/></a>', '<model><instance><a><r/><meta/></a></instance></model>', '<model><instance><a><r/><r/><meta/></a></instance></model>' ],
                // repeated groups with missing template nodes in record get added
                [ '<a><r/><r/></a>', '<model><instance><a><r><b/></r><meta/></a></instance></model>', '<model><instance><a><r><b/></r><r><b/></r><meta/></a></instance></model>' ],
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
                ]
            ].forEach( function( test ) {
                var result, expected,
                    model = new Model( {
                        modelStr: test[ 1 ]
                    } );

                model.init();
                model.mergeXml( test[ 0 ] );

                result = ( new XMLSerializer() ).serializeToString( model.xml, 'text/xml' ).replace( /\n/g, '' );;
                expected = test[ 2 ];

                it( 'produces the expected result for instance: ' + test[ 0 ], function() {
                    expect( result ).toEqual( expected );
                } );
            } );
        } );

        describe( 'when a deprecatedID node is not present in the form format', function() {
            var model = new Model( {
                modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/></meta></thedata></instance></model>',
                instanceStr: '<thedata id="thedata"><meta><instanceID>7c990ed9-8aab-42ba-84f5-bf23277154ad</instanceID></meta><nodeA>2012</nodeA></thedata>'
            } );

            var loadErrors = model.init();

            it( 'outputs no load errors', function() {
                expect( loadErrors.length ).toEqual( 0 );
            } );

            it( 'adds a deprecatedID node', function() {
                expect( model.node( '/thedata/meta/deprecatedID' ).get().length ).toEqual( 1 );
            } );

            //this is an important test even though it may not seem to be...
            it( 'includes the deprecatedID in the string to be submitted', function() {
                expect( model.getStr().indexOf( '<deprecatedID>' ) ).not.toEqual( -1 );
            } );

            it( 'gives the new deprecatedID node the old value of the instanceID node of the instance-to-edit', function() {
                expect( model.node( '/thedata/meta/deprecatedID' ).getVal()[ 0 ] ).toEqual( '7c990ed9-8aab-42ba-84f5-bf23277154ad' );
            } );

            it( 'empties the instanceID', function() {
                expect( model.node( '/thedata/meta/instanceID' ).getVal()[ 0 ] ).toEqual( '' );
            } );
        } );

        describe( 'when instanceID and deprecatedID nodes are already present in the form format', function() {
            var model = new Model( {
                modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/><deprecatedID/></meta></thedata></instance></model>',
                instanceStr: '<thedata id="something"><meta><instanceID>7c990ed9-8aab-42ba-84f5-bf23277154ad</instanceID></meta><nodeA>2012</nodeA></thedata>'
            } );

            var loadErrors = model.init();

            it( 'outputs no load errors', function() {
                expect( loadErrors.length ).toEqual( 0 );
            } );

            it( 'does not NOT add another instanceID node', function() {
                expect( model.node( '/thedata/meta/instanceID' ).get().length ).toEqual( 1 );
            } );

            it( 'does not NOT add another deprecatedID node', function() {
                expect( model.node( '/thedata/meta/deprecatedID' ).get().length ).toEqual( 1 );
            } );

            it( 'gives the deprecatedID node the old value of the instanceID node of the instance-to-edit', function() {
                expect( model.node( '/thedata/meta/deprecatedID' ).getVal()[ 0 ] ).toEqual( '7c990ed9-8aab-42ba-84f5-bf23277154ad' );
            } );
        } );


        describe( 'when the model contains templates', function() {
            [
                // with improper template=""
                [ '<a><r><b>5</b></r><r><b>6</b></r><meta/></a>', '<model><instance><a><r template=""><b>0</b></r><meta><instanceID/></meta></a></instance></model>', '<model><instance><a><r><b>5</b></r><r><b>6</b></r><meta><instanceID/><deprecatedID/></meta></a></instance></model>' ],
                // with proper jr:template="" and namespace definition
                [ '<a><r><b>5</b></r><r><b>6</b></r><meta/></a>', '<model xmlns:jr="http://openrosa.org/javarosa"><instance><a><r jr:template=""><b>0</b></r><meta><instanceID/></meta></a></instance></model>', '<model xmlns:jr="http://openrosa.org/javarosa"><instance><a><r><b>5</b></r><r><b>6</b></r><meta><instanceID/><deprecatedID/></meta></a></instance></model>' ],
            ].forEach( function( test ) {
                var result, expected,
                    model = new Model( {
                        modelStr: test[ 1 ],
                        instanceStr: test[ 0 ]
                    } );

                model.init();

                result = ( new XMLSerializer() ).serializeToString( model.xml, 'text/xml' );
                expected = test[ 2 ];

                it( 'the initialization will merge the repeat values correctly and remove the templates', function() {
                    expect( model.xml.querySelectorAll( 'a > r' ).length ).toEqual( 2 );
                    expect( result ).toEqual( expected );
                } );
            } );
        } );

        describe( 'returns load errors upon initialization', function() {
            it( 'when the instance-to-edit contains nodes that are not present in the default instance', function() {
                var model = new Model( {
                    modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/></meta></thedata></instance></model>',
                    instanceStr: '<thedata_updated id="something"><meta><instanceID>7c99</instanceID></meta><nodeA>2012</nodeA></thedata_updated>'
                } );
                var loadErrors = model.init();

                expect( loadErrors.length ).toEqual( 1 );
                expect( loadErrors[ 0 ] ).toEqual( 'Error trying to parse XML record. Different root nodes' );
            } );

            it( 'when an instance-to-edit is provided with double instanceID nodes', function() {
                var model = new Model( {
                    modelStr: '<model><instance><thedata id="thedata"><nodeA/><meta><instanceID/></meta></thedata></instance></model>',
                    instanceStr: '<thedata id="something"><meta><instanceID>7c99</instanceID><instanceID>uhoh</instanceID></meta><nodeA>2012</nodeA></thedata>'
                } );
                var loadErrors = model.init();

                expect( loadErrors.length ).toEqual( 1 );
                expect( loadErrors[ 0 ] ).toEqual( 'Error trying to parse XML record. Invalid primary instance. Found 2 instanceID nodes but expected 1.' );
            } );
        } );
    } );
} );
