if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ 'xpath', 'jquery', 'enketo-js/plugins', 'enketo-js/extend', 'jquery.xpath' ], function( XPathJS, $ ) {
    "use strict";

    /**
     * Class dealing with the XML Instance (the data) of a form
     *
     * @constructor
     * @param {string} dataStr String of the default XML instance
     */

    function FormModel( dataStr ) {
        var $data,
            that = this;

        this.loadErrors = [];
        this.INSTANCE = /instance\([\'|\"]([^\/:\s]+)[\'|\"]\)/g;
        this.OPENROSA = /(decimal-date-time\(|pow\(|indexed-repeat\(|format-date\(|coalesce\(|join\(|max\(|min\(|random\(|substr\(|int\(|uuid\(|regex\(|now\(|today\(|date\(|if\(|boolean-from-string\(|checklist\(|selected\(|selected-at\(|round\()/;

        //TEMPORARY DUE TO FIREFOX ISSUE, REMOVE ALL NAMESPACES FROM STRING, 
        //BETTER TO LEARN HOW TO DEAL WITH DEFAULT NAMESPACES THOUGH
        dataStr = dataStr.replace( /xmlns\=\"[a-zA-Z0-9\:\/\.]*\"/g, '' );

        try {
            this.xml = $.parseXML( dataStr );
        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( 'Error trying to parse XML model/instance.' );
        }

        $data = $( this.xml );

        this.$ = $data;

        /**
         * Initializes FormModel
         *
         */
        FormModel.prototype.init = function() {
            var /** @type {string} */ val;

            // trimming values
            this.node( null, null, {
                noEmpty: true,
                noTemplate: false
            } ).get().each( function() {
                val = $( this ).text();
                $( this ).text( $.trim( val ) );
            } );

            this.cloneAllTemplates();
            return this.loadErrors;
        };

        /**
         * Constructs a new Nodeset
         *
         * @param {(string|null)=} selector - [type/description]
         * @param {(string|number|null)=} index    - [type/description]
         * @param {(Object|null)=} filter   - [type/description]
         * @param filter.onlyTemplate
         * @param filter.noTemplate
         * @param filter.onlyLeaf
         * @param filter.noEmpty
         * @return {Nodeset}
         */
        this.node = function( selector, index, filter ) {
            return new Nodeset( selector, index, filter );
        };

        /**
         * Inner Class dealing with nodes and nodesets of the XML instance
         *
         * @constructor
         * @param {string=} selector simpleXPath or jQuery selector
         * @param {number=} index    the index of the target node with that selector
         * @param {?{onlyTemplate: boolean, noTemplate: boolean, onlyLeaf: boolean, noEmpty: boolean}=} filter   filter object for the result nodeset
         */

        function Nodeset( selector, index, filter ) {
            var defaultSelector = '*';
            this.originalSelector = selector;
            this.selector = ( typeof selector === 'string' && selector.length > 0 ) ? selector : defaultSelector;
            filter = ( typeof filter !== 'undefined' && filter !== null ) ? filter : {};
            this.filter = filter;
            this.filter.noTemplate = ( typeof filter.noTemplate !== 'undefined' ) ? filter.noTemplate : true;
            this.filter.onlyLeaf = ( typeof filter.onlyLeaf !== 'undefined' ) ? filter.onlyLeaf : false;
            this.filter.onlyTemplate = ( typeof filter.onlyTemplate !== 'undefined' ) ? filter.onlyTemplate : false;
            this.filter.noEmpty = ( typeof filter.noEmpty !== 'undefined' ) ? filter.noEmpty : false;
            this.index = index;

            if ( $data.find( 'model>instance' ).length > 0 ) {
                //to refer to non-first instance, the instance('id_literal')/path/to/node syntax can be used
                if ( this.selector !== defaultSelector && this.selector.indexOf( '/' ) !== 0 && that.INSTANCE.test( this.selector ) ) {
                    this.selector = this.selector.replace( that.INSTANCE, "model > instance#$1" );
                    return;
                }
                //default context is the first instance in the model            
                this.selector = "model > instance:eq(0) " + this.selector;
            }
        }

        /**
         * Privileged method to find data nodes filtered by a jQuery or XPath selector and additional filter properties
         * Without parameters it returns a collection of all data nodes excluding template nodes and their children. Therefore, most
         * queries will not require filter properties. This function handles all (?) data queries in the application.
         *
         * @return {jQuery} jQuery-wrapped filtered instance nodes that match the selector and index
         */
        Nodeset.prototype.get = function() {
            var p, $nodes, /** @type {string} */ val, context;

            // noTemplate is ignored if onlyTemplate === true
            if ( this.filter.onlyTemplate === true ) {
                $nodes = $data.xfind( this.selector ).filter( '[template]' );
            }
            // default
            else if ( this.filter.noTemplate === true ) {
                $nodes = $data.xfind( this.selector ).not( '[template], [template] *' );
            } else {
                $nodes = $data.xfind( this.selector );
            }
            //noEmpty automatically excludes non-leaf nodes
            if ( this.filter.noEmpty === true ) {
                $nodes = $nodes.filter( function() {
                    val = $( this ).text();
                    return $( this ).children().length === 0 && $.trim( val ).length > 0; //$.trim($this.text()).length > 0;
                } );
            }
            //this may still contain empty leaf nodes
            else if ( this.filter.onlyLeaf === true ) {
                $nodes = $nodes.filter( function() {
                    return $( this ).children().length === 0;
                } );
            }
            $nodes = ( typeof this.index !== 'undefined' && this.index !== null ) ? $nodes.eq( this.index ) : $nodes;
            return $nodes;
        };

        /**
         * Sets data node values.
         *
         * @param {(string|Array.<string>)=} newVals    The new value of the node.
         * @param {?string=} expr  XPath expression to validate the node.
         * @param {?string=} xmlDataType XML data type of the node
         *
         * @return {?boolean} null is returned when the node is not found or multiple nodes were selected
         */
        Nodeset.prototype.setVal = function( newVals, expr, xmlDataType ) {
            var $target, curVal, /**@type {string}*/ newVal, success, updated;

            curVal = this.getVal()[ 0 ];

            if ( typeof newVals !== 'undefined' && newVals !== null ) {
                newVal = ( $.isArray( newVals ) ) ? newVals.join( ' ' ) : newVals.toString();
            } else newVal = '';

            newVal = this.convert( newVal, xmlDataType );

            $target = this.get();

            if ( $target.length === 1 && $.trim( newVal.toString() ) !== $.trim( curVal.toString() ) ) { //|| (target.length > 1 && typeof this.index == 'undefined') ){
                //first change the value so that it can be evaluated in XPath (validated)
                $target.text( newVal );
                //then return validation result
                success = this.validate( expr, xmlDataType );
                updated = this.getClosestRepeat();
                updated.nodes = [ $target.prop( 'nodeName' ) ];
                $data.trigger( 'dataupdate', updated );
                //add type="file" attribute for file references
                if ( xmlDataType === 'binary' ) {
                    if ( newVal.length > 0 ) {
                        $target.attr( 'type', 'file' );
                    } else {
                        $target.removeAttr( 'type' );
                    }
                }
                return success;
            }
            if ( $target.length > 1 ) {
                console.error( 'nodeset.setVal expected nodeset with one node, but received multiple' );
                return null;
            }
            if ( $target.length === 0 ) {
                console.error( 'Data node: ' + this.selector + ' with null-based index: ' + this.index + ' not found!' );
                return null;
            }
            //always validate if the new value is not empty, even if value didn't change (see validateAll() function)
            //return (newVal.length > 0 && validateAll) ? this.validate(expr, xmlDataType) : true;
            return null;
        };


        /**
         * Obtains the data value if a JQuery or XPath selector for a single node is provided.
         *
         * @return {Array<string|number|boolean>} [description]
         */
        Nodeset.prototype.getVal = function() {
            var vals = [];
            this.get().each( function() {
                vals.push( $( this ).text() );
            } );
            return vals;
        };

        Nodeset.prototype.getIndex = function( $node ) {
            var nodeName, path, $this, $family;

            $node = $node || this.get();

            if ( $node.length === 1 ) {
                nodeName = $node.prop( 'nodeName' );
                path = $node.getXPath( 'instance' );
                $family = $data.find( nodeName ).filter( function() {
                    $this = $( this );
                    return !$this.is( '[template]' ) && $this.find( 'template' ).length === 0 && path === $this.getXPath( 'instance' );
                } );
                return ( $family.length === 1 ) ? null : $family.index( $node );
            } else {
                console.error( 'no node, or multiple nodes, provided to nodeset.getIndex' );
                return -1;
            }
        };

        // if repeats have not been cloned yet, they are not considered a repeat by this function
        Nodeset.prototype.getClosestRepeat = function() {
            var $node = this.get(),
                nodeName = $node.prop( 'nodeName' );

            while ( $node.siblings( nodeName + ':not([template])' ).length === 0 && nodeName !== 'instance' ) {
                $node = $node.parent();
                nodeName = $node.prop( 'nodeName' );
            }

            return ( nodeName === 'instance' ) ? {} : {
                repeatPath: $node.getXPath( 'instance' ),
                repeatIndex: this.getIndex( $node )
            };
        };

        /**
         * Clone repeat node after all templates have been cloned (after initialization)
         *
         * @param  {jQuery} $precedingTargetNode the node after which to append the clone
         */
        Nodeset.prototype.clone = function( $precedingTargetNode ) {
            var $dataNode, allClonedNodeNames, $this, $clone;

            $dataNode = this.get();
            $precedingTargetNode = $precedingTargetNode || $dataNode;

            if ( $dataNode.length === 1 && $precedingTargetNode.length === 1 ) {
                $clone = $dataNode.clone();

                $clone.insertAfter( $precedingTargetNode )
                    .find( '[template]' )
                    .addBack()
                    .removeAttr( 'template' );

                allClonedNodeNames = [ $dataNode.prop( 'nodeName' ) ];

                $dataNode.find( '*' ).each( function() {
                    $this = $( this );
                    allClonedNodeNames.push( $this.prop( 'nodeName' ) );
                } );

                $data.trigger( 'dataupdate', {
                    nodes: allClonedNodeNames,
                    repeatPath: $dataNode.getXPath( 'instance' ),
                    repeatIndex: this.getIndex( $clone )
                } );

            } else {
                console.error( 'node.clone() function did not receive origin and target nodes' );
            }
        };

        /**
         * Remove a repeat node
         */
        Nodeset.prototype.remove = function() {
            var $dataNode, allRemovedNodeNames, $this, repeatPath, repeatIndex;

            $dataNode = this.get();

            if ( $dataNode.length > 0 ) {

                allRemovedNodeNames = [ $dataNode.prop( 'nodeName' ) ];

                $dataNode.find( '*' ).each( function() {
                    $this = $( this );
                    allRemovedNodeNames.push( $this.prop( 'nodeName' ) );
                } );

                repeatPath = $dataNode.getXPath( 'instance' );
                repeatIndex = this.getIndex( $dataNode );

                $dataNode.remove();

                $data.trigger( 'dataupdate', {
                    updatedNodes: allRemovedNodeNames,
                    repeatPath: repeatPath,
                    repeatIndex: repeatIndex
                } );
            } else {
                console.error( 'could not find node ' + this.selector + ' with index ' + this.index + ' to remove ' );
            }
        };

        /**
         * Convert a value to a specified data type( though always stringified )
         * @param  {?string=} x           value to convert
         * @param  {?string=} xmlDataType XML data type
         * @return {string}               string representation of converted value
         */
        Nodeset.prototype.convert = function( x, xmlDataType ) {
            if ( x.toString() === '' ) {
                return x;
            }
            if ( typeof xmlDataType !== 'undefined' && xmlDataType !== null &&
                typeof this.types[ xmlDataType.toLowerCase() ] !== 'undefined' &&
                typeof this.types[ xmlDataType.toLowerCase() ].convert !== 'undefined' ) {
                return this.types[ xmlDataType.toLowerCase() ].convert( x );
            }
            return x;
        };

        /**
         * Validate a value with an XPath Expression and /or xml data type
         * @param  {?string=} expr        XPath expression
         * @param  {?string=} xmlDataType XML datatype
         * @return {boolean}
         */
        Nodeset.prototype.validate = function( expr, xmlDataType ) {
            var typeValid, exprValid,
                value = this.getVal()[ 0 ];

            if ( value.toString() === '' ) {
                return true;
            }

            if ( typeof xmlDataType == 'undefined' || xmlDataType === null || typeof this.types[ xmlDataType.toLowerCase() ] == 'undefined' ) {
                xmlDataType = 'string';
            }
            typeValid = this.types[ xmlDataType.toLowerCase() ].validate( value );

            exprValid = ( typeof expr !== 'undefined' && expr !== null && expr.length > 0 ) ? that.evaluate( expr, 'boolean', this.originalSelector, this.index ) : true;

            return ( typeValid && exprValid );
        };

        /**
         * @namespace types
         * @type {Object}
         */
        Nodeset.prototype.types = {
            'string': {
                //max length of type string is 255 chars.Convert( truncate ) silently ?
                validate: function( x ) {
                    return true;
                }
            },
            'select': {
                validate: function( x ) {
                    return true;
                }
            },
            'select1': {
                validate: function( x ) {
                    return true;
                }
            },
            'decimal': {
                validate: function( x ) {
                    return ( !isNaN( x - 0 ) && x !== null ) ? true : false;
                },
                convert: function( x ) {
                    // deals with Java issue and possible db issues:
                    // https://github.com/MartijnR/enketo-core/issues/40
                    return ( x === 'NaN' ) ? '' : x;
                }
            },
            'int': {
                validate: function( x ) {
                    return ( !isNaN( x - 0 ) && x !== null && Math.round( x ).toString() === x.toString() ) ? true : false;
                },
                convert: function( x ) {
                    // deals with Java issue and possible db issues:
                    // https://github.com/MartijnR/enketo-core/issues/40
                    return ( x === 'NaN' ) ? '' : x;
                }
            },
            'date': {
                validate: function( x ) {
                    var pattern = ( /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/ ),
                        segments = pattern.exec( x );

                    return ( segments && segments.length === 6 ) ? ( new Date( Number( segments[ 1 ] ), Number( segments[ 3 ] ) - 1, Number( segments[ 5 ] ) ).toString() !== 'Invalid Date' ) : false;
                },
                convert: function( x ) {
                    var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/,
                        segments = pattern.exec( x ),
                        date = new Date( x );
                    if ( new Date( x ).toString() == 'Invalid Date' ) {
                        //this code is really only meant for the Rhino and PhantomJS engines, in browsers it may never be reached
                        if ( segments && Number( segments[ 1 ] ) > 0 && Number( segments[ 3 ] ) >= 0 && Number( segments[ 3 ] ) < 12 && Number( segments[ 5 ] ) < 32 ) {
                            date = new Date( Number( segments[ 1 ] ), ( Number( segments[ 3 ] ) - 1 ), Number( segments[ 5 ] ) );
                        }
                    }
                    //date.setUTCHours(0,0,0,0);
                    //return date.toUTCString();//.getUTCFullYear(), datetime.getUTCMonth(), datetime.getUTCDate());
                    return date.getUTCFullYear().toString().pad( 4 ) + '-' + ( date.getUTCMonth() + 1 ).toString().pad( 2 ) + '-' + date.getUTCDate().toString().pad( 2 );
                }
            },
            'datetime': {
                validate: function( x ) {
                    //the second part builds in some tolerance for slightly-off dates provides as defaults (e.g.: 2013-05-31T07:00-02)
                    return ( new Date( x.toString() ).toString() !== 'Invalid Date' || new Date( this.convert( x.toString() ) ).toString() !== 'Invalid Date' );
                },
                convert: function( x ) {
                    var date, // timezone, segments, dateS, timeS,
                        patternCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2}):([0-9]{2})$/,
                        patternAlmostCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2})$/;
                    /* 
                     * if the pattern is right, or almost right but needs a small correction for JavaScript to handle it,
                     * do not risk changing the time zone by calling toISOLocalString()
                     */
                    if ( new Date( x ).toString() !== 'Invalid Date' && patternCorrect.test( x ) ) {
                        return x;
                    }
                    if ( new Date( x ).toString() == 'Invalid Date' && patternAlmostCorrect.test( x ) ) {
                        return x + ':00';
                    }
                    date = new Date( x );
                    return ( date.toString() !== 'Invalid Date' ) ? date.toISOLocalString() : date.toString();
                }
            },
            'time': {
                validate: function( x ) {
                    var date = new Date(),
                        segments = x.toString().split( ':' );
                    if ( segments.length < 2 ) {
                        return false;
                    }
                    segments[ 2 ] = ( segments[ 2 ] ) ? Number( segments[ 2 ].toString().split( '.' )[ 0 ] ) : 0;

                    return ( segments[ 0 ] < 24 && segments[ 0 ] >= 0 && segments[ 1 ] < 60 && segments[ 1 ] >= 0 && segments[ 2 ] < 60 && segments[ 2 ] >= 0 && date.toString() !== 'Invalid Date' );
                },
                convert: function( x ) {
                    var segments = x.toString().split( ':' );
                    $.each( segments, function( i, val ) {
                        segments[ i ] = val.toString().pad( 2 );
                    } );
                    return segments.join( ':' );
                }
            },
            'barcode': {
                validate: function( x ) {
                    return true;
                }
            },
            'geopoint': {
                validate: function( x ) {
                    var coords = x.toString().trim().split( ' ' );
                    return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                        ( coords[ 1 ] !== '' && coords[ 1 ] >= -180 && coords[ 1 ] <= 180 ) &&
                        ( typeof coords[ 2 ] == 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                        ( typeof coords[ 3 ] == 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) );
                },
                convert: function( x ) {
                    return $.trim( x.toString() );
                }
            },
            'geotrace': {
                validate: function( x ) {
                    var geopoints = x.toString().split( ';' );
                    return geopoints.length >= 2 && geopoints.every( function( geopoint ) {
                        return new Nodeset().types.geopoint.validate( geopoint );
                    } );
                },
                convert: function( x ) {
                    return x.toString().trim();
                }
            },
            'geoshape': {
                validate: function( x ) {
                    var geopoints = x.toString().split( ';' );
                    return geopoints.length >= 4 && ( geopoints[ 0 ] === geopoints[ geopoints.length - 1 ] ) && geopoints.every( function( geopoint ) {
                        return new Nodeset().types.geopoint.validate( geopoint );
                    } );
                },
                convert: function( x ) {
                    return x.toString().trim();
                }
            },
            'binary': {
                validate: function( x ) {
                    return true;
                }
            }
        };
    }


    /**
     * Gets the instance ID
     *
     * @return {string} instanceID
     */
    FormModel.prototype.getInstanceID = function() {
        return this.node( ':first>meta>instanceID' ).getVal()[ 0 ];
    };


    //index is the index of the node (defined in Nodeset), that the clone should be added immediately after
    //if a node with that name and that index+1 already exists the node will NOT be cloned
    //almost same as clone() but adds targetIndex and removes template attributes and if no template node exists it will copy a normal node
    //nodeset (givein in node() should include filter noTemplate:false) so it will provide all nodes that that name
    FormModel.prototype.cloneTemplate = function( selector, index ) {
        //console.log('trying to locate data node with path: '+path+' to clone and insert after node with same xpath and index: '+index);
        var $insertAfterNode, name,
            template = this.node( selector, 0, {
                onlyTemplate: true
            } );
        //console.log( 'cloning model template' );
        //if form does not use jr:template="" but the node-to-clone does exist
        template = ( template.get().length === 0 ) ? this.node( selector, 0 ) : template;
        name = template.get().prop( 'nodeName' );
        //console.log( 'going to find node to insert after', selector, index );
        $insertAfterNode = this.node( selector, index ).get();
        //console.log( 'found it', $insertAfterNode.length );

        //if templatenodes and insertafternode(s) have been identified AND the node following insertafternode doesn't already exist(! important for nested repeats!)
        if ( template.get().length === 1 && $insertAfterNode.length === 1 && $insertAfterNode.next().prop( 'nodeName' ) !== name ) { //this.node(selector, index+1).get().length === 0){
            template.clone( $insertAfterNode );
        } else {
            //console.error ('Could locate node: '+path+' with index '+index+' in data instance.There could be multiple template node (a BUG) or none.');
            if ( $insertAfterNode.next().prop( 'nodeName' ) !== name ) {
                console.error( 'Could not find template node and/or node to insert the clone after' );
            }
        }
    };

    /**
     * Initialization function that creates <repeat>able data nodes with the defaults from the template if no repeats have been created yet.
     * Strictly speaking this is not "according to the spec" as the user should be asked first whether it has any data for this question
     * but seems usually always better to assume at least one 'repeat' (= 1 question). It doesn't make use of the Nodeset subclass (CHANGE?)
     *
     * See also: In JavaRosa, the documentation on the jr:template attribute.
     *
     */
    FormModel.prototype.cloneAllTemplates = function() {
        // in reverse document order to properly deal with nested repeat templates
        this.$.find( 'model > instance:eq(0) [template]' ).reverse().each( function() {
            if ( $( this ).parent().closest( '[template]' ).length === 0 && $( this ).siblings( $( this ).prop( 'nodeName' ) ).not( '[template]' ).length === 0 ) {
                $( this ).clone().insertAfter( $( this ) ).find( '*' ).addBack().removeAttr( 'template' );
            }
        } );
    };

    /**
     * See Also:
     * Returns jQuery Data Object (obsolete?)
     * See also: <nodes.get()>, which is always (?) preferred except for debugging.
     *
     * @return {jQuery} JQuery Data Object
     */
    FormModel.prototype.get = function() {
        return this.$ || null;
    };

    /**
     *
     * @return {Element} data XML object (not sure if type is element actually)
     */
    FormModel.prototype.getXML = function() {
        return this.xml || null;
    };

    /**
     * Obtains a cleaned up string of the data instance(s)
     *
     * @param  {boolean=} incTempl indicates whether repeat templates should be included in the return value (default: false)
     * @param  {boolean=} incNs    indicates whether namespaces should be included in return value (default: true)
     * @param  {boolean=} all     indicates whether all instances should be included in the return value (default: false)
     * @return {string}           XML string
     */
    FormModel.prototype.getStr = function( incTempl, incNs, all ) {
        var $docRoot, $dataClone, dataStr;
        dataStr = ( new XMLSerializer() ).serializeToString( this.getInstanceClone( incTempl, incNs, all )[ 0 ] );
        //remove tabs
        dataStr = dataStr.replace( /\t/g, '' );
        return dataStr;
    };

    FormModel.prototype.getInstanceClone = function( incTempl, incNs, all ) {
        var $clone = ( all ) ? this.$.find( ':first' ).clone() : this.node( '> *:first' ).get().clone();
        return ( incTempl ) ? $clone : $clone.find( '[template]' ).remove().end();
    };

    /**
     * There is a bug in JavaRosa that has resulted in the usage of incorrect formulae on nodes inside repeat nodes.
     * Those formulae use absolute paths when relative paths should have been used. See more here:
     * https://bitbucket.org/javarosa/javarosa/wiki/XFormDeviations (point 3).
     * Tools such as pyxform also build forms in this incorrect manner. See https://github.com/modilabs/pyxform/issues/91
     * It will take time to correct this so makeBugCompliant() aims to mimic the incorrect
     * behaviour by injecting the 1-based [position] of repeats into the XPath expressions. The resulting expression
     * will then be evaluated in a way users expect (as if the paths were relative) without having to mess up
     * the XPath Evaluator.
     * E.g. '/data/rep_a/node_a' could become '/data/rep_a[2]/node_a' if the context is inside
     * the second rep_a repeat.
     *
     * This function should be removed as soon as JavaRosa (or maybe just pyxform) fixes the way those formulae
     * are created (or evaluated).
     *
     * @param  {string} expr        the XPath expression
     * @param  {string} selector    of the (context) node on which expression is evaluated
     * @param  {number} index       of the instance node with that selector
     * @return {string} modified    expression with injected positions (1-based!)
     */
    FormModel.prototype.makeBugCompliant = function( expr, selector, index ) {
        var i, parentSelector, parentIndex, $target, $node, nodeName, $siblings, $parents;
        $target = this.node( selector, index ).get();
        // add() sorts the resulting collection in document order
        $parents = $target.parents().add( $target );
        // traverse collection in reverse document order
        for ( i = $parents.length - 1; i >= 0; i-- ) {
            $node = $parents.eq( i );
            // escape any dots in the node name
            nodeName = $node.prop( 'nodeName' ).replace( /\./g, '\\.' );
            $siblings = $node.siblings( nodeName ).not( '[template]' );
            // if the node is a repeat node that has been cloned at least once (i.e. if it has siblings with the same nodeName)
            if ( nodeName.toLowerCase() !== 'instance' && nodeName.toLowerCase() !== 'model' && $siblings.length > 0 ) {
                parentSelector = $node.getXPath( 'instance' );
                parentIndex = $siblings.add( $node ).index( $node );
                // console.log('calculated repeat 0-based index: '+parentIndex+' for repeat node with path: '+parentSelector);
                expr = expr.replace( new RegExp( parentSelector, 'g' ), parentSelector + '[' + ( parentIndex + 1 ) + ']' );
                // console.log( 'new expression: ' + expr );
            }
        }
        return expr;
    };

    /**
     * Evaluates an XPath Expression using XPathJS_javarosa (not native XPath 1.0 evaluator)
     *
     * This function does not seem to work properly for nodeset resulttypes otherwise:
     * muliple nodes can be accessed by returned node.snapshotItem(i)(.textContent)
     * a single node can be accessed by returned node(.textContent)
     *
     * @param  { string }     expr        the expression to evaluate
     * @param  { string= }    resTypeStr  boolean, string, number, nodes (best to always supply this)
     * @param  { string= }    selector    jQuery selector which will be use to provide the context to the evaluator
     * @param  { number= }    index       index of selector in document
     * @param  { boolean= }   tryNative   whether an attempt to try the Native Evaluator is safe (ie. whether it is
     *                                    certain that there are no date comparisons)
     * @return { ?(number|string|boolean|Array<element>) } the result
     */
    FormModel.prototype.evaluate = function( expr, resTypeStr, selector, index, tryNative ) {
        var i, j, error, context, $instanceDoc, instanceDoc, instances, id, resTypeNum, resultTypes, result, $result, attr,
            $collection, $contextWrapNodes, $repParents, response, openrosa;

        //console.time( 'eval in Model' );
        //console.debug( 'evaluating expr: ' + expr + ' with context selector: ' + selector + ', 0-based index: ' +
        //    index + ' and result type: ' + resTypeStr );
        tryNative = tryNative || false;
        resTypeStr = resTypeStr || 'any';
        index = index || 0;

        expr = expr.trim();

        /* 
            creating a new instanceDoc is necessary for 3 reasons:
            - the primary instance needs to be the root (and it isn't as the root is <model> and there can be multiple <instance>s)
            - the templates need to be removed (though this could be worked around by adding the templates as data)
            - the hack described below with multiple instances.
        */
        $instanceDoc = new FormModel( this.getStr( false, false ) ).$;
        instanceDoc = $instanceDoc[ 0 ];

        /* 
            If the expression contains the instance('id') syntax, a different context instance is required.
            However, the same expression may also contain absolute reference to the main data instance, 
            which means 2 different contexts would have to be supplied to the XPath Evaluator which is not
            possible. Alternatively, the XPath Evaluator becomes able to use a default instance and direct 
            the instance(id) references to a sibling instance context. The latter proved to be too hard for 
            this developer, so as a workaround, the following is used instead:
            The instance referred to in instance(id) is detached and appended to the main instance. The 
            instance(id) syntax is subsequently converted to /node()/instance[@id=id] XPath syntax.
        */

        if ( this.INSTANCE.test( expr ) ) {
            instances = expr.match( this.INSTANCE );
            for ( i = 0; i < instances.length; i++ ) {
                id = instances[ i ].match( /[\'|\"]([^\'']+)[\'|\"]/ )[ 1 ];
                expr = expr.replace( instances[ i ], '/node()/instance[@id="' + id + '"]' );
                this.$.find( ':first>instance#' + id ).clone().appendTo( $instanceDoc.find( ':first' ) );
            }
        }

        if ( typeof selector !== 'undefined' && selector !== null ) {
            context = $instanceDoc.xfind( selector ).eq( index )[ 0 ];
            /*
             * If the context for the expression is a node that is inside a repeat.... see makeBugCompliant()
             */
            $collection = this.node( selector ).get();
            if ( $collection.length > 1 ) {
                //console.log('going to inject position into: '+expr+' for context: '+selector+' and index: '+index);
                expr = this.makeBugCompliant( expr, selector, index );
            }
        } else {
            context = instanceDoc;
        }

        resultTypes = {
            0: [ 'any', 'ANY_TYPE' ],
            1: [ 'number', 'NUMBER_TYPE', 'numberValue' ],
            2: [ 'string', 'STRING_TYPE', 'stringValue' ],
            3: [ 'boolean', 'BOOLEAN_TYPE', 'booleanValue' ],
            7: [ 'nodes', 'ORDERED_NODE_SNAPSHOT_TYPE' ],
            9: [ 'node', 'FIRST_ORDERED_NODE_TYPE' ]
        };

        // translate typeStr to number according to DOM level 3 XPath constants
        for ( resTypeNum in resultTypes ) {

            resTypeNum = Number( resTypeNum );

            if ( resultTypes[ resTypeNum ][ 0 ] == resTypeStr ) {
                break;
            } else {
                resTypeNum = 0;
            }
        }

        expr = expr.replace( /&lt;/g, '<' );
        expr = expr.replace( /&gt;/g, '>' );
        expr = expr.replace( /&quot;/g, '"' );

        // try native to see if that works... (will not work if the expr contains custom OpenRosa functions)
        if ( tryNative && typeof instanceDoc.evaluate !== 'undefined' && !this.OPENROSA.test( expr ) ) {
            try {
                // console.log( 'trying the blazing fast native XPath Evaluator for', expr, index );
                result = instanceDoc.evaluate( expr, context, null, resTypeNum, null );
            } catch ( e ) {
                console.log( '%cWell native XPath evaluation that did not work... No worries, worth a shot, the expression probably ' +
                    'contained unknown OpenRosa functions or errors:', 'color:orange', expr );
            }
        }

        // if that didn't work, try the slow XPathJS evaluator 
        if ( !result ) {
            try {
                // console.log( 'trying the super slow XPathJS_javarosa evaluator for', expr, index );
                // bind the replacement evaluator to the instance of XMLDocument
                XPathJS.bindDomLevel3XPath( instanceDoc );
                result = instanceDoc.evaluate( expr, context, null, resTypeNum, null );
            } catch ( e ) {
                error = 'Error occurred trying to evaluate: ' + expr + ', message: ' + e.message;
                console.error( error );
                $( document ).trigger( 'xpatherror', error );
                this.loadErrors.push( error );
                //console.timeEnd( 'eval in Model' );
                return null;
            }
        }

        // get desired value from result object
        if ( result ) {
            // for type = any, see if a valid string, number or boolean is returned
            if ( resTypeNum === 0 ) {
                for ( resTypeNum in resultTypes ) {
                    resTypeNum = Number( resTypeNum );
                    if ( resTypeNum == Number( result.resultType ) && resTypeNum > 0 && resTypeNum < 4 ) {
                        response = result[ resultTypes[ resTypeNum ][ 2 ] ];
                        break;
                    }
                }
                console.error( 'Expression: ' + expr + ' did not return any boolean, string or number value as expected' );
            } else if ( resTypeNum === 7 ) {
                // response is an array of Elements
                response = [];
                for ( j = 0; j < result.snapshotLength; j++ ) {
                    response.push( result.snapshotItem( j ) );
                }
            } else {
                response = result[ resultTypes[ resTypeNum ][ 2 ] ];
            }
            //console.timeEnd( 'eval in Model' );
            return response;
        }
    };

    return FormModel;
} );
