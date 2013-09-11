/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*jslint browser:true, devel:true, jquery:true, smarttabs:true, trailing:false*//*global XPathJS, XMLSerializer:true, Profiler, Modernizr, google, settings, connection, fileManager, xPathEvalTime*/

/**
 * Class: Form
 *
 * This class provides the JavaRosa form functionality by manipulating the survey form DOM object and
 * continuously updating the data XML Document. All methods are placed inside the constructor (so privileged 
 * or private) because only one instance will be created at a time.
 * 
 * @param {string} formSelector  jquery selector for the form
 * @param {string} dataStr       <instance> as XML string
 * @param {?string=} dataStrToEdit <instance> as XML string that is to be edit. This may not be a complete instance (empty nodes could be missing) and may have additional nodes.
 *
 * @constructor
 */
function Form (formSelector, dataStr, dataStrToEdit){
	"use strict";
	var data, dataToEdit, form, $form, $formClone, repeatsPresent,
		loadErrors = [];
	//*** FOR DEBUGGING and UNIT TESTS ONLY ***
	this.ex = function(expr, type, selector, index){return data.evaluate(expr, type, selector, index);};
	this.sfv = function(){return form.setAllVals();};
	this.Data = function(dataStr){return new DataXML(dataStr);};
	this.getDataO = function(){return data;};
	this.getDataEditO = function(){return dataToEdit.get();};
	this.getInstanceID = function(){return data.getInstanceID();};
	this.Form = function(selector){return new FormHTML(selector);};
	this.getFormO = function(){return form;};
	//***************************************

/**
 * Function: init
 *
 * Initializes the Form instance (XML data and HTML form).
 * 
 */
	this.init = function() {
		//cloning children to keep any event handlers on 'form.jr' intact upon resetting
		$formClone = $(formSelector).clone().appendTo('<original></original>');

		data = new DataXML(dataStr);
		form = new FormHTML(formSelector);

		//var profiler = new Profiler('data.init()');
		data.init();
		//profiler.report();

		if (typeof dataStrToEdit !== 'undefined' && dataStrToEdit && dataStrToEdit.length > 0){
			dataToEdit = new DataXML(dataStrToEdit);
			dataToEdit.init();
			data.load(dataToEdit);
		}
		repeatsPresent = ($(formSelector).find('.jr-repeat').length > 0);

		//profiler = new Profiler('html form.init()');
		form.init();
		//profiler.report();
		
		if (loadErrors.length > 0){
			console.error('loadErrors: ',loadErrors);
		}
		return loadErrors;
	};

	/**
	 * @param {boolean=} incTempl
	 * @param {boolean=} incNs
	 * @param {boolean=} all
	 */
	this.getDataStr = function(incTempl, incNs, all){
		return data.getStr(incTempl, incNs, all);
	};
	/**
	 *
	 */
	this.getRecordName = function(){
		return form.recordName.get();
	};
	/**
	 * @param {string} name
	 */
	this.setRecordName = function(name){
		return form.recordName.set(name);
	};
	this.getRecordStatus = function(){
		return form.recordStatus.get();
	};
	/**
	 * @param {(boolean|string)=} markedFinal
	 */
	this.setRecordStatus = function(markedFinal){
		return form.recordStatus.set(markedFinal);
	};
	/**
	 * @param { boolean } status [description]
	 */
	 this.setEditStatus = function(status){
		return form.editStatus.set(status);
	 };
	 this.getEditStatus = function(){
		return form.editStatus.get();
	 };
	 this.getName = function(){
		return $form.find('#form-title').text();
	 };

	//restores html form to pre-initialized state
	//does not affect data instance!
	this.resetHTML = function(){
		//form language selector was moved outside of <form> so has to be separately removed
		$('#form-languages').remove();
		$form.replaceWith($formClone);
	 };

	 /**
	 * Validates the whole form and returns true or false
	 * @return {boolean} 
	 */ 
	this.validateForm = function(){
		return form.validateAll();
	};
	/**
	 * Returns wether form has validated as true or false. Needs to be called AFTER calling validate()!
	 * @return {!boolean} 
	 */ 
	this.isValid = function(){
		return form.isValid();
	};
	

	/**
	 * Inner Class dealing with the XML Instance (data) of a form
	 * @constructor
	 * @extends Form
	 * @param {string} dataStr String of the default XML instance
	 */
	function DataXML(dataStr) {
		var $data,
			that=this;
	
		this.instanceSelectRegEx = /instance\([\'|\"]([^\/:\s]+)[\'|\"]\)/g;

		//TEMPORARY DUE TO FIREFOX ISSUE, REMOVE ALL NAMESPACES FROM STRING, 
		//BETTER TO LEARN HOW TO DEAL WITH DEFAULT NAMESPACES
		dataStr = dataStr.replace(/xmlns\=\"[a-zA-Z0-9\:\/\.]*\"/g,'');

		this.xml = $.parseXML(dataStr);

		$data = $(this.xml);

		this.$ = $data;

		//replace browser-built-in-XPath Engine
		XPathJS.bindDomLevel3XPath(); 

		/**
		 * Function: node
		 * 
		 * description
		 * 
		 * Parameters:
		 * 
		 *   @param {(string|null)=} selector - [type/description]
		 *   @param {(string|number|null)=} index    - [type/description]
		 *   @param {(Object|null)=} filter   - [type/description]
		 *   @param filter.onlyTemplate
		 *   @param filter.noTemplate
		 *   @param filter.onlyLeaf
		 *   @param filter.noEmpty
		 *   @returns {Nodeset}
		 */
		this.node = function(selector, index, filter){
			return new Nodeset(selector, index, filter);
		};
		
		/**
		 *  Inner Class dealing with nodes and nodesets of the XML instance
		 *  
		 *   @param {(string|null)=} selector simpleXPath or jQuery selector
		 *   @param {(string|number|null)=} index the index of the target node with that selector
		 *   @param {(Object|null)=} filter filter object for the result nodeset
		 *   @param {boolean=} filter.onlyTemplate only select template nodes (of repeats)
		 *   @param {boolean=} filter.noTemplate exclude template nodes (of repeats)
		 *   @param {boolean=} filter.onlyLeaf only include leaf nodes
		 *   @param {boolean=} filter.noEmpty exclude empty nodes (and therefore only returns leaf nodes)
		 *   @constructor
		 *   @extends DataXML
		 */
		function Nodeset(selector, index, filter){
			var defaultSelector = '*';
			this.originalSelector = selector;
			this.selector = (typeof selector === 'string' && selector.length > 0) ? selector : defaultSelector; 
			filter = (typeof filter !== 'undefined' && filter !== null) ? filter : {};
			this.filter = filter;
			this.filter.noTemplate = (typeof filter.noTemplate !== 'undefined') ? filter.noTemplate : true;
			this.filter.onlyLeaf = (typeof filter.onlyLeaf !== 'undefined') ? filter.onlyLeaf : false;
			this.filter.onlyTemplate = (typeof filter.onlyTemplate !== 'undefined') ? filter.onlyTemplate : false;
			this.filter.noEmpty = (typeof filter.noEmpty !== 'undefined') ? filter.noEmpty : false;
			this.index = index;

			if ($data.find('model>instance').length > 0){
				//to refer to non-first instance, the instance('id_literal')/path/to/node syntax can be used
				if (this.selector !== defaultSelector && this.selector.indexOf('/') !== 0 && that.instanceSelectRegEx.test(this.selector) ){
					this.selector = this.selector.replace(that.instanceSelectRegEx, "model > instance#$1");
					//console.debug('selector modified to: '+this.selector);
					return;
				}
				//default context is the first instance in the model            
				this.selector = "model > instance:eq(0) "+this.selector;
			}
		}

		/**
		 * Privileged method to find data nodes filtered by a jQuery or XPath selector and additional filter properties
		 * Without parameters it returns a collection of all data nodes excluding template nodes and their children. Therefore, most
		 * queries will not require filter properties. This function handles all (?) data queries in the application.
		 *
		 * @return {jQuery} jQuery-wrapped filtered instance nodes that match the selector and index
		 */
		Nodeset.prototype.get = function(){
			var p, $nodes, val, context;
			
			// noTemplate is ignored if onlyTemplate === true
			if (this.filter.onlyTemplate === true){
				$nodes = $data.xfind(this.selector).filter('[template]');
			}
			// default
			else if (this.filter.noTemplate === true){  
				$nodes = $data.xfind(this.selector).not('[template], [template] *');
			}
			else{
				$nodes = $data.xfind(this.selector);
			}
			//noEmpty automatically excludes non-leaf nodes
			if (this.filter.noEmpty === true){
				$nodes = $nodes.filter(function(){
					val = /** @type {string} */ $(this).text();
					//$this = $(this);
					////console.log ('children: '+$(this).children().length);
					////console.log ('text length: '+($.trim($this.text()).length));
					return $(this).children().length === 0 && $.trim(val).length > 0;//$.trim($this.text()).length > 0;
				});
			}
			//this may still contain empty leaf nodes
			else if (this.filter.onlyLeaf === true){
				$nodes = $nodes.filter(function(){
					return $(this).children().length === 0;
				});
			}
			$nodes = (typeof this.index !== 'undefined' && this.index !== null) ? $nodes.eq(this.index) : $nodes;
			////console.debug('node.get() returns');//console.debug($nodes);
			return $nodes;
		};

		/**
		 * Sets data node values.
		 * 
		 * @param {(string|Array.<string>)=} newVals    The new value of the node.
		 * @param {?string=} expr  XPath expression to validate the node.
		 * @param {?string=} xmlDataType XML data type of the node
		 *
		 * @returns {?boolean} null is returned when the node is not found or multiple nodes were selected
		 */
		Nodeset.prototype.setVal = function(newVals, expr, xmlDataType){
			var $target, curVal, /**@type {string}*/ newVal, success;

			curVal = this.getVal()[0];
			
			if (typeof newVals !== 'undefined' && newVals !== null){
				newVal = ($.isArray(newVals)) ? newVals.join(' ') : newVals.toString();
			}
			else newVal = '';
			newVal = this.convert(newVal, xmlDataType);

			$target = this.get();

			if ( $target.length === 1 && $.trim(newVal.toString()) !== $.trim(curVal.toString()) ){ //|| (target.length > 1 && typeof this.index == 'undefined') ){
				//first change the value so that it can be evaluated in XPath (validated)
				$target.text(newVal);
				//then return validation result
				success = this.validate(expr, xmlDataType);
				$form.trigger('dataupdate', $target.prop('nodeName'));
				//add type="file" attribute for file references
				if (xmlDataType === 'binary'){
					if (newVal.length > 0 ){
						$target.attr('type', 'file');
					}
					else{
						$target.removeAttr('type');
					}
				}
				return success;
			}
			if ($target.length > 1){
				console.error('nodeset.setVal expected nodeset with one node, but received multiple');
				return null;
			}
			if ($target.length === 0 ){
				console.error('Data node: '+this.selector+' with null-based index: '+this.index+' not found!');
				return null;
			}
			//always validate if the new value is not empty, even if value didn't change (see validateAll() function)
			//return (newVal.length > 0 && validateAll) ? this.validate(expr, xmlDataType) : true;
			return null;
			////console.debug('validation result: '+this.validate());
		};

		/**
		 * Function: getVal
		 * 
		 * Obtains the data value if a JQuery or XPath selector for a single node is provided.
		 * 
		 * Parameters:
		 * 
		 *   selector - String of JQuery or XPath selector
		 *   
		 * Returns:
		 * 
		 *   returns [multiple OBSOLETE?] an array of values 
		 *   
		 */
		Nodeset.prototype.getVal = function(){
			var vals=[];
			this.get().each(function(){
				vals.push($(this).text());
			});
			return vals;
		};
		
		/**
		 * clone data node after all templates have been cloned (after initialization)
		 * @param  {jQuery} $precedingTargetNode the node after which to append the clone
		 */
		Nodeset.prototype.clone = function($precedingTargetNode){
			var $dataNode, allClonedNodeNames;

			$dataNode = this.get();
			$precedingTargetNode = $precedingTargetNode || $dataNode;

			if ($dataNode.length === 1 && $precedingTargetNode.length ===1){
				$dataNode.clone().insertAfter($precedingTargetNode).find('*').addBack().removeAttr('template');

				allClonedNodeNames = [$dataNode.prop('nodeName')];
				$dataNode.find('*').each(function(){
					allClonedNodeNames.push($(this).prop('nodeName'));
				});

				$form.trigger('dataupdate', allClonedNodeNames.join(','));
			}
			else{
				console.error ('node.clone() function did not receive origin and target nodes');
			}
		};

		/**
		 * Remove a node
		 */
		Nodeset.prototype.remove = function(){
			var dataNode = this.get();
			if (dataNode.length > 0){
				//console.log('removing data node with name: '+this.get().prop('nodeName'));
				dataNode.remove();
				$form.trigger('dataupdate', dataNode.prop('nodeName') );
			}
			else {
				console.error('could not find node '+this.selector+' with index '+this.index+ ' to remove ');
			}
		};

		/**
		 * Convert a value to a specified data type (though always stringified)
		 * @param  {string} x  value to convert
		 * @param  {?string=} xmlDataType name of xmlDataType
		 * @return {string}             return string value of converted value
		 */
		Nodeset.prototype.convert = function(x, xmlDataType){
			if (x.toString() === ''){
				return x;
			}
			if (typeof xmlDataType !== 'undefined' && xmlDataType !== null && 
				typeof this.types[xmlDataType.toLowerCase()] !== 'undefined' &&
				typeof this.types[xmlDataType.toLowerCase()].convert !== 'undefined'){
					return this.types[xmlDataType.toLowerCase()].convert(x);
			}
			return x;
		};
 
		/**
		 * Validate a value with an XPath Expression and/or xml data type
		 * @param  {?string=} expr        XPath expression
		 * @param  {?string=} xmlDataType name of xml data type
		 * @return {boolean}            returns true if both validations are true
		 */
		Nodeset.prototype.validate = function(expr, xmlDataType){
			var typeValid, exprValid,
				value = this.getVal()[0];
			
			if ( value.toString() === '' ) {
				return true;
			}

			if ( typeof xmlDataType == 'undefined' 
				|| xmlDataType === null 
				|| typeof this.types[xmlDataType.toLowerCase()] == 'undefined' ){
				xmlDataType = 'string';
			}
			typeValid = this.types[xmlDataType.toLowerCase()].validate(value);
			
			exprValid = ( typeof expr !== 'undefined' && expr !== null && expr.length > 0 ) ? that.evaluate(expr, 'boolean', this.originalSelector, this.index) : true;
			//console.debug('constraint valid: '+exprValid);
			return ( typeValid && exprValid );
		};

		/**
		 * xml data types
		 * @namespace  types
		 * @type {Object}
		 */
		Nodeset.prototype.types = {
			'string' :{
				//max length of type string is 255 chars. Convert (truncate) silently?
				validate : function(x){
					return true;
				}
			},
			'select' :{
				validate: function(x){
					return true;
				}
			},
			'select1' :{
				validate: function(x){
					return true;
				}
			},
			'decimal' :{
				validate : function(x){
					return (!isNaN(x-0) && x !== null) ? true : false;
				}
			},
			'int' : {
				validate : function(x){
					return (!isNaN(x-0) && x !== null && Math.round(x) == x) ? true : false; //x.toString() == parseInt(x, 10).toString();
				}
			}, 
			'date' : {
				validate : function(x){
					var pattern = (/([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/),
						segments = pattern.exec(x);

					//console.debug('datestring: '+x+ ' type: '+ typeof x + 'is valid? -> '+new Date(x.toString()).toString());
					//return ( new Date(x).toString() !== 'Invalid Date' || new Date(x+'T00:00:00.000Z') !== 'Invalid Date');
					return (segments && segments.length === 6) ? (new Date(Number(segments[1]), Number(segments[3]) - 1, Number(segments[5])).toString() !== 'Invalid Date') : false;
				},
				convert : function(x){
					var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/,
						segments = pattern.exec(x),
						date = new Date(x);
					if (new Date(x).toString() == 'Invalid Date'){
						//this code is really only meant for the Rhino and PhantomJS engines, in browsers it may never be reached
						if (segments && Number(segments[1]) > 0 && Number(segments[3]) >=0 && Number(segments[3]) < 12 && Number(segments[5]) < 32){
							date = new Date(Number(segments[1]), (Number(segments[3])-1), Number(segments[5]));
						}
					}
					//date.setUTCHours(0,0,0,0);
					//return date.toUTCString();//.getUTCFullYear(), datetime.getUTCMonth(), datetime.getUTCDate());
					return date.getUTCFullYear().toString().pad(4)+'-'+(date.getUTCMonth()+1).toString().pad(2)+'-'+date.getUTCDate().toString().pad(2);
				}
			},
			'datetime' : {
				validate : function(x){
					console.debug('datetime validation function received: '+x+' type:'+ typeof x);
					//the second part builds in some tolerance for slightly-off dates provides as defaults (e.g.: 2013-05-31T07:00-02)
					return ( new Date(x.toString()).toString() !== 'Invalid Date' || new Date(this.convert(x.toString())).toString() !== 'Invalid Date');
				},
				convert : function(x){
					var date,// timezone, segments, dateS, timeS,
						patternCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2}):([0-9]{2})$/,
						patternAlmostCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2})$/;  
					//console.debug('datetime conversion function received: '+x+' type:'+ typeof x);
					/* 
					 * if the pattern is right, or almost right but needs a small correction for JavaScript to handle it,
					 * do not risk changing the time zone by calling toISOLocalString()
					 */
					if (new Date(x).toString() !== 'Invalid Date' && patternCorrect.test(x)){
						return x;
					}
					if (new Date(x).toString() == 'Invalid Date' && patternAlmostCorrect.test(x)){
						return x+':00';
					}
					date = new Date(x);
					return (date.toString() !== 'Invalid Date') ? date.toISOLocalString() : date.toString();
				}
			},
			'time' : {
				validate : function(x){
					var date = new Date(),
						segments = x.toString().split(':');
					//console.debug('time value to validate: '+x);
					//console.debug(segments);
					if (segments.length < 2){
						return false;
					}
					segments[2] = (segments[2]) ? Number(segments[2].toString().split('.')[0]) : 0;
						
					return ( segments[0] < 24 && segments[0] >= 0 && segments[1] < 60 && segments[1] >= 0 && segments[2] < 60 && segments[2] >= 0 && date.toString() !== 'Invalid Date' );
				},
				convert : function(x){
					var segments = x.toString().split(':');
					$.each(segments, function(i, val){
						segments[i] = val.toString().pad(2);
					});
					return segments.join(':');
					//console.log('converting datetime to time');
					//return datetime.getHours().toString().pad(2)+':'+datetime.getMinutes().toString().pad(2)+':'+datetime.getSeconds().toString().pad(2);
				}
			},
			'barcode' : {
				validate: function(x){
					return true;
				}
			},
			'geopoint' : {
				validate: function(x){
					var coords = x.toString().split(' ');
					return ( coords[0] !== '' && coords[0] >= -90 && coords[0] <= 90 ) && 
						( coords[1] !== '' && coords[1] >= -180 && coords[1] <= 180) && 
						( typeof coords[2] == 'undefined' || !isNaN(coords[2]) ) && 
						( typeof coords[3] == 'undefined' || ( !isNaN(coords[3]) && coords[3] >= 0 ) );
				},
				convert: function(x){
					return $.trim(x.toString());
				}
			},
			'binary' : {
				validate: function(x){
					return true;
				}
			}
		};  
	}

	/**
	 * Function: DataXML.init
	 * 
	 * Sets up the $data object.
	 * 
	 * Parameters:
	 * 
	 *   dataStr - xml data as a string
	 *   
	 * Returns:
	 * 
	 *   -
	 */
	DataXML.prototype.init = function(){
		var val;

		//trimming values
		this.node(null, null, {noEmpty: true, noTemplate: false}).get().each(function(){
			val = /** @type {string} */$(this).text();
			$(this).text($.trim(val));
		});

		this.cloneAllTemplates();
		return;
	};

	DataXML.prototype.getInstanceID = function(){
		return this.node(':first>meta>instanceID').getVal()[0];
	};
	/**
	 * Function to load an (possibly incomplete) instance so that it can be edited.
	 * 
	 * @param  {Object} instanceOfDataXML [description]
	 * 
	 */
	DataXML.prototype.load = function(instanceOfDataXML){
		var nodesToLoad, index, xmlDataType, path, value, target, $input, $target, $template, instanceID, error,
			that = this,
			filter = {noTemplate: true, noEmpty: true};

		nodesToLoad = instanceOfDataXML.node(null, null, filter).get();
		console.debug('nodes to load: ', nodesToLoad);
		//first empty all form data nodes, to clear any default values except those inside templates
		this.node(null, null, filter).get().each(function(){
			//something seems fishy about doing it this way instead of using node.setVal('');
			$(this).text('');
		});

		nodesToLoad.each(function(){
			var name = $(this).prop('nodeName');
			//console.debug(name);
			path = form.generateName($(this));
			//console.debug('path: '+path);
			index = instanceOfDataXML.node(path).get().index($(this));
			//console.debug('index: '+index);
			value = $(this).text();
			//console.debug('value: '+value);

			//input is not populated in this function, so we take index 0 to get the XML data type
			$input = $form.find('[name="'+path+'"]').eq(0);
			
			xmlDataType = ($input.length > 0) ? form.input.getXmlType($input) : 'string';
			//console.debug('xml datatype: '+xmlDataType);
			target = that.node(path, index);
			$target = target.get();

			//if there are multiple nodes with that name and index (actually impossible)
			if ($target.length > 1){
				console.error('Found multiple nodes with path: '+path+' and index: '+index);
			}
			//if there is a corresponding node in the form's original instances
			else if ($target.length === 1){
				//set the value
				target.setVal(value, null, xmlDataType);
			}
			//if there is no corresponding data node but there is a corresponding template node (=> <repeat>)
			//this use of node(,,).get() is a bit of a trick that is difficult to wrap one's head around
			else if (that.node(path, index, {noTemplate:false}).get().length > 0){
				//clone the template node 
				//TODO add support for repeated nodes in forms that do not use template="" (not possible in formhub)
				$template = that.node(path, 0, {noTemplate:false}).get().closest('[template]');
				//TODO test this for nested repeats
				that.cloneTemplate(form.generateName($template), index-1);
				//try setting the value again
				target = that.node(path,index);
				if (target.get().length === 1){             
					target.setVal(value, null, xmlDataType);
				}
				else{
					error = 'Error occured trying to clone template node to set the repeat value of the instance to be edited.';
					console.error(error);
					loadErrors.push(error);
				}
			}
			//as an exception, missing meta nodes will be quietly added if a meta node exists at that path
			//the latter requires e.g the root node to have the correct name
			else if ( $(this).parent('meta').length === 1  && that.node(form.generateName($(this).parent('meta')), 0).get().length === 1){
				//if there is no existing meta node with that node as child
				if(that.node(':first > meta > '+name, 0).get().length === 0){
					console.debug('cloning this direct child of <meta>');
					$(this).clone().appendTo(that.node(':first > meta').get());
				}
				else{
					error = 'Found duplicate meta node ('+name+')!';
					console.error(error);
					loadErrors.push(error);
				}
			}
			else {
				error = 'Did not find form node with path: '+path+' and index: '+index+' so failed to load data.';
				console.error(error);
				loadErrors.push(error);
			}
		});
		//add deprecatedID node, copy instanceID value to deprecatedID and empty deprecatedID
		instanceID = this.node('*>meta>instanceID');
		if (instanceID.get().length !== 1){
			error = 'InstanceID node in default instance error (found '+instanceID.get().length+' instanceID nodes)';
			console.error(error);
			loadErrors.push(error);
			return;
		}
		if (this.node('*>meta>deprecatedID').get().length !== 1){
			var deprecatedIDXMLNode = $.parseXML("<deprecatedID/>").documentElement;
			$(deprecatedIDXMLNode).appendTo(this.node('*>meta').get());
		}
		this.node('*>meta>deprecatedID').setVal(instanceID.getVal()[0], null, 'string');
		instanceID.setVal('', null, 'string');
	};


	//index is the index of the node (defined in Nodeset), that the clone should be added immediately after
	//if a node with that name and that index already exists the node will NOT be cloned
	//almost same as clone() but adds targetIndex and removes template attributes and if no template node exists it will copy a normal node
	//nodeset (givein in node() should include filter noTemplate:false) so it will provide all nodes that that name
	DataXML.prototype.cloneTemplate = function(selector, index){
		////console.log('trying to locate data node with path: '+path+' to clone and insert after node with same xpath and index: '+index);
		var $insertAfterNode, name,
			template = this.node(selector, 0, {onlyTemplate: true}); //eq(0) is actually obsolete
		//console.debug('going to clone date template node with selector: '+selector+' and insert after index '+index);
		//if form does not use jr:template="" but the node-to-clone does exist
		template = (template.get().length === 0) ? this.node(selector, 0) : template;
		name = template.get().prop('nodeName');
		$insertAfterNode = this.node(selector, index).get();

		//if templatenodes and insertafternode(s) have been identified AND the node following insertafternode doesn't already exist(! important for nested repeats!)
		if (template.get().length === 1 && $insertAfterNode.length === 1 && $insertAfterNode.next().prop('nodeName') !== name){//this.node(selector, index+1).get().length === 0){
			//console.log('found data repeat node with template attribute');
			//cloneDataNode(templateNode, insertAfterNode);

			template.clone($insertAfterNode);
			//console.debug('cloning done');
			//templateNode.clone().insertAfter(templateNode.parent().children(templateNode.prop('nodeName')).last()).removeAttr('template');
		}
		else{
			//console.error ('Could locate node: '+path+' with index '+index+' in data instance.There could be multiple template node (a BUG) or none.');
			if ($insertAfterNode.next().prop('nodeName') !== name ){
				console.error('Could not find template node and/or node to insert the clone after');
			}
		}
	};

	/**
	 * Function: cloneAllTemplates
	 *
	 * Initialization function that creates <repeat>able data nodes with the defaults from the template if no repeats have been created yet. 
	 * Strictly speaking this is not "according to the spec" as the user should be asked first whether it has any data for this question
	 * but seems usually always better to assume at least one 'repeat' (= 1 question). It doesn't make use of the Nodeset subclass (CHANGE?)
	 *
	 * See also: In JavaRosa, the documentation on the jr:template attribute.
	 * 
	 * @param {jQuery=} startNode Provides the scope (default is the whole data object) from which to start cloning.
	 */ 
	DataXML.prototype.cloneAllTemplates = function(startNode){
		var _this = this;
		////console.log('cloning all templates once');
		if (typeof startNode == 'undefined' || startNode.length === 0){
			startNode = this.$.find(':first');
		}
		//clone data nodes with template (jr:template=) attribute if it doesn't have any siblings of the same name already
		//strictly speaking this is not "according to the spec" as the user should be asked whether it has any data for this question
		//but I think it is almost always better to assume at least one 'repeat' (= 1 question)
		startNode.children('[template]').each(function(){
			////console.log('found data point with template attribute, name:'+$(this).prop('nodeName'));
			if (typeof $(this).parent().attr('template') == 'undefined' && $(this).siblings($(this).prop('nodeName')).not('[template]').length === 0){
				//console.log('going to clone template data node with name: ' + $(this).prop('nodeName'));
				$(this).clone().insertAfter($(this)).find('*').addBack().removeAttr('template');
				//cloneDataNode($(this));
			}
		});
		startNode.children().not('[template]').each(function(){
			_this.cloneAllTemplates($(this));
		});
		return;
	};

	/**
	 * Function: get
	 * 
	 * Returns jQuery Data Object (obsolete?)
	 * 
	 * Parameters:
	 * 
	 * Returns:
	 * 
	 *   JQuery Data Object
	 *   
	 * See Also:
	 * 
	 *    <nodes.get()>, which is always (?) preferred except for debugging.
	 *   
	 */
	DataXML.prototype.get = function(){
		return this.$ || null;
	};

	/**
	 * Function: getXML
	 * 
	 * Getter for data xml object. REMOVE <INSTANCE>?
	 * 
	 * Returns:
	 * 
	 *   data xml object
	 */
	DataXML.prototype.getXML = function(){
		return this.xml || null;
	};

	/**
	 * Obtains a cleaned up string of the data instance(s)
	 * @param  {boolean=} incTempl indicates whether repeat templates should be included in the return value (default: false)
	 * @param  {boolean=} incNs    indicates whether namespaces should be included in return value (default: true)
	 * @param  {boolean=} all     indicates whether all instances should be included in the return value (default: false)
	 * @return {string}           XML string
	 */
	DataXML.prototype.getStr = function(incTempl, incNs, all){
		var $docRoot, $dataClone, dataStr;
		dataStr = (new XMLSerializer()).serializeToString(this.getInstanceClone(incTempl, incNs, all)[0]);
		//remove tabs
		dataStr = dataStr.replace(/\t/g, '');
		return dataStr;
	};

	DataXML.prototype.getInstanceClone = function(incTempl, incNs, all){
		var $clone = (all) ? this.$.find(':first').clone() : this.node('> *:first').get().clone();
		return (incTempl) ? $clone : $clone.find('[template]').remove().end();
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
	DataXML.prototype.makeBugCompliant = function(expr, selector, index){
		var i, parentSelector, parentIndex, $target, $node, nodeName, $siblings, $parents;
		$target = this.node(selector, index).get();
		//console.debug('selector: '+selector+', target: ', $target);
		//add() sorts the resulting collection in document order
		$parents = $target.parents().add($target);
		//console.debug('makeBugCompliant() received expression: '+expr+' inside repeat: '+selector+' context parents are: ', $parents);
		//traverse collection in reverse document order
		for (i = $parents.length -1 ; i>=0 ; i--){
			$node = $parents.eq(i);
			nodeName = $node.prop('nodeName');
			$siblings = $node.siblings(nodeName+':not([template])');
			//if the node is a repeat node that has been cloned at least once (i.e. if it has siblings with the same nodeName)
			if(nodeName.toLowerCase() !== 'instance' && nodeName.toLowerCase() !== 'model' && $siblings.length > 0){
				parentSelector = form.generateName($node);
				parentIndex = $siblings.add($node).index($node);
				//console.log('calculated repeat 0-based index: '+parentIndex+' for repeat node with path: '+parentSelector);
				expr = expr.replace(new RegExp(parentSelector, 'g'), parentSelector+'['+(parentIndex+1)+']');
				//console.log('new expression: '+expr);
			}
		}
		return expr;
	};

	/**
	 * Evaluates an XPath Expression using XPathJS_javarosa (not native XPath 1.0 evaluator)
	 * 
	 * THIS FUNCTION DOESN'T SEEM TO WORK PROPERLY FOR NODE RESULTTYPES! otherwise:
	 * muliple nodes can be accessed by returned node.snapshotItem(i)(.textContent)
	 * a single node can be accessed by returned node(.textContent)
	 * 
	 * @param  {string} expr       [description]
	 * @param  {string=} resTypeStr boolean, string, number, nodes (best to always supply this)
	 * @param  {string=} selector   jQuery selector which will be use to provide the context to the evaluator
	 * @param  {number=} index      index of selector in document
	 * @return {?(number|string|boolean|jQuery)}            [description]
	 */
	DataXML.prototype.evaluate = function(expr, resTypeStr, selector, index){
		var i, j, error, context, contextDoc, instances, id, resTypeNum, resultTypes, result, $result, attr, 
			$collection, $contextWrapNodes, $repParents;

		console.debug('evaluating expr: '+expr+' with context selector: '+selector+', 0-based index: '+
			index+' and result type: '+resTypeStr);
		resTypeStr = resTypeStr || 'any';
		index = index || 0;

		expr = expr.trim();
		
		/* 
			creating a context doc is necessary for 3 reasons:
			- the primary instance needs to be the root (and it isn't as the root is <model> and there can be multiple <instance>s)
			- the templates need to be removed (though this could be worked around by adding the templates as data)
			- the hack described below with multiple instances.
		*/
		contextDoc = new DataXML(this.getStr(false, false));
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
		if (this.instanceSelectRegEx.test(expr)){
			instances = expr.match(this.instanceSelectRegEx);
			for (i=0 ; i<instances.length ; i++){
				id = instances[i].match(/[\'|\"]([^\'']+)[\'|\"]/)[1];
				expr = expr.replace(instances[i], '/node()/instance[@id="'+id+'"]');
				this.$.find(':first>instance#'+id).clone().appendTo(contextDoc.$.find(':first'));
			}
		}

		if (typeof selector !== 'undefined' && selector !== null) {
			context = contextDoc.$.xfind(selector).eq(index)[0];
			/**
			 * If the context for the expression is a node that is inside a repeat.... see makeBugCompliant()
			 */
			$collection = this.node(selector).get();
			if ($collection.length > 1){
				//console.log('going to inject position into: '+expr+' for context: '+selector+' and index: '+index);
				expr = this.makeBugCompliant(expr, selector, index);
			}
		}
		else{
			context = contextDoc.getXML();
		}
		
		resultTypes = {
			0 : ['any', 'ANY_TYPE'], 
			1 : ['number', 'NUMBER_TYPE', 'numberValue'],
			2 : ['string', 'STRING_TYPE', 'stringValue'], 
			3 : ['boolean', 'BOOLEAN_TYPE', 'booleanValue'], 
			7 : ['nodes', 'ORDERED_NODE_SNAPSHOT_TYPE'], 
			9 : ['node', 'FIRST_ORDERED_NODE_TYPE']
			//'node': ['FIRST_ORDERED_NODE_TYPE','singleNodeValue'], // does NOT work, just take first result of previous
		};

		//translate typeStr to number according to DOM level 3 XPath constants
		for (resTypeNum in resultTypes){

			resTypeNum = Number(resTypeNum);

			if (resultTypes[resTypeNum][0] == resTypeStr){
				break;
			}
			else{
				resTypeNum = 0;
			}
		}

		expr = expr.replace( /&lt;/g, '<');
		expr = expr.replace( /&gt;/g, '>'); 
		expr = expr.replace( /&quot;/g, '"');

		//var timeLap = new Date().getTime();
		//console.log('expr to test: '+expr+' with result type number: '+resTypeNum);
		try{
			result = document.evaluate(expr, context, null, resTypeNum, null);
			if (resTypeNum === 0){
				for (resTypeNum in resultTypes){
					resTypeNum = Number(resTypeNum);
					if (resTypeNum == Number(result.resultType)){
						result = (resTypeNum > 0 && resTypeNum < 4) ? result[resultTypes[resTypeNum][2]] : result;
						console.debug('evaluated '+expr+' to: ', result);
						//totTime = new Date().getTime() - timeStart;
						//xTime = new Date().getTime() - timeLap;
						//console.debug('took '+totTime+' millseconds (XPath lib only: '+ Math.round((xTime / totTime) * 100 )+'%)');
						//xpathEvalTime += totTime;
						//xpathEvalTimePure += xTime;
						return result;
					}
				}
				console.error('Expression: '+expr+' did not return any boolean, string or number value as expected');
				//console.debug(result);
			}
			else if (resTypeNum === 7){
				$result = $();
				//console.log('raw result', result);
				for (j=0 ; j<result.snapshotLength; j++){
					//console.debug(result.snapshotItem(j));
					$result = $result.add(result.snapshotItem(j));
				}
				//console.debug('evaluation returned nodes: ', $result);
				//totTime = new Date().getTime() - timeStart;
				//xTime = new Date().getTime() - timeLap;
				//console.debug('took '+totTime+' millseconds (XPath lib only: '+ Math.round((xTime / totTime) * 100 )+'%)');
				//xpathEvalTime += totTime;
				//xpathEvalTimePure += xTime;
				return $result;
			}
			console.debug('evaluated '+expr+' to: '+result[resultTypes[resTypeNum][2]]);
			//totTime = new Date().getTime() - timeStart;
			//xTime = new Date().getTime() - timeLap;
			//console.debug('took '+totTime+' millseconds (XPath lib only: '+ Math.round((xTime / totTime) * 100 )+'%)');
			//xpathEvalTime += totTime;
			//xpathEvalTimePure += xTime;
			return result[resultTypes[resTypeNum][2]];
		}
		catch(e){
			error = 'Error occurred trying to evaluate: '+expr+', message: '+e.message;
			console.error(error);
			$(document).trigger('xpatherror', error);
			loadErrors.push(error);
			//xpathEvalTime += new Date().getTime() - timeStart;
			//xpathEvalTimePure += new Date().getTime() - timeLap;s
			return null;
		}
	};

	/**
	 * Inner Class dealing with the HTML Form
	 * @param {string} selector jQuery selector of form
	 * @constructor
	 * @extends Form
	 */
	function FormHTML (selector){
		//there will be only one instance of FormHTML
		$form = $(selector);
		//used for testing
		this.$ = $form;
		this.branch = new this.Branch(this);
	}

	FormHTML.prototype.init = function(){
		var name, $required, $hint;
		//this.checkForErrors();
		if (typeof data == 'undefined' || !(data instanceof DataXML)){
			return console.error('variable data needs to be defined as instance of DataXML');
		}

		//var profiler = new Profiler('preloads.init()');
		this.preloads.init(this); //before widgets.init (as instanceID used in offlineFileWidget)
		//profiler.report();
		
		this.grosslyViolateStandardComplianceByIgnoringCertainCalcs(); //before calcUpdate!

		//profiler = new Profiler('calcupdate');
		this.calcUpdate(); //before repeat.init as repeat count may use a calculated item
		//profiler.report();

		//profiler = new Profiler('adding hint icons');
		//add 'hint' icon, could be moved to XSLT, but is very fast even on super large forms - 31 msecs on bench6 form
		if (!Modernizr.touch){
			$hint = '<span class="hint" ><i class="icon-question-sign"></i></span>';
			$form.find('.jr-hint ~ input, .jr-hint ~ select, .jr-hint ~ textarea').before($hint);
			$form.find('legend > .jr-hint').parent().find('span:last-child').after($hint);
			$form.find('.trigger > .jr-hint').parent().find('span:last').after($hint);
		}
		//profiler.report();

		//TODO: don't add to preload and calculated items
		//TODO: move to XSLT
		//profiler = new Profiler('brs');
		$form.find('select, input, textarea')
			.not('[type="checkbox"], [type="radio"], [readonly], #form-languages').before($('<br/>'));
		//profiler.report();
		
		/*
			Groups of radiobuttons need to have the same name. The name refers to the path of the instance node.
			Repeated radiobuttons would all have the same name which means they wouldn't work right.
			Therefore, radiobuttons store their path in data-name instead and cloned repeats will add a 
			different name attribute.
			TODO: move to XSLT
		 */
		$form.find('input[type="radio"]').each(function(){
			name = /**@type {string} */$(this).attr('name');
			$(this).attr('data-name', name);
		});

		//profiler = new Profiler('setLangs()');
		this.langs.init();//test: before itemsetUpdate
		//profiler.report();

		//profiler = new Profiler('repeat.init()');
		this.repeat.init(this); //after radio button data-name setting
		//profiler.report();

		//$form.find('h2').first().append('<span/>');//what's this for then?

		//profiler = new Profiler('itemsets initialization');
		this.itemsetUpdate();
		//profiler.report();
		
		//profiler = new Profiler('setting default values in form inputs');
		this.setAllVals();
		//profiler.report();
		
		//profiler = new Profiler('widgets initialization');
		this.widgets.init(); //after setAllVals()
		//profiler.report();
		
		//profiler = new Profiler('bootstrapify');
		this.bootstrapify(); 
		//profiler.report();
	
		//profiler = new Profiler('branch.init()');
		this.branch.init();
		//profiler.report();

		//profiler = new Profiler('outputUpdate initial');
		this.outputUpdate();
		//profiler.report();

		//profiler = new Profiler('setHints()');
		this.setHints();
		//profiler.report();

		this.setEventHandlers(); //after widgets init to make sure widget handlers are called before
		this.editStatus.set(false);
		//profiler.report('time taken across all functions to evaluate '+xpathEvalNum+' XPath expressions: '+xpathEvalTime);
	};

	/**
	 * Checks for general transformation or xml form errors by comparing stats. It is helpful,
	 * though an error is not always important
	 */
	FormHTML.prototype.checkForErrors = function(){
		var i,
			paths = [],
			total = {},
			$stats = $form.find('#stats');

		if ($stats.length > 0){
			total.jrItem= parseInt($stats.find('[id="jrItem"]').text(), 10);
			total.jrInput= parseInt($stats.find('[id="jrInput"]').text(), 10);
			total.jrItemset= parseInt($stats.find('[id="jrItemset"]').text(), 10);
			total.jrUpload = parseInt($stats.find('[id="jrUpload"]').text(), 10);
			total.jrTrigger = parseInt($stats.find('[id="jrTrigger"]').text(), 10);
			total.jrConstraint = parseInt($stats.find('[id="jrConstraint"]').text(), 10);
			total.jrRelevant = parseInt($stats.find('[id="jrRelevant"]').text(), 10);
			total.jrCalculate = parseInt($stats.find('[id="jrCalculate"]').text(), 10);
			total.jrPreload = parseInt($stats.find('[id="jrPreload"]').text(), 10);

			/** @type {number} */
			total.hRadio = $form.find('input[type="radio"]').length;
			total.hCheck = $form.find('input[type="checkbox"]').length;
			total.hSelect = $form.find('select:not(#form-languages)').length;
			total.hItemset = $form.find('.itemset-template').length;
			total.hOption = $form.find('select:not(#form-languages) > option[value!=""]').length;
			total.hInputNotRadioCheck = $form.find('textarea, input:not([type="radio"],[type="checkbox"])').length;
			total.hTrigger = $form.find('.trigger').length;
			total.hRelevantNotRadioCheck = $form.find('[data-relevant]:not([type="radio"],[type="checkbox"])').length;
			total.hRelevantRadioCheck = $form.find('input[data-relevant][type="radio"],input[data-relevant][type="checkbox"]').parent().parent('fieldset').length;
			total.hConstraintNotRadioCheck = $form.find('[data-constraint]:not([type="radio"],[type="checkbox"])').length;
			total.hConstraintRadioCheck = $form.find('input[data-constraint][type="radio"],input[data-constraint][type="checkbox"]').parent().parent('fieldset').length;
			total.hCalculate = $form.find('[data-calculate]').length;
			total.hPreload = $form.find('#jr-preload-items input').length;

			if (total.jrItemset === 0 && (total.jrItem !== ( total.hOption + total.hRadio + total.hCheck ) ) ) {
				console.error(' total number of option fields differs between XML form and HTML form');
			}
			if (total.jrItemset !== total.hItemset ) {
				console.error(' total number of itemset fields differs between XML form ('+total.jrItemset+') and HTML form ('+total.hItemset+')');
			}
			if ( ( total.jrInput + total.jrUpload ) !== ( total.hInputNotRadioCheck - total.hCalculate - total.hPreload ) ){
				console.error(' total number of input/upload fields differs between XML form and HTML form');
			}
			if ( total.jrTrigger != total.hTrigger ){
				console.error(' total number of triggers differs between XML form and HTML form');
			}
			if ( total.jrRelevant != ( total.hRelevantNotRadioCheck + total.hRelevantRadioCheck)){
				console.error(' total number of branches differs between XML form and HTML form (not a problem if caused by obsolete bindings in xml form)');
			}
			if ( total.jrConstraint != ( total.hConstraintNotRadioCheck + total.hConstraintRadioCheck)){
				console.error(' total number of constraints differs between XML form ('+total.jrConstraint+') and HTML form ('+
					(total.hConstraintNotRadioCheck + total.hConstraintRadioCheck)+')(not a problem if caused by obsolete bindings in xml form).'+
					' Note that constraints on &lt;trigger&gt; elements are ignored in the transformation and could cause this error too.');
			}
			if ( total.jrCalculate != total.hCalculate ){
				console.error(' total number of calculated items differs between XML form and HTML form');
			}
			if ( total.jrPreload != total.hPreload ){
				console.error(' total number of preload items differs between XML form and HTML form');
			}
			//probably resource intensive: check if all nodes mentioned in name attributes exist in $data
			
			$form.find('[name]').each(function(){
				if ($.inArray($(this).attr('name'), paths)) {
					paths.push($(this).attr('name'));
				}
			});
			//s//console.debug(paths);
			for (i=0 ; i<paths.length ; i++){
				////console.debug('checking: '+paths[i]);
				if (data.node(paths[i]).get().length < 1){
					console.error('Found name attribute: '+paths[i]+' that does not have a corresponding data node. Transformation error or XML form error (relative nodesets perhaps?');
				}
			}
		}
	};

	//this may not be the most efficient. Could also be implemented like Data.Nodeset;
	//also use for fieldset nodes (to evaluate branch logic) and also used to get and set form data of the app settings
	FormHTML.prototype.input = {
		//multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
		getWrapNodes: function($inputNodes){
			var type = this.getInputType($inputNodes.eq(0));
			return (type == 'radio' || type == 'checkbox') ? $inputNodes.closest('.restoring-sanity-to-legends') : 
				(type == 'fieldset') ? $inputNodes : $inputNodes.parent('label');
		},
		/** very inefficient, should actually not be used **/
		getProps : function($node){
			if ($node.length !== 1){
				return console.error('getProps(): no input node provided or multiple');
			}
			return {
				path: this.getName($node), 
				ind: this.getIndex($node),
				inputType: this.getInputType($node),
				xmlType: this.getXmlType($node),
				constraint: $node.attr('data-constraint'),
				relevant: $node.attr('data-relevant'),
				val: this.getVal($node),
				required: ($node.attr('required') !== undefined && $node.parents('.jr-appearance-label').length === 0) ? true : false,
				enabled: this.isEnabled($node),
				multiple: this.isMultiple($node)
			};
		},
		getInputType : function($node){
			var nodeName;
			if ($node.length !== 1){
				return ''; //console.error('getInputType(): no input node provided or multiple');
			}
			nodeName = $node.prop('nodeName').toLowerCase();
			if (nodeName == 'input'){
				if ($node.attr('type').length > 0){
					return $node.attr('type').toLowerCase();
				}   
				else return console.error('<input> node has no type');
			}
			else if (nodeName == 'select' ){
				return 'select';
			}
			else if (nodeName == 'textarea'){
				return 'textarea';
			}
			else if (nodeName == 'fieldset'){
				return 'fieldset';
			}
			else return console.error('unexpected input node type provided');
		},
		getXmlType : function($node){
			if ($node.length !== 1){
				return console.error('getXMLType(): no input node provided or multiple');
			}
			return $node.attr('data-type-xml');
		},
		getName : function($node){
			var name;
			if ($node.length !== 1){
				return console.error('getName(): no input node provided or multiple');
			}
			name = $node.attr('data-name') || $node.attr('name');
			return name || console.error('input node has no name');
			/*
			if (this.getInputType($node) == 'radio'){
				//indexSuffix = $node.attr('name').lastIndexOf('____');
				//if (indexSuffix > 0){
					return $node.attr('data-name');//.substr(0, indexSuffix);
				//}
			}
			if ($node.attr('name') && $node.attr('name').length > 0){
				return $node.attr('name');
			}
			else return console.error('input node has no name');*/
		},
		//the index that can be used to find the node in $data
		//NOTE: this function should be used sparingly, as it is CPU intensive!
		getIndex : function($node){
			var inputType, name, $wrapNode, $wrapNodesSameName;
			if ($node.length !== 1){
				return console.error('getIndex(): no input node provided or multiple');
			}
			
			inputType = this.getInputType($node);
			name = this.getName($node);
			$wrapNode = this.getWrapNodes($node);

			if (inputType === 'radio' && name !== $node.attr('name')){
				$wrapNodesSameName = this.getWrapNodes($form.find('[data-name="'+name+'"]'));
			}
			//fieldset.jr-group wraps fieldset.jr-repeat and can have same name attribute!)
			else if (inputType === 'fieldset' && $node.hasClass('jr-repeat')){
				$wrapNodesSameName = this.getWrapNodes($form.find('.jr-repeat[name="'+name+'"]'));
			}
			else if (inputType === 'fieldset' && $node.hasClass('jr-group')){
				$wrapNodesSameName = this.getWrapNodes($form.find('.jr-group[name="'+name+'"]'));
			}
			else {
				$wrapNodesSameName = this.getWrapNodes($form.find('[name="'+name+'"]'));
			}

			return $wrapNodesSameName.index($wrapNode);
		},
		isMultiple: function($node){
			return (this.getInputType($node) == 'checkbox' || $node.attr('multiple') !== undefined) ? true : false;
		},
		isEnabled: function($node){
			return !($node.prop('disabled') || $node.parents('fieldset:disabled').length > 0);
		},
		getVal : function($node){
			var inputType, values=[], name;
			if ($node.length !== 1){
				return console.error('getVal(): no inputNode provided or multiple');
			}
			inputType = this.getInputType($node);
			name = this.getName($node);
			
			if (inputType == 'radio'){
				return this.getWrapNodes($node).find('input:checked').val() || '';
			}
			//checkbox values bug in jQuery as (node.val() should work)
			if (inputType == 'checkbox'){       
				this.getWrapNodes($node).find('input[name="'+name+'"]:checked').each(function(){    
					values.push($(this).val());
				});
				return values;
			}
			return (!$node.val()) ? '' : ($.isArray($node.val())) ? $node.val().join(' ').trim() : $node.val().trim();
		},
		setVal : function(name, index, value){
			var $inputNodes, type, date, $target;//, 
				//values = value.split(' ');
			index = index || 0;

			if (this.getInputType($form.find('[data-name="'+name+'"]').eq(0)) == 'radio'){
				$target = this.getWrapNodes($form.find('[data-name="'+name+'"]')).eq(index).find('input[value="'+value+'"]');
				//why not use this.getIndex?
				$target.prop('checked', true);
				return;
			}
			else {
				//why not use this.getIndex?
				$inputNodes = this.getWrapNodes($form.find('[name="'+name+'"]')).eq(index).find('input, select, textarea');
				
				type = this.getInputType($inputNodes.eq(0)); 
				
				if ( type === 'file'){
					$inputNodes.eq(0).attr('data-loaded-file-name', value);
					//console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
					//  'this record for editing this file input field will remain unchanged.');
					return false;
				}

				if ( type === 'date' || type === 'datetime'){
					//convert current value (loaded from instance) to a value that a native datepicker understands
					//TODO test for IE, FF, Safari when those browsers start including native datepickers
					value = data.node().convert(value, type);

					console.debug('converting date before setting input field to: '+value);
				}
			}

			if (this.isMultiple($inputNodes.eq(0)) === true){               
				value = value.split(' ');
			}
			
			$inputNodes.val(value);
			
			return;
		}
	};

	/**
	 *  Uses current content of $data to set all the values in the form.
	 *  Since not all data nodes with a value have a corresponding input element, it could be considered to turn this
	 *  around and cycle through the HTML form elements and check for each form element whether data is available.
	 */
	FormHTML.prototype.setAllVals = function(){
		var index, name, value,
			that=this;  
		data.node(null, null, {noEmpty: true}).get().each(function(){
			try{
				value = $(this).text(); 
				name = that.generateName($(this));
				index = data.node(name).get().index($(this));
				console.debug('calling input.setVal with name: '+name+', index: '+index+', value: '+value);
				that.input.setVal(name, index, value);
			}
			catch(e){
				loadErrors.push('Could not load input field value with name: '+name+' and value: '+value);
			}
		});
		return;
	};

	FormHTML.prototype.langs = {
		init: function(){
			var lang,
				that = this,
				setOptionLangs,
				defaultLang = $form.find('#form-languages').attr('data-default-lang'),
				$langSelector = $('.form-language-selector');
			
			$('#form-languages').detach().appendTo($langSelector);//insertBefore($('form.jr').parent());
			
			if (!defaultLang || defaultLang === '') {
				defaultLang = $('#form-languages option:eq(0)').attr('value');
			}
			console.debug('default language is: '+defaultLang);
			$('#form-languages').val(defaultLang);

			if ($('#form-languages option').length < 2 ){
				$langSelector.hide();
				return;
			}
			$('#form-languages').change(function(event){
				lang = $(this).val();
				console.debug('form-language change event detected!');
				event.preventDefault();
				that.setAll(lang);
			});
		},
		setAll: function(lang){
			var that = this;
			$('#form-languages option').removeClass('active');
			$(this).addClass('active');

			$form.find('[lang]').removeClass('active').filter('[lang="'+lang+'"], [lang=""]').addClass('active');

			$form.find('select').each(function(){
				that.setSelect($(this));
			});
			//quickfix for labels and legends that do not contain a span.active without other class
			$form.find('legend span.active:not(.jr-hint, .jr-constraint-msg), label span.active:not(.jr-hint, .jr-constraint-msg)').each(function(){
				if ( $(this).text().trim().length === 0 ){
					$(this).text('[MISSING TRANSLATION]');
				}
			});

			$form.trigger('changelanguage');
		},
		//swap language of <select> <option>s
		setSelect: function($select){
			var value, /** @type {string} */curLabel, /** @type {string} */ newLabel;
			console.debug('setting select labels');
			$select.children('option').not('[value=""]').each(function(){
				curLabel = /** @type {string} */ $(this).text();
				value = $(this).attr('value');
				newLabel = $(this).parent('select').siblings('.jr-option-translations')
					.children('.active[data-option-value="'+value+'"]').text().trim();
				newLabel = (typeof newLabel !== 'undefined' && newLabel.length > 0) ? newLabel : curLabel;
				$(this).text(newLabel);
			});
		}
	};
		
	/**
	 * setHints updates the hints. It is called whenever the language or output value is changed.
	 * @param { {outputsOnly: boolean}=} options options
	 */
	FormHTML.prototype.setHints = function(options){
		//var profiler = new Profiler('setting hints');
		if (!Modernizr.touch){
			var hint, $hint, $hints, $wrapNode, outputsOnly;

			outputsOnly = (options && options.outputsOnly) ? options.outputsOnly : false;
			
			$hints = (outputsOnly) ? $form.find('*>.jr-hint>.jr-output').parent() : $form.find('*>.jr-hint');

			$hints.parent().each(function(){
				if ($(this).prop('nodeName').toLowerCase() !== 'label' && $(this).prop('nodeName').toLowerCase() !== 'fieldset' ){
					$wrapNode = $(this).parent('fieldset');
				}
				else{
					$wrapNode = $(this);
				}
				$hint = $wrapNode.find('.hint');

				hint = $(this).find('.jr-hint.active').text().trim();

				if (hint.length > 0){
					$hint.attr('title', hint);
				}
				else{
					$hint.removeAttr('title');
				}
				$hint.tooltip('fixTitle').tooltip({placement: 'right'});
			});
		}
		//profiler.report();
	};

	FormHTML.prototype.editStatus = {
		set : function(status){
			$form.attr('data-edited',Boolean(status));//.toString());
			$form.trigger('edit', status);
		},
		get : function(){
			return ($form.attr('data-edited') === 'true') ? true : false;
		}
	};

	FormHTML.prototype.recordName = {
		set : function(key){
			$form.attr('data-stored-with-key', key);
			//$('#record-name').text(key);
			$form.find('h2 span').text(key);
		},
		get : function() {
			return $form.attr('data-stored-with-key') || null;
		},
		reset : function(){
			$form.removeAttr('data-stored-with-key');
		}
	};


	FormHTML.prototype.recordStatus = {
		set : function(markedFinal){
			$form.attr('data-stored-final', markedFinal.toString());
		},
		get : function() {
			return ($form.attr('data-stored-final') === 'true') ? true : false;
		},
		reset : function(){
			$form.removeAttr('data-stored-final');
		}
	};

	/**
	 * Branch Class (inherits properties of FormHTML Class) is used to manage skip logic
	 *
	 * @constructor
	 */
	FormHTML.prototype.Branch = function(parent){
		/**
		 * Initializes branches, sets delegated event handlers
		 */
		this.init = function(){
			this.update();
		};
		/**
		 * Updates branches based on changed input fields
		 * 
		 * @param  {string=} changedNodeNames [description]
		 * @return {?boolean}                  [description]
		 */
		this.update = function(changedNodeNames){
			var i, p, $branchNode, result, namesArr, cleverSelector, insideRepeat, insideRepeatClone, cacheIndex,
				relevantCache = {},
				alreadyCovered = [],
				that = this,
				evaluations = 0,
				clonedRepeatsPresent;

			//var profiler = new Profiler('branch update');
			namesArr = (typeof changedNodeNames !== 'undefined') ? changedNodeNames.split(',') : [];
			cleverSelector = (namesArr.length > 0) ? [] : ['[data-relevant]'];
			
			for (i=0 ; i<namesArr.length ; i++){
				cleverSelector.push('[data-relevant*="'+namesArr[i]+'"]');
			}

			clonedRepeatsPresent = (repeatsPresent && $form.find('.jr-repeat.clone').length > 0) ? true : false;

			$form.find(cleverSelector.join()).each(function(){
				//note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
				if ($.inArray($(this).attr('name'), alreadyCovered) !== -1){
					return;
				}
				p = {};
				cacheIndex = null;
				
				p.relevant = $(this).attr('data-relevant');
				p.path = parent.input.getName($(this));
				
				//p = parent.input.getProps($(this));
				//$branchNode = parent.input.getWrapNodes($(this));
				$branchNode = $(this).closest('.jr-branch');
				
				if($branchNode.length !== 1){
					if ($(this).parents('#jr-calculated-items').length === 0){
						console.error('could not find branch node for ', $(this));
					}
					return;
				}
				/* 
					Determining ancestry is expensive. Using the knowledge most forms don't use repeats and 
					if they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
					The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
					(6-7 seconds of loading time on the bench6 form)
				*/
				insideRepeat = (clonedRepeatsPresent && $branchNode.closest('.jr-repeat').length > 0) ? true : false;
				insideRepeatClone = (clonedRepeatsPresent && $branchNode.closest('.jr-repeat.clone').length > 0) ? true : false;
				/*
					Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
					It can be safely set to 0 for other branches.
				 */
				p.ind = (insideRepeatClone) ? parent.input.getIndex($(this)) : 0;
				/*
					Caching is only possible for expressions that do not contain relative paths to nodes.
					So, first do a *very* aggresive check to see if the expression contains a relative path. 
					This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
					expression, which may prove to be incorrect.
				 */
				if (p.relevant.indexOf('..') === -1){
					/*
						For now, let's just not cache relevants inside a repeat. 
					 */
					//if ($branchNode.parents('.jr-repeat').length === 0){
					if (!insideRepeat){
						cacheIndex = p.relevant;
					}
					else{
						//cacheIndex = p.relevant+'__'+p.path+'__'+p.ind;
					}
				}
				if (cacheIndex && typeof relevantCache[cacheIndex] !== 'undefined'){
					result = relevantCache[cacheIndex];
				}
				else{
					result = that.evaluate(p.relevant, p.path, p.ind);
					evaluations++;
					relevantCache[cacheIndex] = result;
				}

				if (!insideRepeat){
					alreadyCovered.push($(this).attr('name'));
				}

				that.process($branchNode, result);
			});
			//console.debug('already covered: ', alreadyCovered);
			//console.debug('relevant expression results cached:', relevantCache);
			//profiler.report();
			return true;
		},
		/**
		 * evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
		 * @param  {string} expr        [description]
		 * @param  {string} contextPath [description]
		 * @param  {number} index       [description]
		 * @return {boolean}             [description]
		 */
		this.evaluate = function(expr, contextPath, index){
			var result = data.evaluate(expr, 'boolean', contextPath, index);
			return result;
		},
		/**
		 * Processes the evaluation result for a branch
		 * @param  {jQuery} $branchNode [description]
		 * @param  {boolean} result      [description]
		 */
		this.process = function($branchNode, result){
			//for mysterious reasons '===' operator fails after Advanced Compilation even though result has value true 
			//and type boolean
			if (result === true){
				console.log('going to enable ', $branchNode);
				this.enable($branchNode);
			}
			else {
				console.log('going to disable ', $branchNode);
				this.disable($branchNode);
			}
		},
		/**
		 * whether branch currently has 'relevant' state
		 * @param  {jQuery} $branchNode [description]
		 * @return {boolean}             [description]
		 */
		this.selfRelevant = function($branchNode){
			return !$branchNode.hasClass('disabled') && !$branchNode.hasClass('pre-init');
		},
		/**
		 * whether branch currently only has 'relevant' ancestors
		 * @param  {jQuery} $branchNode [description]
		 * @return {boolean}             [description]
		 */
		this.ancestorRelevant = function($branchNode){
			return ($branchNode.parents('.disabled').length === 0);
		},
		/**
		 * Enables and reveals a branch node/group
		 * 
		 * @param  {jQuery} $branchNode The jQuery object to reveal and enable
		 */
		this.enable = function($branchNode){
			var type,
				that = this;
			if (!this.selfRelevant($branchNode)){
				console.debug('enabling branch with name: '+$branchNode.attr('name'));
				
				$branchNode.removeClass('disabled pre-init').show(250, function(){
					//to recalculate table column widths
					if (that.ancestorRelevant($branchNode)){
						parent.widgets.tableWidget($branchNode);
					}
				});

				type = $branchNode.prop('nodeName').toLowerCase();

				if (type == 'label') {
					$branchNode.children('input:not(.force-disabled), select, textarea').prop('disabled', false);
				}
				else{
					$branchNode.prop('disabled', false);

					/*
					A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503 
					where the file inputs end up in a weird partially enabled state. 
					Refresh the state by disabling and enabling the file inputs again.
					*/
					$branchNode.find('*:not(.jr-branch) input[type="file"]:not(.force-disabled, [data-relevant])')
						.prop('disabled', true).prop('disabled', false);
				}
			}
		};
		/**
		 * Disables and hides a branch node/group
		 * 
		 * @param  {jQuery} $branchNode The jQuery object to hide and disable
		 */
		this.disable = function($branchNode){
			var type = $branchNode.prop('nodeName').toLowerCase(),
				virgin = $branchNode.hasClass('pre-init');
			if (this.selfRelevant($branchNode) || virgin){
				console.debug('disabling branch');
				$branchNode.addClass('disabled');//;

				if (typeof settings !== 'undefined' && typeof settings.showBranch !== 'undefined' && !settings.showBranch){
					$branchNode.hide(250);
				} 
				
				//if the branch was previously enabled
				if (!virgin){
					$branchNode.clearInputs('change');
				
					//all remaining fields marked as invalid can now be marked as valid
					$branchNode.find('.invalid-required, .invalid-constraint').find('input, select, textarea').each(function(){
						parent.setValid($(this));
					});
				}
				else{
					$branchNode.removeClass('pre-init');
				}

				if (type == 'label'){
					$branchNode.children('input, select, textarea').prop('disabled', true);
				}
				else{
					$branchNode.prop('disabled', true);
				}
			}
		};
	};

	//$.extend(FormHTML.prototype.Branch.prototype, FormHTML.prototype);


	/**
	 * Updates itemsets
	 * @param  {string=} changedDataNodeNames node names that were recently changed, separated by commas
	 */
	FormHTML.prototype.itemsetUpdate = function(changedDataNodeNames){
		console.log('checking if itemsets need updating because values of following nodes changed: '+changedDataNodeNames);
		//TODO: test with very large itemset
		var clonedRepeatsPresent, insideRepeat, insideRepeatClone,
			that = this,
			cleverSelector = [],
			needToUpdateLangs = false,
			itemsCache = {};

		if (typeof changedDataNodeNames == 'undefined'){
			cleverSelector = ['.itemset-template'];
		}
		else{ 
			$.each(changedDataNodeNames.split(','), function(index, value){
				cleverSelector.push('.itemset-template[data-items-path*="'+value+'"]');
			});
		}

		cleverSelector = cleverSelector.join(',');
		clonedRepeatsPresent = (repeatsPresent && $form.find('.jr-repeat.clone').length > 0) ? true : false;
		
		$form.find(cleverSelector).each(function(){
			var $htmlItem, $htmlItemLabels, value, $instanceItems, index, context,
				$template = $(this),
				newItems = {},
				prevItems = $template.data(),
				templateNodeName = $(this).prop('nodeName').toLowerCase(),
				$input = (templateNodeName === 'label') ? $(this).children('input').eq(0) : $(this).parent('select'),
				$labels = $template.closest('label, select').siblings('.itemset-labels'),
				itemsXpath = $template.attr('data-items-path'),
				labelType = $labels.attr('data-label-type'),
				labelRef = $labels.attr('data-label-ref'),
				valueRef = $labels.attr('data-value-ref');

			context = that.input.getName($input);
			/*
				Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
				It can be safely set to 0 for other branches.
			*/
			insideRepeat = (clonedRepeatsPresent && $input.closest('.jr-repeat').length > 0) ? true : false;
			insideRepeatClone = (clonedRepeatsPresent && $input.closest('.jr-repeat.clone').length > 0) ? true : false;
				
			index = (insideRepeatClone) ? that.input.getIndex($input) : 0;

			if (typeof itemsCache[itemsXpath] !== 'undefined'){
				$instanceItems = itemsCache[itemsXpath];
				console.debug('using cached itemset items result for '+itemsXpath);//, $instanceItems);
			}
			else{
				console.debug('no cache for '+itemsXpath+', need to evaluate XPath');
				$instanceItems = data.evaluate(itemsXpath, 'nodes', context, index);
				if (!insideRepeat){
					itemsCache[itemsXpath] = $instanceItems;
				}
			}

			// this property allows for more efficient 'itemschanged' detection
			newItems.length = $instanceItems.length; 
			//this may cause problems for large itemsets. Use md5 instead?
			newItems.text = $instanceItems.text(); 

			//console.debug('previous items: ', prevItems);
			//console.debug('new items: ', newItems);

			if (newItems.length === prevItems.length && newItems.text === prevItems.text){
				console.debug('itemset unchanged');
				return;
			}

			$template.data(newItems);
			
			//clear data values through inputs. Note: if a value exists, 
			//this will trigger a dataupdate event which may call this update function again
			$(this).closest('label > select, fieldset > label').parent()
				.clearInputs('change')
				.find(templateNodeName).not($template).remove();
			$(this).parent('select').siblings('.jr-option-translations').empty();

			$instanceItems.each(function(){
				$htmlItem = $('<root/>');
				$template
					.clone().appendTo($htmlItem)
					.removeClass('itemset-template')
					.addClass('itemset')
					.removeAttr('data-items-path');
				
				$htmlItemLabels = (labelType === 'itext') ? 
					$labels.find('[data-itext-id="'+$(this).children(labelRef).text()+'"]').clone() : 
					$('<span class="active" lang="">'+$(this).children(labelRef).text()+'</span>');
				
				value = /**@type {string}*/$(this).children(valueRef).text();
				$htmlItem.find('[value]').attr('value', value);

				if (templateNodeName === 'label'){
					$htmlItem.find('input')
						.after($htmlItemLabels);
					$labels.before($htmlItem.find(':first'));
				}
				else if (templateNodeName === 'option') { 
					if ($htmlItemLabels.length === 1){
						$htmlItem.find('option').text($htmlItemLabels.text());
					}
					$htmlItemLabels
						.attr('data-option-value', value)
						.attr('data-itext-id', '')
						.appendTo($labels.siblings('.jr-option-translations'));
					$template.siblings().addBack().last().after($htmlItem.find(':first'));
				}
			});
			if ($input.prop('nodeName').toLowerCase() === 'select') {
				//populate labels (with current language)
				that.langs.setSelect($input);
				//update widget
				$input.trigger('changeoption');
			}
		});
		console.log('itemset update finished');
	};

	/**
	 * Updates output values, optionally filtered by those values that contain a changed node name
	 * 
	 * @param  {string=} changedNodeNames Comma-separated node names that may have changed
	 */
	FormHTML.prototype.outputUpdate = function(changedNodeNames){
		var i, expr, namesArr, cleverSelector, clonedRepeatsPresent, insideRepeat, insideRepeatClone, $context, context, index,
			outputChanged = false,
			outputCache = {},
			val = '',
			that = this;

		namesArr = (typeof changedNodeNames !== 'undefined') ? changedNodeNames.split(',') : [];
		cleverSelector = (namesArr.length > 0) ? [] : ['.jr-output[data-value]'];
		for (i=0 ; i<namesArr.length ; i++){
			cleverSelector.push('.jr-output[data-value*="'+namesArr[i]+'"]');
		}
		clonedRepeatsPresent = (repeatsPresent && $form.find('.jr-repeat.clone').length > 0) ? true : false;

		$form.find(':not(:disabled) span.active').find(cleverSelector.join()).each(function(){
			expr = $(this).attr('data-value');
			//context = that.input.getName($(this).closest('fieldset'));
			
			/*
				Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
				should look at the HTML input to determine the context. 
				So, context is either the input name attribute (if output is inside input label),
				or the parent with a name attribute
				or the whole doc
			*/
			$context = ($(this).parent('span').parent('label').find('[name]').eq(0).length === 1) ? 
				$(this).parent().parent().find('[name]:eq(0)') : 
				$(this).parent('span').parent('legend').parent('fieldset').find('[name]').eq(0).length === 1 ?
				$(this).parent().parent().parent().find('[name]:eq(0)') : $(this).closest('[name]');
			context = that.input.getName($context);
			insideRepeat = (clonedRepeatsPresent && $(this).closest('.jr-repeat').length > 0);
			insideRepeatClone = (clonedRepeatsPresent && $(this).closest('.jr-repeat.clone').length > 0);
			index = (insideRepeatClone) ? that.input.getIndex($context) : 0;

			if (typeof outputCache[expr] !== 'undefined'){
				val = outputCache[expr];
			}
			else{
				val = data.evaluate(expr, 'string', context, index);
				if (!insideRepeat){
					outputCache[expr] = val;
				}
			}
			if ($(this).text !== val){
				$(this).text(val);
				outputChanged = true;
			}
		});

		//hints may have changed too
		if (outputChanged){
			this.setHints({outputsOnly: true});
		}
	};

	/**
	 * See https://groups.google.com/forum/?fromgroups=#!topic/opendatakit-developers/oBn7eQNQGTg
	 * and http://code.google.com/p/opendatakit/issues/detail?id=706
	 * 
	 * Once the following is complete this function can and should be removed:
	 * 
	 * 1. ODK Collect starts supporting an instanceID preload item (or automatic handling of meta->instanceID without binding)
	 * 2. Pyxforms changes the instanceID binding from calculate to preload (or without binding)
	 * 3. Formhub has re-generated all stored XML forms from the stored XLS forms with the updated pyxforms
	 * 
	 */
	FormHTML.prototype.grosslyViolateStandardComplianceByIgnoringCertainCalcs = function(){
		var $culprit = $form.find('[name$="/meta/instanceID"][data-calculate]');
		if ($culprit.length > 0){
			console.debug("Found meta/instanceID with binding that has a calculate attribute and removed this calculation. It ain't right!");
			$culprit.removeAttr('data-calculate');
		}
	};

	/**
	 * Updates calculated items
	 * @param {string=} changedNodeNames - [type/description]
	 */
	FormHTML.prototype.calcUpdate = function(changedNodeNames){
		var i, index, name, expr, dataType, relevant, relevantExpr, result, constraint, namesArr, valid, cleverSelector, $dataNodes;
		
		//console.log('updating calculated items with expressions that contain: '+changedNodeNames);
		namesArr = (typeof changedNodeNames !== 'undefined') ? changedNodeNames.split(',') : [];
		cleverSelector = (namesArr.length > 0) ? [] : ['input[data-calculate]'];
		for (i=0 ; i<namesArr.length ; i++){
			cleverSelector.push('input[data-calculate*="'+namesArr[i]+'"], input[data-relevant*="'+namesArr[i]+'"]');
		}
			
		$form.find('#jr-calculated-items').find(cleverSelector.join()).each(function(){
			name = $(this).attr('name');
			expr = $(this).attr('data-calculate');
			dataType = $(this).attr('data-type-xml');
			constraint = $(this).attr('data-constraint'); //obsolete?
			relevantExpr = $(this).attr('data-relevant');
			relevant = (relevantExpr) ? data.evaluate(relevantExpr, 'boolean', name) : true;
			$dataNodes = data.node(name).get();
			$dataNodes.each(function(index){
				//not sure if using 'string' is always correct
				result = (relevant) ? data.evaluate(expr, 'string', name, index) : ''; 
				//console.debug('evaluated calculation: '+expr+' with result: '+result);
				valid = data.node(name, index).setVal(result, constraint, dataType);
				//if(valid !== 'undefined' && valid === false){
					//console.log('Calculated item with name: '+name+' value was set but is not valid!');
				//}
			});

		});
	};

	FormHTML.prototype.bootstrapify = function(){               
		//if no constraintmessage use a default
		//TODO: move to XSLT
		$form.addClass('clearfix')
			.find('label, legend').each(function(){
			var $label = $(this);
			if ($label.siblings('legend').length === 0 && 
				$label.parent('#jr-calculated-items, #jr-preload-items').length === 0 &&
				$label.find('.jr-constraint-msg').length === 0 && 
				($label.prop('nodeName').toLowerCase() == 'legend' || 
					$label.children('input.ignore').length !== $label.children('input').length  ||
					$label.children('select.ignore').length !== $label.children('select').length ||
					$label.children('textarea.ignore').length !== $label.children('textarea').length ) ){
				$label.prepend('<span class="jr-constraint-msg active" lang="">Value not allowed</span>');
			}
		});

		$form.find('.trigger').addClass('alert alert-block');
		//$form.find('label:not(.geo), fieldset').addClass('clearfix');
		/*$form.find(':checkbox, :radio').each(function(){
			var $p = $(this).parent('label'); 
			$(this).detach().prependTo($p);
		});*/

		//move constraint message to bottom of question and add message for required (could also be done in XSLT)
		//TODO: move to XSLT
		$form.find('.jr-constraint-msg').parent().each(function(){
			var $msg = $(this).find('.jr-constraint-msg').detach(),
				$wrapper = $(this).closest('label, fieldset');
			$wrapper.append($msg);
			$msg.after('<span class="jr-required-msg active" lang="">This field is required</span>');
		});

		if (!Modernizr.touch){
			$('.form-header [title]').tooltip({placement: 'bottom'});
		}
	};

	/**
	 * Enhancements to the basic built-in html behaviour of form controls
	 *
	 * In the future it would probably be wise to standardize this. E.g. each form control widget needs to:
	 * - have a widget class attribute
	 * - load default values from the original input element
	 * - have a 'swap language' function responding to a 'changelanguage' event
	 * - disable when its parent branch is hidden (also when hidden upon initialization)
	 * - enable when its parent branch is revealed 
	 * - allow setting an empty value (that empties node in instance)
	 * - input elements inside widgets need to get the ignore class
	 * - send a focus event to the original input when the widget gets focus
	 * - for extra robustness: if the widget already exists, destroy it first
	 *
	 * Considering the ever-increasing code size of the widgets and their dependence on the UI library being used,
	 * it would be good to move them to a separate javascript file. 
	 * (If typeof widgets === undefined, widgets are not loaded)
	 * 
	 * @type {Object}
	 */
	FormHTML.prototype.widgets = {
		/**
		 * Initializes widgets. 
		 * (Important:  Widgets should be initalized after instance values have been loaded in $data as well as in input fields)
		 * @param  {jQuery=} $group optionally only initialize widgets inside a group (default is inside whole form)
		 */
		init : function($group){
			/* 
				For the sake of convenience it is assumed that the $group parameter is only provided when initiating
				widgets inside newly cloned repeats and that this function has been called before for the whole form.
			*/
			this.repeat = ($group) ? true : false;
			this.$group = $group || $form;
			this.readonlyWidget(); //call before other widgets
			this.pageBreakWidget();

			/*
				Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
				already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
				existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
				This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then 
				attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
			*/
			//browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
			//webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
			var badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;
			if (!Modernizr.touch || !Modernizr.inputtypes.date || badSamsung.test(navigator.userAgent)){
				this.dateWidget();
			}
			if (!Modernizr.touch || !Modernizr.inputtypes.time){
				this.timeWidget();
			}
			if (!Modernizr.touch || !Modernizr.inputtypes.datetime){
				this.dateTimeWidget();
			}
			if (!Modernizr.touch){
				this.selectWidget();
			}
			else{
				this.mobileSelectWidget();
				this.touchRadioCheckWidget();
			}
			this.geopointWidget();
			this.tableWidget();
			this.spinnerWidget();
			this.sliderWidget();    
			this.barcodeWidget();
			this.offlineFileWidget();
			this.mediaLabelWidget();
			this.radioEventsWidget();
			this.radioCheckWidget();
			this.radioUnselectWidget();
		},
		//for debugging
		radioEventsWidget : function(){
			$form.on('click', 'label', function(){console.log('click label');});
			$form.on('focus', 'label', function(){console.log('focus label');});
			$form.on('click', 'input[type="radio"], input[type="checkbox"]', function(){console.log('click input, checked:'+ $(this).is(':checked'));});
			$form.on('focus', 'input[type="radio"], input[type="checkbox"]', function(){console.log('focus input, checked:'+ $(this).is(':checked'));});
			$form.on('change', 'input[type="radio"], input[type="checkbox"]', function(){console.log('change input, checked:'+ $(this).is(':checked'));});
		},
		//applies a data-checked attribute to the parent label of a checked checkbox and radio button
		//used in radioUnselect widget and touch screen styling
		radioCheckWidget : function(){
			if (!this.repeat){
				var $label;
				$form.on('click', 'input[type="radio"]:checked', function(event){
					$(this).parent('label').siblings().removeAttr('data-checked').end().attr('data-checked', 'true');
				});
				$form.on('click', 'input[type="checkbox"]', function(event){
					$label = $(this).parent('label');
					if ($(this).is(':checked')) $label.attr('data-checked', 'true');
					else $label.removeAttr('data-checked');
				});
				//defaults
				$form.find('input[type="radio"]:checked, input[type="checkbox"]:checked').parent('label').attr('data-checked', 'true');
			
			}
		},
		radioUnselectWidget : function(){
			if (!this.repeat){
				console.debug('initializing radio unselect widget');
				$form.on('click', '[data-checked]>input[type="radio"]', function(event){
					console.debug('registered click event on label with data-checked attribute');
					$(this).prop('checked', false).trigger('change').parent().removeAttr('data-checked');
				});
			}
		},
		//TODO: check performance difference if this is done in pure CSS instead of with the help of javascript.
		touchRadioCheckWidget : function(){
			if (!this.repeat){
				$form.find('fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact, .jr-appearance-label, .jr-appearance-list-nolabel )')
					.children('label')
					.children('input[type="radio"], input[type="checkbox"]')
					.parent('label')
					.addClass('btn-radiocheck');
			}
		},
		dateWidget : function(){
			this.$group.find('input[type="date"]').each(function(){
				var $dateI = $(this),
					$p = $(this).parent('label'),
					startView = ($p.hasClass('jr-appearance-month-year')) ? 'year' :
						($p.hasClass('jr-appearance-year')) ? 'decade' : 'month',
					targetEvent = ($p.hasClass('jr-appearance-month-year')) ? 'changeMonth' :
						($p.hasClass('jr-appearance-year')) ? 'changeYear' : 'changeDate',
					format = (startView === 'year') ? 'yyyy-mm' :
						(startView === 'decade') ? 'yyyy' : 'yyyy-mm-dd',
					$fakeDate = $('<div class="widget date"><input class="ignore input-small" readonly="readonly" type="text" value="'+$(this).val()+'" placeholder="'+format+'" />'+
						'<button class="btn-reset"><i class="icon icon-trash"></i></button></div>'),
					$fakeDateReset = $fakeDate.find('.btn-reset'),
					$fakeDateI = $fakeDate.find('input');
				$dateI.next('.widget.date').remove();
				$dateI.hide().after($fakeDate);

				//copy manual changes to original date input field
				$fakeDateI.on('change', function(){
					console.debug('fakedate input field change detected. new value: '+$(this).val());
					var date,
						value = $(this).val();
					if(value.length > 0){
						value = (format === 'yyyy-mm') ? value+'-01' : (format === 'yyyy') ? value+'-01-01' : value;
						value = data.node().convert(value, 'date');
					}
					if ($dateI.val() !== value) { 
						$dateI.val(value).trigger('change').blur();
					}
					return false;
				});

				//focus and blur events are used to check whether to display the 'required' message 
				$fakeDateI.on('focus blur', function(event){
					$dateI.trigger(event.type);
				});

				//reset button
				$fakeDateReset.on('click', function(event){
					$fakeDateI.val('').trigger('change').datepicker('update');
				});

				$fakeDateI.datepicker({
					format:         format, 
					autoclose:      true, 
					todayHighlight: true, 
					startView:      startView,
					orientation:    'top'
				})
					// copy changes made by datepicker to original input field
					.on('changeDate', function(e){
						var value = $(this).val();
						$dateI.val(value).trigger('change').blur();
					});
			});
		},
		timeWidget : function(){
			this.$group.find('input[type="time"]').each(function(){
				var $timeI = $(this),
					$p = $(this).parent('label'),
					timeVal = $(this).val(),
					$fakeTime = $('<div class="widget bootstrap-timepicker">'+
						'<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="'+timeVal+'" placeholder="hh:mm" />'+
						'<button class="btn-reset"><i class="icon icon-trash"></i></button></div>'),
					$fakeTimeReset = $fakeTime.find('.btn-reset'),
					$fakeTimeI = $fakeTime.find('input');

				$timeI.next('.widget.bootstrap-timepicker-component').remove();
				$timeI.hide().after($fakeTime);
				$fakeTimeI.timepicker({
					defaultTime: (timeVal.length > 0) ? timeVal : 'current',
					showMeridian: false
				}).val(timeVal);

				//the time picker itself has input elements
				$fakeTime.find('input').addClass('ignore');

				$fakeTimeI.on('change', function(){
					$timeI.val($(this).val()).trigger('change').blur();
					return false;
				});

				//reset button
				$fakeTimeReset.on('click', function(event){
					$fakeTimeI.val('').trigger('change');
				});

				$fakeTimeI.on('focus blur', function(event){
					$timeI.trigger(event.type);
				});
			});
		}, 
		//Note: this widget doesn't offer a way to reset a datetime value in the instance to empty
		dateTimeWidget : function(){
			this.$group.find('input[type="datetime"]').each(function(){ 
				var $dateTimeI = $(this),
					/*
						Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
						the timezone information (especially for instances-to-edit) if the values are not edited (the
						original entry may have been done in a different time zone than the edit). However, 
						values shown in the widget should reflect the local time representation of that value.
					 */
					val = ($(this).val().length > 0) ? new Date($(this).val()).toISOLocalString() : '',
					vals = val.split('T'),
					dateVal = vals[0], 
					timeVal = (vals[1] && vals[1].length > 4) ? vals[1].substring(0,5) : '',
					$fakeDate = $('<div class="date" >'+
						'<input class="ignore input-small" type="text" readonly="readonly" value="'+dateVal+'" placeholder="yyyy-mm-dd"/>'+
						'</div>'),
					$fakeTime = $('<div class="bootstrap-timepicker">'+
						'<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="'+timeVal+'" placeholder="hh:mm"/>'+
						'<button class="btn-reset"><i class="icon icon-trash"></i></button></div>'),
					$fakeDateTimeReset = $fakeTime.find('.btn-reset'),
					$fakeDateI = $fakeDate.find('input'),
					$fakeTimeI = $fakeTime.find('input');

				$dateTimeI.next('.widget.datetimepicker').remove();
				$dateTimeI.hide().after('<div class="datetimepicker widget" />');
				$dateTimeI.siblings('.datetimepicker').append($fakeDate).append($fakeTime);
				$fakeDateI.datepicker({format: 'yyyy-mm-dd', autoclose: true, todayHighlight: true});
				$fakeTimeI.timepicker({defaultTime: (timeVal.length > 0) ? 'value' : 'current', showMeridian: false}).val(timeVal);
				
				//the time picker itself has input elements
				$fakeTime.find('input').addClass('ignore');

				$fakeDateI.on('change changeDate', function(){
					changeVal();
					return false;
				});
				$fakeTimeI.on('change', function(){
					changeVal();
					return false;
				});
				$fakeDateI.add($fakeTimeI).on('focus blur', function(event){
					$dateTimeI.trigger(event.type);
				});
				//reset button
				$fakeDateTimeReset.on('click', function(event){
					$fakeDateI.val('').trigger('change').datepicker('update');
					$fakeTimeI.val('').trigger('change');
				});

				function changeVal(){
					if ($fakeDateI.val().length > 0 && $fakeTimeI.val().length > 0){
						var d = $fakeDateI.val().split('-'),
							t = $fakeTimeI.val().split(':');
						console.log('changing datetime');
						$dateTimeI.val(new Date(d[0], d[1]-1, d[2], t[0], t[1]).toISOLocalString()).trigger('change').blur();
					}
					else{
						$dateTimeI.val('').trigger('change').blur();
					}
				}
			});
		},
		selectWidget : function(){
			//$form.find('select option[value=""]').remove(); issue with init value empty
			this.$group.find('select').not('#form-languages').selectpicker();
			if (!this.repeat){
				$form.on('changelanguage', function(){
					//update all pickers in form
					$form.find('select').selectpicker('update');
				});
				$form.on('changeoption', 'select', function(){
					//onsole.debug('option change detected, going to update select widget', $(this));
					//update (itemselect) picker on which event was triggered because the options changed
					$(this).selectpicker('update');
				});
			}
		},
		mobileSelectWidget : function(){
			var showSelectedValues = function($select){
				var values = ($.isArray($select.val())) ? $select.val() : [$select.val()],
					valueText = [];
				console.log('mobileSelectWidget change event detected, values selected: ', values);
				for (var i = 0; i < values.length ; i++){
					valueText.push($(this).find('option[value="'+values[i]+'"]').text());
				}
				$select.siblings('.widget.mobileselect').remove();
				$select.after('<span class="widget mobileselect">'+values.join(', ')+'</span>');
			};
			$form.on('change', 'select[multiple]', function(){
				showSelectedValues($(this));
				return true;
			});
			//show defaults
			$form.find('select[multiple]').each(function(){showSelectedValues($(this));});
		},
		//transforms triggers to page-break elements //REMOVE WHEN NIGERIA FORMS NO LONGER USE THIS
		pageBreakWidget : function(){
			if (!this.repeat){
				$form.find('.jr-appearance-page-break input[readonly]').parent('label').each(function(){
					var name = 'name="'+$(this).find('input').attr('name')+'"';
					$('<hr class="manual page-break" '+name+'></hr>') //ui-corner-all
						.insertBefore($(this)).find('input').remove(); 
					$(this).remove();
				});
			}
		},
		//transforms readonly inputs into triggers
		readonlyWidget : function(){
			if (!this.repeat){
				$form.find('input[readonly]:not([data-type-xml="geopoint"])').parent('label').each(function(){
					//var $spans = $(this).find('span').not('.question-icons span').detach(); 
					var relevant = $(this).find('input').attr('data-relevant'),
						branch = (relevant) ? ' jr-branch pre-init' : '',
						name = 'name="'+$(this).find('input').attr('name')+'"',
						attributes = (typeof relevant !== 'undefined') ? 'data-relevant="'+relevant+'" '+name : name,
						value = $(this).find('input, select, textarea').val(),
						 html = $(this).markdownToHtml().html();
					$('<fieldset class="trigger'+branch+'" '+attributes+'></fieldset>')
						.insertBefore($(this)).append(html).append('<div class="note-value">'+value+'</div>').find('input').remove(); 
					$(this).remove();
				});
			}
		},
		tableWidget :function($group){
			var $g = $group || $form;
			//when loading a form dynamically the DOM elements don't have a width yet (width = 0), so we call
			//this with a bit of a delay..
			setTimeout(function(){
				console.debug('setting table column widths');
				$g.parent().find('.jr-appearance-field-list .jr-appearance-list-nolabel, .jr-appearance-field-list .jr-appearance-label')
					.parent().parent('.jr-appearance-field-list').each(function(){
						$(this).find('.jr-appearance-label label>img').parent().css('width', 'auto').toSmallestWidth();
						$(this).find('label').css('width', 'auto').toLargestWidth();
						$(this).find('legend').css('width', 'auto').toLargestWidth(35);
				});
			}, 50);
		},
		spinnerWidget :function(){
			//$form.find('input[type="number"]').spinner();
		},
		sliderWidget : function(){
			//detect max and min with algorithm that evaluates expressions multiple times
			//algortithm could guess likely border values by using a regular expression search...
		},
		geopointWidget : function(){
			this.$group.find('input[data-type-xml="geopoint"]').geopointWidget({touch: Modernizr.touch});
		},
		autoCompleteWidget: function(){

		},
		barcodeWidget : function(){
			//$form.find('input[data-type-xml="barcode"]').attr('placeholder', 'not supported in browser data entry').attr('disabled', 'disabled');
		},
		offlineFileWidget : function(){
			if (this.repeat){
				return;
			}
			var fileInputHandler, 
				feedbackMsg = 'Awaiting user permission to store local data (files)',
				feedbackClass = 'info',
				allClear = false,
				//permissionGranted = false,
				$fileInputs = $form.find('input[type="file"]');
			
			if ($fileInputs.length === 0){
				return;
			}
			//TODO: add online file widget in case fileManager is undefined or use file manager with temporary storage?
			if (typeof fileManager == 'undefined'){
				feedbackClass = 'warning';
				feedbackMsg ="File uploads not supported.";//" in previews and iframed views.";
			} 
			else if (!fileManager.isSupported()){
				feedbackClass = 'warning';
				feedbackMsg = "File uploads not supported by your browser";
			}
			else {
				allClear = true;
			}

			$fileInputs
				.prop('disabled', true)
				.addClass('ignore force-disabled')
				.after('<div class="file-feedback text-'+feedbackClass+'">'+feedbackMsg+'</div>');

			if (!allClear){
				$fileInputs.hide();
				return;
			}
			
			/*
				This delegated eventhander should actually be added asynchronously (or not at all if no FS support/permission). However, it
				needs to fired *before* the regular input change event handler for 2 reasons:
				1. If saving the file in the browser's file system fails, the instance should not be updated
				2. The regular eventhandler has event.stopImmediatePropagation which would mean this handler is never called.
				The easiest way to achieve this is to always add it but only let it do something if permission is granted to use FS.
			 */
			$form.on('change.passthrough', 'input[type="file"]', function(event){
				if(fileManager.getCurrentQuota()){
					var prevFileName, file, mediaType, $preview, 
					$input = $(this);
					console.debug('namespace: '+event.namespace);
					if (event.namespace === 'passthrough'){
						//console.debug('returning true');
						$input.trigger('change.file');
						return false;
					}
					prevFileName = $input.attr('data-previous-file-name');
					file = $input[0].files[0];
					mediaType = $input.attr('accept');
					$preview = (mediaType && mediaType === 'image/*') ? $('<img />')
						: (mediaType === 'audio/*') ? $('<audio controls="controls"/>')
						: (mediaType === 'video/*') ? $('<video controls="controls"/>')
						: $('<span>No preview (unknown mediatype)</span>');
					$preview.addClass('file-preview');

					if (prevFileName && (!file || prevFileName !== file.name)){
						fileManager.deleteFile(prevFileName);
					}

					$input.siblings('.file-feedback, .file-preview, .file-loaded').remove();

					console.debug('file: ', file);
					if (file && file.size > 0 && file.size <= connection.maxSubmissionSize()){
						console.debug('going to save it in filesystem');
						fileManager.saveFile(
							file,
							{
								success: function(fsURL){
									$preview.attr('src', fsURL);
									$input.trigger('change.passthrough').after($preview);
								}, 
								error: function(e){
									console.error('error: ',e);
									$input.val('');
									$input.after('<div class="file-feedback text-error">'+
											'Failed to save file</span>');
								}
							}
						);
						return false;
					}
					//clear instance value by letting it bubble up to normal change handler
					else{
						if (file.size > connection.maxSubmissionSize()){
							$input.after('<div class="file-feedback text-error">'+
								'File too large (max '+
								(Math.round((connection.maxSubmissionSize() * 100 )/ (1024 * 1024)) / 100 )+
								' Mb)</div>');
						}
						return true;
					}
				}
			});

			var callbacks = {
				success: function(){
					console.log('Whoheee, we have permission to use the file system');
					//permissionGranted = true;
					$fileInputs.removeClass('ignore force-disabled')
						.prop('disabled', false)
						.siblings('.file-feedback').remove()
						.end()
						.after('<div class="file-feedback text-info">'+
							'File inputs are experimental. Use only for testing.');
				},
				error: function(){
					$fileInputs.siblings('.file-feedback').remove();
					$fileInputs.after('<div class="file-feedback text-warning">'+
						'No permission given to store local data (or an error occurred).</div>');

				}
			};

			$fileInputs.each(function(){
				var $input = $(this),
					existingFileName = $input.attr('data-loaded-file-name');
				if (existingFileName){
					$input.after('<div class="file-loaded text-warning">This form was loaded with "'+
						existingFileName+'". To preserve this file, do not change this input.</div>');
				}
					//fileName = ($input[0].files.length > 0) ? $input[0].files[0].name : '';
				//is this required at all?
				//$input.attr('data-previous-file-name', fileName);
			}).parent().addClass('with-media clearfix');

			fileManager.init(data.getInstanceID(), callbacks);
		/*
			Some cool code to use for image previews:
			$fileinput = $(this);
			file = $fileinput[0].files[0];
			src = window.URL.createObjectURL(file);
			$img = $('<img src="'+src+'"/>');

			see here a solution for chrome (VERY state of the art)
			http://jsfiddle.net/MartijnR/rtU6f/10/

			Good references:
			http://www.html5rocks.com/en/tutorials/file/filesystem/#toc-filesystemurls
			http://updates.html5rocks.com/2012/08/Integrating-input-type-file-with-the-Filesystem-API
			http://html5-demos.appspot.com/static/filesystem/generatingResourceURIs.html
		 */
		},
		mediaLabelWidget : function(){
			//improve looks when images, video or audio is used as label
			if (!this.repeat){
				$('fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact)>label, '+
					'fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact)>legend')
					.children('img,video,audio').parent().addClass('with-media clearfix');
			}
		}
	};

	/*
	 * Note that preloaders may be deprecated in the future and be handled as metadata without bindings at all, in which
	 * case all this stuff should perhaps move to DataXML
	 */
	//functions are designed to fail silently if unknown preloaders are called
	FormHTML.prototype.preloads = {
		init: function(parentO){
			var item, param, name, curVal, newVal, meta, dataNode, props, xmlType,
				that = this;
			//console.log('initializing preloads');
			//these initialize actual preload items
			$form.find('#jr-preload-items input').each(function(){
				props = parentO.input.getProps($(this));
				item = $(this).attr('data-preload').toLowerCase();
				param = $(this).attr('data-preload-params').toLowerCase();

				if (typeof that[item] !== 'undefined'){
					dataNode = data.node(props.path, props.index);
					curVal = dataNode.getVal()[0];
					newVal = that[item]({param: param, curVal:curVal, dataNode: dataNode});
					dataNode.setVal(newVal, null, props.xmlType);
				}
				else{
					console.error('Preload "'+item+'"" not supported. May or may not be a big deal.');
				}
			});
			//in addition the presence of certain meta data in the instance may automatically trigger a preload function
			//even if the binding is not present. Note, that this actually does not deal with HTML elements at all.
			meta = data.node('*>meta>*');
			meta.get().each(function(){
				item = null;
				name = $(this).prop('nodeName');
				//console.debug('meta data item found: '+name);
				//console.debug($(this));
				dataNode = data.node('*>meta>'+name);
				curVal = dataNode.getVal()[0];
				//first check if there isn't a binding with a preloader that already took care of this
				if($form.find('#jr-preload-items input[name$="/meta/'+name+'"][data-preload]').length === 0){
					switch (name){
						case 'instanceID':
							item = 'instance';
							xmlType = 'string';
							param = '';
							break;
						case 'timeStart':
							item = 'timestamp';
							xmlType = 'datetime';
							param = 'start';
							break;
						case 'timeEnd':
							item = 'timestamp';
							xmlType = 'datetime';
							param = 'end';
							break;
					}
				}
				if (item){
					dataNode.setVal(that[item]({param: param, curVal:curVal, dataNode:dataNode}), null, xmlType);
				}
			});
		},
		'timestamp' : function(o){
			var value,
				that = this;
			// when is 'start' or 'end'
			if (o.param == 'start'){
				return (o.curVal.length > 0) ? o.curVal : data.evaluate('now()', 'string');
			}
			if (o.param == 'end'){
				//set event handler for each save event (needs to be triggered!)
				$form.on('beforesave', function(){
					value = data.evaluate('now()', 'string');
					o.dataNode.setVal(value, null, 'datetime');
				});
				return data.evaluate('now()', 'string');
			}
			return 'error - unknown timestamp parameter';
		},
		'date' : function(o){
			var today, year, month, day;
			//console.debug('date preloader called with current val: '+o.curVal);
			if (o.curVal.length === 0){
				today = new Date(data.evaluate('today()', 'string'));
				year = today.getFullYear().toString().pad(4);
				month = (today.getMonth() + 1).toString().pad(2);
				day = today.getDate().toString().pad(2);

				return year+'-'+month+'-'+day;
			}
			return o.curVal;
		},
		'property' : function(o){
			// of = 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
			// return '' except for deviceid?
			if (o.curVal.length === 0){
				return 'no device properties in enketo';
			}
			return o.curVal;
		},
		'context' : function(o){
			// 'application', 'user'??
			if (o.curVal.length === 0){
				return (o.param == 'application') ? 'enketo' : o.param+' not supported in enketo';
			}
			return o.curVal;
		},
		'patient' : function(o){
			if (o.curVal.length === 0){
				return 'patient preload not supported in enketo';
			}
			return o.curVal;
		},
		'user' : function(o){
			//uuid, user_id, user_type
			//if (o.param == 'uuid'){
			//  return (o.curVal.length > 1) ? o.curVal : data.evaluate('uuid()', 'string');
			//}
			if (o.curVal.length === 0){
				return 'user preload item not supported in enketo yet';
			}
			return o.curVal;
		},
		'uid' : function(o){
			//general 
			if (o.curVal.length === 0){
				return 'no uid yet in enketo';
			}
			return o.curVal;
		},
		'browser' : function(o){
			//console.debug('evaluation browser preload');
			/*if (o.curVal.length === 0){
				if (o.param == 'name'){ 
					var a = ($.browser.webkit) ? 'webkit' : ($.browser.mozilla) ? 'mozilla' : ($.browser.opera) ? 'opera' : ($.browser.msie) ? 'msie' : 'unknown';
					//console.debug(a);
					return a;
				}
				if (o.param == 'version'){
					return $.browser.version;
				}
				return o.param+' not supported in enketo';
			}
			return o.curVal;*/
		},
		'os': function(o){
			if (o.curVal.length === 0){
				return 'not known';
			}
			return o.curVal;
		},
		//Not according to spec yet, this will be added to spec but name may change
		'instance' : function(o){
			return (o.curVal.length > 0) ? o.curVal : data.evaluate("concat('uuid:', uuid())", 'string');
		}
	};

/**
 * Variable: repeat
 * 
 * This can perhaps be simplified and improved by:
 * - adding a function repeat.update() that looks at the instance whether to add repeat form fields
 * - calling update from init() (data.init() is called before form.init() so the initial repeats have been added already)
 * - when button is clicked data.node().clone() or data.node().remove() is called first and then repeat.update()
 * - watch out though when repeats in the middle are removed... or just disable that possibility
 * 
 */
	FormHTML.prototype.repeat = {
		/**
		 * Initializes all Repeat Groups in form (only called once).
		 * @param  {FormHTML} formO the parent form object
		 */
		init : function(formO){
			var i, numRepsInCount, repCountPath, numRepsInInstance, numRepsDefault, cloneDefaultReps, repLevel, $dataRepeat, index,
				that=this;
			//console.debug('initializing repeats');
			this.formO = formO;
			$form.find('fieldset.jr-repeat').prepend('<span class="repeat-number"></span>');
			$form.find('fieldset.jr-repeat:not([data-repeat-fixed])')
				.append('<button type="button" class="btn repeat"><i class="icon-plus"></i></button>'+
					'<button type="button" disabled class="btn remove"><i class="icon-minus"></i></button>');

			//delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
			$form.on('click', 'button.repeat:enabled', function(){
				//create a clone
				that.clone($(this).parent('fieldset.jr-repeat'));
				//prevent default
				return false;
			});
			$form.on('click', 'button.remove:enabled', function(){
				//remove clone
				that.remove($(this).parent('fieldset.jr-repeat.clone'));
				//prevent default
				return false;
			});

			cloneDefaultReps = function($repeat){
				repLevel++;
				repCountPath = $repeat.attr('data-repeat-count') || "";
				numRepsInCount = (repCountPath.length > 0) ? parseInt(data.node(repCountPath).getVal()[0], 10) : 0;
				//console.debug('number of reps in count attribute: ' +numRepsInCount);
				index = $form.find('.jr-repeat[name="'+$repeat.attr('name')+'"]').index($repeat);
				$dataRepeat = data.node($repeat.attr('name'), index).get();
				numRepsInInstance = $dataRepeat.siblings($dataRepeat.prop('nodeName')+':not([template])').addBack().length;
				numRepsDefault = (numRepsInCount > numRepsInInstance) ? numRepsInCount : numRepsInInstance;
				//console.debug('default number of repeats for '+$repeat.attr('name')+' is '+numRepsDefault);
				//first rep is already included (by XSLT transformation)
				for (i = 1 ; i<numRepsDefault ; i++){
					that.clone($repeat.siblings().addBack().last(), false);
				}
				//now check the defaults of all the descendants of this repeat and its new siblings, level-by-level
				$repeat.siblings('.jr-repeat').addBack().find('.jr-repeat')
					.filter(function(i){return $(this).parents('.jr-repeat').length === repLevel;}).each(function(){
						cloneDefaultReps($(this));
				});
			};

			//clone form fields to create the default number 
			//NOTE THIS ASSUMES THE DEFAULT NUMBER IS STATIC, NOT DYNAMIC
			$form.find('.jr-repeat').filter(function(i){return $(this).parents('.jr-repeat').length === 0;}).each(function(){
				repLevel = 0;
				cloneDefaultReps($(this));
			}); 
		},
		/**
		 * clone a repeat group/node
		 * @param   {jQuery} $node node to clone
		 * @param   {boolean=} animate whether to animate the cloning
		 * @return  {boolean}       [description]
		 */
		clone : function($node, animate){
			//var p = new Profiler('repeat cloning');
			var $master, $clone, $parent, index, radioNames, i, path, timestamp, duration,
				that = this;
			duration = (animate === false) ? 0 : 400;
			if ($node.length !== 1){
				console.error('Nothing to clone');
				return false;
			}
			$parent = $node.parent('fieldset.jr-group');
			$master = $parent.children('fieldset.jr-repeat:not(.clone)').eq(0);
			$clone = $master.clone(false);//deep cloning with button events causes problems
			
			//add clone class 
			//remove any clones inside this clone.. (cloned repeats within repeats..), also remove all widgets 
			//NOTE: widget removal doesn't work atm (jQuery bug?), it is covered by the date/time/datetime widgets though)
			$clone.addClass('clone').find('.clone, .widget').remove();
			
			//mark all cloned fields as valid
			$clone.find('.invalid-required, .invalid-constraint').find('input, select, textarea').each(function(){
				that.formO.setValid($(this)); 
			});

			$clone.insertAfter($node)
				.parent('.jr-group').numberRepeats();

			//if not done asynchronously, this code causes a "style undefined" exception in Jasmine unit tests with jQuery 1.9 and 2.0
			//but this breaks loading of default values inside repeats
			//this is caused by show() not being able to find the 'property "style" of undefined'
			//setTimeout(function(){
				$clone.clearInputs('');//.show(duration, function(){
					//re-initiate widgets in clone
					that.formO.widgets.init($clone);
				//});
			//}, 0);

			//note: in http://formhub.org/formhub_u/forms/hh_polio_survey_cloned/form.xml a parent group of a repeat
			//has the same ref attribute as the nodeset attribute of the repeat. This would cause a problem determining 
			//the proper index if .jr-repeat was not included in the selector
			index = $form.find('fieldset.jr-repeat[name="'+$node.attr('name')+'"]').index($node);
			//parentIndex = $form.find('[name="'+$master.attr('name')+'"]').parent().index($parent);
			//add ____x to names of radio buttons where x is the index
			radioNames = [];
			
			$clone.find('input[type="radio"]').each(function(){
				if ($.inArray($(this).attr('data-name'), radioNames) === -1){
					radioNames.push($(this).attr('data-name'));
				}
			});
			console.debug ('different radioNames in clone: '+radioNames.join());
			for (i=0; i<radioNames.length ;i++){
				//amazingly, this executes so fast when compiled that the timestamp in milliseconds is
				//not sufficient guarantee of uniqueness (??)
				timestamp = new Date().getTime().toString()+'_'+Math.floor((Math.random()*10000)+1);
				$clone.find('input[type="radio"][data-name="'+radioNames[i]+'"]').attr('name', timestamp);
			}

			this.toggleButtons($master.parent());

			//create a new data point in <instance> by cloning the template node
			path = $master.attr('name');

			//0-based index of node in a jquery resultset when using a selector with that name attribute
			console.log('index of form node to clone: '+index);
			/*
			 * clone data node if it doesn't already exist
			 */
			if (path.length > 0 && index >= 0 ){//&& data.node(path, index+1).get().length === 0){
				////console.debug('calling data.cloneTemplate');
				data.cloneTemplate(path, index);
			}

			$form.trigger('changerepeat'); 
			//p.report();
			return true;
		},
		remove : function(node){
			var delay = 600,// dataNode,
				that = this,
				repeatPath = node.attr('name'),
				repeatIndex = $form.find('fieldset.jr-repeat[name="'+repeatPath+'"]').index(node),
				parentGroup = node.parent('fieldset.jr-group');
		
			node.hide(delay, function(){
				node.remove();
				parentGroup.numberRepeats();

				that.toggleButtons(parentGroup);
				$form.trigger('changerepeat'); 
				//now remove the data node
				data.node(repeatPath, repeatIndex).remove();
			});
		},
		toggleButtons : function($node){
			//var constraint;
			console.debug('toggling repeat buttons');
			$node = (typeof $node == 'undefined' || $node.length === 0 || !$node) ? $node = $form : $node;
			
			//first switch everything off and remove hover state
			$node.find('button.repeat, button.remove').prop('disabled', true);//button('disable').removeClass('ui-state-hover');
		
			//then enable the appropriate ones
			$node.find('fieldset.jr-repeat:last-child > button.repeat').prop('disabled', false);//.button('enable');
			$node.find('button.remove:not(:eq(0))').prop('disabled', false);
		}
	};
	
	FormHTML.prototype.setEventHandlers = function(){
		var that = this;

		//first prevent default submission, e.g. when text field is filled in and Enter key is pressed
		$('form.jr').attr('onsubmit', 'return false;');

		/* 
			workaround for Chrome to clear invalid values right away 
			issue: https://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&groupby=&sort=&id=178437)
			a workaround was chosen instead of replacing the change event listener to a blur event listener
			because I'm guessing that Google will bring back the old behaviour.
		*/
		$form.on('blur', 'input:not([type="text"], [type="radio"], [type="checkbox"])', function(event){
			if (typeof $(this).prop('validity').badInput !== 'undefined' && $(this).prop('validity').badInput){
				$(this).val('');
			}
		});

		$form.on('change.file validate', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function(event){
			var validCons, validReq, 
				n = that.input.getProps($(this));

			event.stopImmediatePropagation();

			//console.debug( 'event: ' + event.type, 'node props: ', n, $(this) );

			//set file input values to the actual name of file (without c://fakepath or anything like that)
			if (n.val.length > 0 && n.inputType === 'file' && $(this)[0].files[0] && $(this)[0].files[0].size > 0){
				n.val = $(this)[0].files[0].name;
				$(this).attr('data-previous-file-name', n.val);
			}
			
			if (event.type === 'validate'){
				//the enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not
				//if an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid)
				validCons = (n.enabled && n.inputType !== 'hidden') ? data.node(n.path, n.ind).validate(n.constraint, n.xmlType) : true;
			}
			else{
				validCons = data.node(n.path, n.ind).setVal(n.val, n.constraint, n.xmlType);
			}
			
			//validate 'required'
			validReq = (n.enabled && n.inputType !== 'hidden' && n.required && n.val.length < 1) ? false : true;
			
			//console.debug('validation for '+n.path+' required: '+validReq);
			//console.debug('validation for '+n.path+' constraint + datatype: '+validCons);

			if (validReq === false){
				that.setValid($(this), 'constraint');
				if (event.type === 'validate'){
					//console.error('setting node '+n.path+' to invalid-required', n);
					that.setInvalid($(this), 'required');
				}
			}
			else{
				that.setValid($(this), 'required');
				if (typeof validCons !== 'undefined' && validCons === false){
					//console.error('setting node '+n.path+' to invalid-constraint', n);
					that.setInvalid($(this), 'constraint');
				}
				else if (validCons !== null) {
					that.setValid ($(this), 'constraint');
				}
			}
		}); 
		
		$form.on('focus blur', '[required]', function(event){
			var props = that.input.getProps($(this)),
				loudErrorShown = ($(this).parents('.invalid-required, .invalid-constraint').length > 0),
				$reqSubtle = $(this).next('.required-subtle'),
				reqSubtle = $('<span class="required-subtle focus" style="color: transparent;">Required</span>');
			console.debug('event: ', event);
			if (event.type === 'focusin'){
				if ($reqSubtle.length === 0){
					$reqSubtle = $(reqSubtle);
					$reqSubtle.insertAfter(this);
					if (!loudErrorShown){
						$reqSubtle.show(function(){$(this).removeAttr('style');});
					}
				}
				else if (!loudErrorShown){
					$reqSubtle.addClass('focus');
				}
			}
			else if (event.type === 'focusout'){
				if (props.val.length > 0){
					$reqSubtle.remove();
				}
				else {
					$reqSubtle.removeClass('focus');
					if (!loudErrorShown){
						$reqSubtle.removeAttr('style');
					}
				}
			}
		});

		//nodeNames is comma-separated list as a string
		$form.on('dataupdate', function(event, nodeNames){          
			that.calcUpdate(nodeNames); //EACH CALCUPDATE THAT CHANGES A VALUE TRIGGERS ANOTHER CALCUPDATE => INEFFICIENT
			that.branch.update(nodeNames);
			that.outputUpdate(nodeNames);
			that.itemsetUpdate(nodeNames);
			//it is possible that a changed data value validates question that were previously invalidated
			//that.validateInvalids();
		});

		//edit is fired when the form changes due to user input or repeats added/removed
		//branch update doesn't require detection as it always happens as a result of an event that triggers change or changerepeat.
		$form.on('change changerepeat', function(event){
			//console.debug('detected event to trigger editstatus: ');
			//console.debug(event);
			that.editStatus.set(true);
		});

		$form.on('changerepeat', function(event){
			//set defaults of added repeats, setAllVals does not trigger change event
			//TODO: only do this for the repeat that trigger it
			that.setAllVals();
			//the cloned fields may have been marked as invalid, so after setting thee default values, validate the invalid ones
			//that.validateInvalids();
		});

//      $form.on('beforesave', function(event){
//          console.debug('beforesave event detected');
//          that.validateAll();
//      });

		$form.on('changelanguage', function(){
			//console.debug('language change handler started');
			that.outputUpdate();
			that.setHints();
		});
	};

	FormHTML.prototype.setValid = function($node, type){
		var classes = (type) ? 'invalid-'+type : 'invalid-constraint invalid-required';
		//console.debug('removing classes: '+classes);
		this.input.getWrapNodes($node).removeClass(classes);
	};

	FormHTML.prototype.setInvalid = function($node, type){
		type = type || 'constraint';
		//console.debug('adding invalid-'+type+' class');
		this.input.getWrapNodes($node).addClass('invalid-'+type).find('.required-subtle').attr('style', 'color: transparent;');
	};

	/**
	 * Function: generateName
	 * 
	 * Function to generate the name of a form element (= simple path to data node) corresponding to the provided data node. Omits instance node.
	 * 
	 * Parameters:
	 * 
	 *   node - A data node of which to determine the corresponding form field name.
	 * 
	 * Returns:
	 * 
	 *   String that looks like an XPath
	 *   
	 */
	FormHTML.prototype.generateName = function(dataNode){
		//other nodes may have the same XPath but because this function is used to determine the corresponding input name of a data node, index is not included 
		var steps = [dataNode.prop('nodeName')],
			parent = dataNode.parent();
		while (parent.length == 1 && parent.prop('nodeName') !== 'instance' && parent.prop('nodeName') !== '#document'){
			steps.push(parent.prop("nodeName"));
			parent = parent.parent();
		}
		return '/'+steps.reverse().join('/');
	};

	/**
	 * Validates all enabled input fields after first resetting everything as valid.
	 * @return {boolean} whether the form contains any errors
	 */
	FormHTML.prototype.validateAll = function(){
		var that = this;
		//can't fire custom events on disabled elements therefore we set them all as valid
		$form.find('fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, input:disabled, select:disabled, textarea:disabled').each(function(){
			that.setValid($(this));
		});
		$form.find('input, select, textarea').not('.ignore').trigger('validate');
		return this.isValid();
	};

	/**
	 * Returns true is form is valid and false if not. Needs to be called AFTER (or by) validateAll()
	 * @return {!boolean} whether the form is valid
	 */
	FormHTML.prototype.isValid = function(){
		return ($form.find('.invalid-required, .invalid-constraint').length > 0) ? false : true;
	};

	/**
	 * Adds <hr class="page-break"> to prevent cutting off questions with page-breaks
	 */
	FormHTML.prototype.addPageBreaks = function(){

	};
}

/**
 * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
 * used in JavaRosa, so it replaces the Z in the ISOstring with a local offset
 * @return {string} a datetime string formatted according to RC3339 with local offset
 */
Date.prototype.toISOLocalString = function(){
	//2012-09-05T12:57:00.000-04:00 (ODK)
	var offset = {}, plus,
		pad2 = function(x){
			return (x<10) ? '0'+x : x;
		};

	if (this.toString() == 'Invalid Date'){
		return this.toString();
	}

	offset.minstotal = this.getTimezoneOffset();
	offset.direction = (offset.minstotal < 0) ? '+' : '-';
	offset.hrspart = pad2(Math.abs(Math.floor(offset.minstotal / 60 )));
	offset.minspart = pad2(Math.abs(Math.floor(offset.minstotal % 60)));

	return new Date(this.getTime() - (offset.minstotal * 60 * 1000)).toISOString()
		.replace('Z', offset.direction+offset.hrspart+':'+offset.minspart);
};

(function($){
	"use strict";
	// plugin to update number of repeated elements (with class jr-repeat)
	$.fn.numberRepeats = function() {

		return this.each(function(){

			$(this).find('fieldset.jr-repeat').each(function(){
				var repSiblings, qtyRepeats, i;
				////console.log('found '+$(this).find('fieldset.jr-group > fieldset.jr-repeat').length +' items');
				// if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
				if ($(this).prev('fieldset.jr-repeat').length === 0){
					repSiblings = $(this).siblings('fieldset.jr-repeat');
					qtyRepeats = repSiblings.length + 1;
					////console.log('number of repeats of '+$(this).attr('name')+' is '+qtyRepeats);
					if (qtyRepeats > 1) {
						$(this).find('span.repeat-number').text('1');
						i = 2;
						repSiblings.each(function(){
							////console.log('numbering a repeat');
							$(this).find('span.repeat-number').text(i);
							i++;
						});
					}
					else{
						$(this).find('span.repeat-number').empty();
					}
				}
				else{
					////console.log('not first of type');
				}
			});
		});
	};



/**
 * Function: clearInputs
 * 
 * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM 
 * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added 
 * to the DOM (and synchronized with data object) a regular change event should be fired
 * 
 * Parameters:
 * 
 *   ev - event to be triggered
 * 
 * Returns:
 * 
 *   jQuery this object
 */
	$.fn.clearInputs = function(ev) {
		ev = ev || 'edit';
		return this.each(function(){
			//remove media previews
			$(this).find('.file-preview').remove();
			//remove input values
			$(this).find('input, select, textarea').each(function(){
				var type = $(this).attr('type');
				if ($(this).prop('nodeName').toUpperCase() === 'SELECT'){
					type = 'select';
				}
				if ($(this).prop('nodeName').toUpperCase() === 'TEXTAREA'){
					type = 'textarea';
				}
				////console.log('type to reset: '+type);
				switch (type){
					case 'date':
					case 'datetime':
					case 'time':
					case 'number':
					case 'search':
					case 'color':
					case 'range':
					case 'url':
					case 'email':
					case 'password':
					case 'text':
					case 'file':
						$(this).removeAttr('data-previous-file-name data-loaded-file-name');
					case 'hidden':
					case 'textarea':
						if ($(this).val() !== ''){
							$(this).val('').trigger(ev);
						}
						break;
					case 'radio':
					case 'checkbox':
						if ($(this).prop('checked')){
							//console.log('found checked value, going to reset it');
							$(this).prop('checked', false);
							$(this).trigger(ev);
						}
						break;
					case 'select':
						// TEST THIS!
						if ($(this)[0].selectedIndex >= 0){
							$(this)[0].selectedIndex = -1;
							$(this).trigger(ev);
						}
						break;
					default:
						console.error('Unrecognized input type found when trying to reset: '+type);
						console.error($(this));
				}
			});
		});
	};

	/**
	 * Function: xfind
	 * 
	 *
	 * 
	 * Parameters:
	 * 
	 *   selector - String containing a JQuery selector or an XPath/
	 * 
	 * Returns:
	 * 
	 *   Nodes matching the selector.
	 *   
	 * See Also:
	 * 
	 *   
	 */
	/**
	 * Simple XPath Compatibility Plugin for jQuery 1.1
	 * By John Resig
	 * Dual licensed under MIT and GPL.
	 * Original plugin code here: http://code.google.com/p/jqueryjs/source/browse/trunk/plugins/xpath/jquery.xpath.js?spec=svn3167&r=3167
	 * some changes made by Martijn van de Rijdt (not replacing $.find(), removed context, dot escaping)
	 * @param  {string} selector [description]
	 * @return {?(Array.<(Element|null)>|Element)}          [description]
	 */
	$.fn.xfind = function(selector){
			var parts, cur, i;
			//console.debug('xfind plugin received selector: '+selector);
			
			// Convert the root / into a different context
			//if ( !selector.indexOf("/") ) {
			//  context = this.context.documentElement;
			//  selector = selector.replace(/^\/\w*/, "");
			//  if ( !selector ){
			//      return [ context ];
			//  }
			//}

			// Convert // to " "
			selector = selector.replace(/\/\//g, " ");

			//added by Martijn
			selector = selector.replace(/^\//,"");
			selector = selector.replace(/\/\.$/,'');

			// Convert / to >
			selector = selector.replace(/\//g, ">");

			// Naively convert [elem] into :has(elem)
			selector = selector.replace(/\[([^@].*?)\]/g, function(m, selector){
					return ":has(" + selector + ")";
			});

			// Naively convert /.. into a new set of expressions
			// Martijn: I just don't see this except if this always occurs as nodea/../../parentofnodea/../../grandparentofnodea
			if ( selector.indexOf(">..") >= 0 ) {
					parts = selector.split(/>\.\.>?/g);
					//var cur = jQuery(parts[0], context);
					cur = jQuery(parts[0], this);
					for ( i = 1; i < parts.length; i++ )
							cur = cur.parent(parts[i]);
					return cur.get();
			}

			// any remaining dots inside node names need to be escaped (added by Martijn)
			selector = selector.replace(/\./gi, '\\.');

			//selector += ':not([template], [template] *)';
			//console.debug('xfind plugin going to return jQuery object with selector: '+selector);
			//if performance becomes an issue, it's worthwhile implementing this with native XPath instead.
			return this.find(selector);
	};

	$.fn.markdownToHtml = function () {
		return this.each(function () {
			var html,
				$childStore = $('<div/>');
			$(this).children().each(function (index) {
				var name = '$$$' + index;
				$(this).clone().markdownToHtml().appendTo($childStore);
				$(this).replaceWith(name);
			});
			html = $(this).html();
			html = html.replace(/__([^\s][^_]*[^\s])__/gm, "<strong>$1</strong>");
			html = html.replace(/\*\*([^\s][^\*]*[^\s])\*\*/gm, "<strong>$1</strong>");
			html = html.replace(/_([^\s][^_]*[^\s])_/gm, '<em>$1</em>');
			html = html.replace(/\*([^\s][^\*]*[^\s])\*/gm, '<em>$1</em>');
			//only replaces if url is valid (worthwhile feature?)
			html = html.replace(/\[(.*)\]\(((https?:\/\/)(([\da-z\.\-]+)\.([a-z\.]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3}))([\/\w \.\-]*)*\/?[\/\w \.\-\=\&\?]*)\)/gm, '<a href="$2">$1</a>');
			html = html.replace(/\n/gm, '<br />');
			$childStore.children().each(function(i){
				var regex = new RegExp('\\$\\$\\$' + i);
				html = html.replace(regex, $(this)[0].outerHTML);
			});
			$(this).text('').append(html);
		});
	};

})(jQuery);