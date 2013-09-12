describe("Data node getter", function () {
    var i, t =
		[
			["", null, null, 20],
			["", null, {}, 20],
			//["/", null, {}, 9], //issue with xfind, not important
			[false, null, {}, 20],
			[null, null, {}, 20],
			[null, null, {noTemplate:true}, 20],
			[null, null, {noTemplate:false}, 22],
			[null, null, {onlyTemplate:true}, 1],
			[null, null, {noEmpty:true}, 10],
			[null, null, {noEmpty:true, noTemplate:false}, 11],
			["/thedata/nodeA", null, null, 1],
			["/thedata/nodeA", 1   , null, 0],
			["/thedata/nodeA", null, {noEmpty:true}, 0], //"int"
			["/thedata/nodeA", null, {onlyleaf:true}, 1],
			["/thedata/nodeA", null, {onlyTemplate:true}, 0],
			["/thedata/nodeA", null, {noTemplate:true}, 1],
			["/thedata/nodeA", null, {noTemplate:false}, 1],
			["/thedata/repeatGroup", null, null, 3],
			["/thedata/repeatGroup", null, {onlyTemplate:true}, 1],
			["/thedata/repeatGroup", null, {noTemplate:false}, 4],
			["//nodeC", null, null, 3],
			["/thedata/repeatGroup/nodeC", null, null, 3],
			["/thedata/repeatGroup/nodeC", 2   , null, 1],
			["/thedata/repeatGroup/nodeC", null, {noEmpty:true}, 2],
			["/thedata/repeatGroup/nodeC", null, {onlyleaf:true}, 3],
			["/thedata/repeatGroup/nodeC", null, {onlyTemplate:true}, 0],
			["/thedata/repeatGroup/nodeC", null, {noTemplate:true}, 3],
			["/thedata/repeatGroup/nodeC", null, {noTemplate:false}, 4]
		],
		data = getFormDataO('thedata.xml');//form.Data(dataStr1);

	function test(node){
		it("obtains nodes (selector: "+node.selector+", index: "+node.index+", filter: "+JSON.stringify(node.filter)+")", function() {
			expect(data.node(node.selector, node.index, node.filter).get().length).toEqual(node.result);
		});
	}
	for (i = 0 ; i<t.length ; i++){
		test({selector: t[i][0], index: t[i][1], filter: t[i][2], result: t[i][3]});
	}
});

describe('Date node (&) value getter', function(){
	var //form = new Form('',''),
		data = getFormDataO('thedata.xml');//dataStr1);

	it('returns an array of one node value', function(){
		expect(data.node("/thedata/nodeB").getVal()).toEqual(['b']);
	});

	it('returns an array of multiple node values', function(){
		expect(data.node("/thedata/repeatGroup/nodeC").getVal()).toEqual(['', 'c2', 'c3']);
	});

	it('returns an empty array', function(){
		expect(data.node("/thedata/nodeX").getVal()).toEqual([]);
	});

	it('obtains a node value of a node with a . in the name', function(){
		expect(data.node("/thedata/someweights/w.3").getVal()).toEqual(['5']);
	});
});

describe('Data node XML data type conversion & validation', function(){
	var i, data,
		t =	[
				["/thedata/nodeA", null, null, 'val1', null, true],
				["/thedata/nodeA", null, null, 'val3', 'somewrongtype', true], //default type is string

				["/thedata/nodeA", 1   , null, 'val13', 'string', null], //non-existing node
				["/thedata/repeatGroup/nodeC", null, null, 'val', null], //multiple nodes

				["/thedata/nodeA", 0   , null, '4', 'double', true], //double is a non-existing xml data type so turned into string
				["/thedata/nodeA", 0   , null, 5, 'double', true],

				["/thedata/nodeA", null, null, 'val2', 'string', true],
				["/thedata/nodeA", 0   , null, ['a', 'b', 'c'], 'string', true],
				["/thedata/nodeA", 0   , null, ['d', 'e', 'f', ''], 'string', true],
				["/thedata/nodeA", 0   , null, 'val12', 'string', true],
				["/thedata/nodeA", 0   , null, '14', 'string', true],
				["/thedata/nodeA", 0   , null, 1, 'string', true],

				["/thedata/nodeA", null, null, 'val11', 'decimal', false],

				["/thedata/nodeA", null, null, 'val4', 'int', false],
				["/thedata/nodeA", 0   , null, '2', 'int', true],
				["/thedata/nodeA", 0   , null, 3, 'int', true],

				["/thedata/nodeA", null, null, 'val5565ghgyuyuy', 'date', false], //Chrome turns val5 into a valid date...
				["/thedata/nodeA", null, null, '2012-01-01', 'date', true],
				["/thedata/nodeA", null, null, '2012-12-32', 'date', false],
				//["/thedata/nodeA", null, null, 324, 'date', true], //fails in phantomjs

				["/thedata/nodeA", null, null, 'val5565ghgyuyua', 'datetime', false], //Chrome turns val10 into a valid date..
				["/thedata/nodeA", null, null, '2012-01-01T00:00:00-06', 'datetime', true],
				["/thedata/nodeA", null, null, '2012-12-32T00:00:00-06', 'datetime', false],
				["/thedata/nodeA", null, null, '2012-12-31T23:59:59-06', 'datetime', true],
				["/thedata/nodeA", null, null, '2012-12-31T23:59:59-06:30', 'datetime', true],
				["/thedata/nodeA", null, null, '2012-12-31T23:59:59Z', 'datetime', true],
				["/thedata/nodeA", null, null, '2012-01-01T30:00:00-06', 'datetime', false],
				//["/thedata/nodeA", null, null, '2013-05-31T07:00-02', 'datetime', true],fails in phantomJSs

				["/thedata/nodeA", null, null, 'a', 'time', false],
				["/thedata/nodeA", null, null, 'aa:bb', 'time', false],
				["/thedata/nodeA", null, null, '0:0', 'time', true],
				["/thedata/nodeA", null, null, '00:00', 'time', true],
				["/thedata/nodeA", null, null, '23:59', 'time', true],
				["/thedata/nodeA", null, null, '23:59:59', 'time', true],
				["/thedata/nodeA", null, null, '24:00', 'time', false],
				["/thedata/nodeA", null, null, '00:60', 'time', false],
				["/thedata/nodeA", null, null, '00:00:60', 'time', false],
				["/thedata/nodeA", null, null, '-01:00', 'time', false],
				["/thedata/nodeA", null, null, '00:-01', 'time', false],
				["/thedata/nodeA", null, null, '00:00:-01', 'time', false],
				["/thedata/nodeA", null, null, '13:17:00.000-07', 'time', true],

				["/thedata/nodeA", null, null, 'val2', 'barcode', true],

				["/thedata/nodeA", null, null, '0 0 0 0', 'geopoint', true],
				["/thedata/nodeA", null, null, '10 10', 'geopoint', true],
				["/thedata/nodeA", null, null, '10 10 10', 'geopoint', true],
				["/thedata/nodeA", null, null, '-90 -180', 'geopoint', true],
				["/thedata/nodeA", null, null, '90 180', 'geopoint', true],
				["/thedata/nodeA", null, null, '-91 -180', 'geopoint', false],
				["/thedata/nodeA", null, null, '-90 -181', 'geopoint', false],
				["/thedata/nodeA", null, null, '91 180', 'geopoint', false],
				["/thedata/nodeA", null, null, '90 -181', 'geopoint', false],
				["/thedata/nodeA", null, null, 'a -180', 'geopoint', false],
				["/thedata/nodeA", null, null, '0 a', 'geopoint', false],
				["/thedata/nodeA", null, null, '0', 'geopoint', false],
				["/thedata/nodeA", null, null, '0 0 a', 'geopoint', false],
				["/thedata/nodeA", null, null, '0 0 0 a', 'geopoint', false]

				//				//TO DO binary (?)
			];

	function test(n){
		it("converts and validates xml-type "+n.type+" with value: "+n.value, function(){
			data = getFormDataO('thedata.xml');//dataStr1);
			expect(data.node(n.selector, n.index, n.filter).setVal(n.value, null, n.type)).toEqual(n.result);
		});
	}

	for (i = 0 ; i<t.length ; i++){
		test({selector: t[i][0], index: t[i][1], filter: t[i][2], value: t[i][3], type: t[i][4], result:t[i][5]});
	}

	it('sets a non-empty value to empty', function(){
		var node = data.node('/thedata/nodeA', null, null);
		data = getFormDataO('thedata.xml');//dataStr1);
		node.setVal('value', null, 'string');
		expect(node.setVal('')).toBe(true);
	});

	it('adds a file attribute to data nodes with a value and with xml-type: binary', function(){
		node = data.node('/thedata/nodeA', null, null);
		expect(node.get().attr('type')).toBe(undefined);
		node.setVal('this.jpg', null, 'binary');
		expect(node.get().attr('type')).toBe('file');
	});

	it('removes a file attribute from EMPTY data nodes with xml-type: binary', function(){
		node = data.node('/thedata/nodeA', null, null);
		node.setVal('this.jpg', null, 'binary');
		expect(node.get().attr('type')).toBe('file');
		node.setVal('', null, 'binary');
		expect(node.get().attr('type')).toBe(undefined);
	});

});

describe("Data node cloner", function(){
	it("has cloned a data node", function(){
		var //form = new Form('', ''),
			data = getFormDataO('thedata.xml'),//dataStr1),
			node = data.node("/thedata/nodeA"),
			$precedingTarget = data.node("/thedata/repeatGroup/nodeC", 0).get();
		//form.Form('form');

		expect(data.node('/thedata/repeatGroup/nodeA', 0).get().length).toEqual(0);
		node.clone($precedingTarget);
		expect(data.node('/thedata/repeatGroup/nodeA', 0).get().length).toEqual(1);
	});
});

describe("Data node remover", function(){
	it("has removed a data node", function(){
		var //form = new Form('', ''),
			data = getFormDataO('thedata.xml'),//dataStr1),
			node = data.node("/thedata/nodeA");
		//form.Form('form');

		expect(node.get().length).toEqual(1);
		data.node("/thedata/nodeA").remove();
		expect(node.get().length).toEqual(0);
	});
});

describe("XPath Evaluator (see github.com/MartijnR/xpathjs_javarosa for comprehensive tests!)", function(){
	var i, t =
		[
			["/thedata/nodeB", "string", null, 0, "b"],
			["../nodeB", "string", "/thedata/nodeA", 0, "b"],
			["/thedata/nodeB", "boolean", null, 0, true],
			["/thedata/notexist", "boolean", null, 0, false],
			["/thedata/repeatGroup[2]/nodeC", "string", null, 0, "c2"],
			['/thedata/repeatGroup[position()=3]/nodeC', 'string', null, 0, 'c3'],
			['coalesce(/thedata/nodeA, /thedata/nodeB)', 'string', null, 0, 'b'],
			['coalesce(/thedata/nodeB, /thedata/nodeA)', 'string', null, 0, 'b'],
			['weighted-checklist(3, 3, /thedata/somenodes/A, /thedata/someweights/w2)', 'boolean', null, 0, true],
			['weighted-checklist(9, 9, /thedata/somenodes/*, /thedata/someweights/*)', 'boolean', null, 0, true]
		],
		form = loadForm('thedata.xml'),//new Form(formStr1, dataStr1),
		data;
	form.init();
	data = form.getDataO();

	function test(expr, resultType, contextSelector, index, result){
		it("evaluates XPath: "+expr, function(){
			expect(data.evaluate(expr, resultType, contextSelector, index)).toEqual(result);
		});
	}

	for (i = 0 ; i<t.length ; i++){
		test(String(t[i][0]), t[i][1], t[i][2], t[i][3], t[i][4]);
	}

	// this tests the makeBugCompliant() workaround that injects a position into an absolute path
	// for the issue described here: https://bitbucket.org/javarosa/javarosa/wiki/XFormDeviations
	it("evaluates a repaired absolute XPath inside a repeat (makeBugCompliant())", function(){
		form = loadForm('thedata.xml');//new Form(formStr1, dataStr1);
		form.init();
		expect(form.getDataO().evaluate("/thedata/repeatGroup/nodeC", "string", "/thedata/repeatGroup/nodeC", 2)).toEqual("c3");
	});
});


describe('functionality to obtain string of the XML instance (DataXML.getStr() for storage or uploads)', function(){
	var str1, str2, str3, str4, str5, str6, str7, str8, str9, str10, str11, str12,
		formA = loadForm('new_cascading_selections.xml'),
		formB = loadForm('thedata.xml');//new Form(formStr1, dataStr1);
	formA.init();
	formB.init();
	str1 = formA.getDataO().getStr();
	str2 = formA.getDataO().getStr(null, null);
	str3 = formA.getDataO().getStr(false, false);
	str4 = formA.getDataO().getStr(true, false);
	str5 = formA.getDataO().getStr(false, true);
	str6 = formA.getDataO().getStr(true, true);
	str7 = formA.getDataO().getStr(true, true, false);
	str8 = formA.getDataO().getStr(null, null, true);
	str9 = formA.getDataO().getStr(true, true, true);

	str10 = formB.getDataO().getStr();
	str11 = formB.getDataO().getStr(true);
	str12 = formB.getDataO().getStr(false, false, true);

	testModelPresent = function(str){return isValidXML(str) && new RegExp(/^<model/g).test(str);};
	testInstancePresent = function(str){return isValidXML(str) && new RegExp(/<instance[\s|>]/g).test(str);};
	testInstanceNumber = function(str){return str.match(/<instance[\s|>]/g).length;};
	//testNamespacePresent = function(str){return isValidXML(str) && new RegExp(/xmlns=/).test(str);};
	testTemplatePresent = function(str){return isValidXML(str) && new RegExp(/template=/).test(str);};
	isValidXML = function(str){
		var $xml;
		try{ $xml = $.parseXML(str);}
		catch(e){}
		return typeof $xml === 'object';
	};

	it('returns a string of the primary instance only when called without 3rd parameter: true', function(){
		expect(testModelPresent(str1)).toBe(false);
		expect(testInstancePresent(str1)).toBe(false);
		expect(testModelPresent(str2)).toBe(false);
		expect(testInstancePresent(str2)).toBe(false);
		expect(testModelPresent(str3)).toBe(false);
		expect(testInstancePresent(str3)).toBe(false);
		expect(testModelPresent(str4)).toBe(false);
		expect(testInstancePresent(str4)).toBe(false);
		expect(testModelPresent(str5)).toBe(false);
		expect(testInstancePresent(str5)).toBe(false);
		expect(testModelPresent(str6)).toBe(false);
		expect(testInstancePresent(str6)).toBe(false);
		expect(testModelPresent(str7)).toBe(false);
		expect(testInstancePresent(str7)).toBe(false);
	});

	it('returns a string of the model and all instances when called with 3rd parameter: true', function(){
		expect(testModelPresent(str8)).toBe(true);
		expect(testInstancePresent(str8)).toBe(true);
		expect(testInstanceNumber(str8)).toBe(4);
		expect(testModelPresent(str9)).toBe(true);
		expect(testInstancePresent(str9)).toBe(true);
		expect(testInstanceNumber(str9)).toBe(4);
		expect(testInstancePresent(str12)).toBe(true);
		expect(testInstanceNumber(str12)).toBe(1);
	});

	it('returns a string with repeat templates included when called with 1st parameter: true', function(){
		expect(testTemplatePresent(str10)).toBe(false);
		expect(testTemplatePresent(str11)).toBe(true);
	});

});

describe("Output functionality ", function(){
	// These tests were orginally meant for modilabs/enketo issue #141. However, they passed when they were
	// failing in the enketo client itself (same form). It appeared the issue was untestable (except manually)
	// since the issue was resolved by updating outputs with a one millisecond delay (!).
	// Nevertheless, these tests can be useful.
	var	form = new Form(formStr2, dataStr2);

	form.init();

	it("tested upon initialization: node random__", function(){
		expect(form.getFormO().$.find('[data-value="/random/random__"]').text().length).toEqual(17);
	});

	it("tested upon initialization: node uuid__", function(){
		expect(form.getFormO().$.find('[data-value="/random/uuid__"]').text().length).toEqual(36);
	});
});

describe("Output functionality within repeats", function(){
	var $o = [],
		form = loadForm('outputs_in_repeats.xml');
	form.init();
	form.getFormO().$.find('button.repeat').click();

	for (var i=0 ; i<8 ; i++){
		$o.push(form.getFormO().$.find('.jr-output').eq(i));
	}

	form.getFormO().$.find('[name="/outputs_in_repeats/rep/name"]').eq(0).val('Martijn').trigger('change');
	form.getFormO().$.find('[name="/outputs_in_repeats/rep/name"]').eq(1).val('Beth').trigger('change');
	form.getFormO().$.find('[data-name="/outputs_in_repeats/rep/animal"][value="elephant"]').eq(0).prop('checked', true).trigger('change');
	form.getFormO().$.find('[data-name="/outputs_in_repeats/rep/animal"][value="rabbit"]').eq(1).prop('checked', true).trigger('change');
	it('shows correct value when referring to repeated node', function(){
		expect($o[0].text()).toEqual('Martijn');
		expect($o[1].text()).toEqual('Martijn');
		expect($o[2].text()).toEqual('elephant');
		expect($o[3].text()).toEqual('Martijn');
		expect($o[4].text()).toEqual('Beth');
		expect($o[5].text()).toEqual('Beth');
		expect($o[6].text()).toEqual('rabbit');
		expect($o[7].text()).toEqual('Beth');
	});
});

describe("Preload and MetaData functionality", function(){
	var	form, t;

	it("ignores a calculate binding on [ROOT]/meta/instanceID", function(){
		form = new Form(formStr2, dataStr2);
		form.init();
		expect(form.getDataO().node('/random/meta/instanceID').getVal()[0].length).toEqual(41);
	});

	it("generates an instanceID on meta/instanceID WITHOUT preload binding", function(){
		form = new Form(formStr2, dataStr2);
		form.init();
		form.getFormO().$.find('fieldset#jr-preload-items').remove();
		expect(form.getFormO().$.find('fieldset#jr-preload-items').length).toEqual(0);
		expect(form.getDataO().node('/random/meta/instanceID').getVal()[0].length).toEqual(41);
	});

	it("generates an instanceID WITH preload binding", function(){
		form = new Form(formStr3, dataStr2);
		form.init();
		expect(form.getFormO().$
			.find('fieldset#jr-preload-items input[name="/random/meta/instanceID"][data-preload="instance"]').length)
			.toEqual(1);
		expect(form.getDataO().node('/random/meta/instanceID').getVal()[0].length).toEqual(41);
	});

	it("does not generate a new instanceID if one is already present", function(){
		form = new Form(formStr3, dataStr3);
		form.init();
		expect(form.getDataO().node('/random/meta/instanceID').getVal()[0]).toEqual('c13fe058-3349-4736-9645-8723d2806c8b');
	});

	it("generates a timeStart on meta/timeStart WITHOUT preload binding", function(){
		form = new Form(formStr2, dataStr2);
		form.init();
		form.getFormO().$.find('fieldset#jr-preload-items').remove();
		expect(form.getFormO().$.find('fieldset#jr-preload-items').length).toEqual(0);
		expect(form.getDataO().node('/random/meta/timeStart').getVal()[0].length > 10).toBe(true);
	});

	it("generates a timeEnd on init and updates this after a beforesave event WITHOUT preload binding", function(){
		var timeEnd, timeEndNew;
		//jasmine.Clock.useMock();
		form = new Form(formStr2, dataStr2);
		form.init();
		form.getFormO().$.find('fieldset#jr-preload-items').remove();
		expect(form.getFormO().$.find('fieldset#jr-preload-items').length).toEqual(0);
		timeEnd = form.getDataO().node('/random/meta/timeEnd').getVal()[0];
		console.debug('init timeEnd: '+timeEnd);
		expect(timeEnd.length > 10).toBe(true);
		//setTimeout(function(){
			form.getFormO().$.trigger('beforesave');
			timeEndNew = form.getDataO().node('/random/meta/timeEnd').getVal()[0];
			timeEnd = new Date(timeEnd);
			timeEndNew = new Date(timeEndNew);
			console.debug(timeEnd);
			console.debug(timeEndNew);
			//for some reason the setTimeout function doesn't work
			expect(timeEnd-1 < timeEndNew).toBe(true);
		//}, 1001);
		//jasmine.Clock.tick(1001);
		//TODO FIX THIS PROPERLY
	});

	function testPreloadExistingValue(node){
		it("obtains unchanged preload value of item (WITH preload binding): "+node.selector+"", function() {
			form = new Form(formStr5, dataStr5a);
			form.init();
			expect(form.getDataO().node(node.selector).getVal()[0]).toEqual(node.result);
		});
	}

	function testPreloadNonExistingValue(node){
		it("has populated previously empty preload item (WITH preload binding): "+node.selector+"", function() {
			form = new Form(formStr5, dataStr5b);
			form.init();
			expect(form.getDataO().node(node.selector).getVal()[0].length > 0).toBe(true);
		});
	}

	t=[
		['/widgets/start_time', '2012-10-30T08:44:57.000-06:00'],
		['/widgets/date_today', '2012-10-30'],
		['/widgets/deviceid', 'some value'],
		['/widgets/subscriberid', 'some value'],
		['/widgets/my_simid', '2332'],
		['/widgets/my_phonenumber', '234234324'],
		['/widgets/application', 'some context'],
		['/widgets/patient', 'this one'],
		['/widgets/user', 'John Doe'],
		['/widgets/uid', 'John Doe'],
		//['/widgets/browser_name', 'fake'],
		//['/widgets/browser_version', 'xx'],
		//['/widgets/os_name', 'fake'],
		//['/widgets/os_version', 'xx'],
		['/widgets/meta/instanceID', 'uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8']
	];

	for (i = 0 ; i<t.length ; i++){
		testPreloadExistingValue({selector: t[i][0], result:t[i][1]});
		testPreloadNonExistingValue({selector: t[i][0]});
	}
	testPreloadExistingValue({selector:'/widgets/unknown', result:'some value'});
	testPreloadNonExistingValue({selector: '/widgets/end_time'});
});

describe("Loading instance values into html input fields functionality", function(){
	var form;

	it('correctly populates input fields of non-repeat node names in the instance', function(){
		form = loadForm('thedata.xml');//new Form(formStr1, dataStr1);
		form.init();
		expect(form.getFormO().$.find('[name="/thedata/nodeB"]').val()).toEqual('b');
		expect(form.getFormO().$.find('[name="/thedata/repeatGroup/nodeC"]').eq(2).val()).toEqual('c3');
		expect(form.getFormO().$.find('[name="/thedata/nodeX"]').val()).toEqual(undefined);
	});

	it('correctly populates input field even if the instance node name is not unique and occurs at multiple levels', function(){
		form = new Form(formStr4, dataStr4);
		form.init();
		expect(form.getFormO().$.find('[name="/nodename_bug/hh/hh"]').val()).toEqual('hi');
	});

});

describe("Loading instance-to-edit functionality", function(){
	var form, loadErrors;

	describe('when a deprecatedID node is not present in the form format', function(){
		form = loadForm('thedata.xml', dataEditStr1);//new Form(formStr1, dataStr1, dataEditStr1);
		form.init();

		it ("adds a deprecatedID node", function(){
			expect(form.getDataO().node('* > meta > deprecatedID').get().length).toEqual(1);
		});

		//this is an important test even though it may not seem to be...
		it ("includes the deprecatedID in the string to be submitted", function(){
			expect(form.getDataO().getStr().indexOf('<deprecatedID>')).not.toEqual(-1);
		});

		it ("gives the new deprecatedID node the old value of the instanceID node of the instance-to-edit", function(){
			expect(form.getDataO().node('*>meta>deprecatedID').getVal()[0]).toEqual('7c990ed9-8aab-42ba-84f5-bf23277154ad');
		});

		it ("gives the instanceID node a new value", function(){
			expect(form.getDataO().node('*>meta>instanceID').getVal()[0].length).toEqual(41);
			expect(form.getDataO().node('*>meta>instanceID').getVal()[0]).not.toEqual('7c990ed9-8aab-42ba-84f5-bf23277154ad');
		});

		it ("adds data from the instance-to-edit to the form instance", function(){
			expect(form.getDataO().node('/thedata/nodeA').getVal()[0]).toEqual('2012-02-05T15:34:00.000-04:00');
			expect(form.getDataO().node('/thedata/repeatGroup/nodeC', 0).getVal()[0]).toEqual('some data');
		});

	});

	describe('when instanceID and deprecatedID nodes are already present in the form format', function(){
		form = loadForm('thedata.xml', dataEditStr1);//new Form(formStr1, dataEditStr1, dataEditStr1);
		form.init();

		it ("does not NOT add another instanceID node", function(){
			expect(form.getDataO().node('*>meta>instanceID').get().length).toEqual(1);
		});

		it ("does not NOT add another deprecatedID node", function(){
			expect(form.getDataO().node('*>meta>deprecatedID').get().length).toEqual(1);
		});

		it ("gives the deprecatedID node the old value of the instanceID node of the instance-to-edit", function(){
			expect(form.getDataO().node('*>meta>deprecatedID').getVal()[0]).toEqual('7c990ed9-8aab-42ba-84f5-bf23277154ad');
		});

		it ("gives the instanceID node a new value", function(){
			expect(form.getDataO().node('*>meta>instanceID').getVal()[0].length).toEqual(41);
			expect(form.getDataO().node('*>meta>instanceID').getVal()[0]).not.toEqual('7c990ed9-8aab-42ba-84f5-bf23277154ad');
		});

		it ("adds data from the instance-to-edit to the form instance", function(){
			expect(form.getDataO().node('/thedata/nodeA').getVal()[0]).toEqual('2012-02-05T15:34:00.000-04:00');
			expect(form.getDataO().node('/thedata/repeatGroup/nodeC', 0).getVal()[0]).toEqual('some data');
		});
	});

	describe('returns load errors upon initialization', function(){
		it('when the instance-to-edit contains nodes that are not present in the default instance', function(){
			var dataEditStr1a = dataEditStr1.replace(/thedata/g,'thedata_updated');
			form = loadForm('thedata.xml', dataEditStr1a);//new Form(formStr1, dataStr1, dataEditStr1a);
			loadErrors = form.init();
			expect(loadErrors.length).toEqual(10);
		});

		it('when an instance-to-edit is provided with double instanceID nodes', function(){
			var dataEditStr1a = dataEditStr1.replace('</thedata>', '<meta><instanceID>uuid:3b35ac780c10468d8be7d8c44f3b17df</instanceID></meta></thedata>');
			//first check it does not return erors when single instanceID node is present
			form = loadForm('thedata.xml', dataEditStr1);//new Form(formStr1, dataStr1, dataEditStr1);
			loadErrors = form.init();
			expect(loadErrors.length).toEqual(0);
			//then with the incorrect instance
			form = loadForm('thedata.xml', dataEditStr1a);//new Form(formStr1, dataStr1, dataEditStr1a);
			loadErrors = form.init();
			expect(loadErrors.length).toEqual(1);
			expect(loadErrors[0]).toEqual("Found duplicate meta node (instanceID)!");
		});
	});
});

describe('repeat functionality', function(){
	var form, timerCallback;

	//turn jQuery animations off
	jQuery.fx.off = true;

	describe('cloning', function(){
		beforeEach(function() {
			form = loadForm('thedata.xml');//new Form(formStr1, dataStr1);
			form.init();
		});

		it ("removes the correct instance and HTML node when the '-' button is clicked (issue 170)", function(){
			var repeatSelector = '.jr-repeat[name="/thedata/repeatGroup"]',
				nodePath = '/thedata/repeatGroup/nodeC',
				nodeSelector = 'input[name="'+nodePath+'"]',
				formH = form.getFormO(),
				data = form.getDataO(),
				index = 2;

			expect(formH.$.find(repeatSelector).eq(index).length).toEqual(1);
			expect(formH.$.find(repeatSelector).eq(index).find('button.remove').length).toEqual(1);
			expect(formH.$.find(nodeSelector).eq(index).val()).toEqual('c3');
			expect(data.node(nodePath, index).getVal()[0]).toEqual('c3');

			formH.$.find(repeatSelector).eq(index).find('button.remove').click();
			expect(data.node(nodePath, index).getVal()[0]).toEqual(undefined);
			//check if it removed the correct data node
			expect(data.node(nodePath, index-1).getVal()[0]).toEqual('c2');
			//check if it removed the correct html node
			expect(formH.$.find(repeatSelector).eq(index).length).toEqual(0);
			expect(formH.$.find(nodeSelector).eq(index-1).val()).toEqual('c2');
		});

		it ("marks cloned invalid fields as valid", function(){
			var repeatSelector = '.jr-repeat[name="/thedata/repeatGroup"]',
				nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]',
				formH = form.getFormO(),
				$node3 = formH.$.find(nodeSelector).eq(2),
				$node4;

			formH.setInvalid($node3);

			expect(formH.$.find(repeatSelector).length).toEqual(3);
			expect($node3.parent().hasClass('invalid-constraint')).toBe(true);
			expect(formH.$.find(nodeSelector).eq(3).length).toEqual(0);

			formH.$.find(repeatSelector).eq(2).find('button.repeat').click();

			$node4 = formH.$.find(nodeSelector).eq(2);
			expect(formH.$.find(repeatSelector).length).toEqual(4);
			expect($node4.length).toEqual(1);
			//console.log('cloned node parent: ', $node4.parent());
			/*****************************************************************************************/
			//expect($node4.parent().hasClass('invalid-constraint')).toBe(false); TODO: FIX THIS TEST
		});
	});

	it ("clones nested repeats if they are present in the instance upon initialization (issue #359) ", function(){
		//note that this form contains multiple repeats in the instance
		form = loadForm('nested_repeats.xml');
		form.init();
		var formH = form.getFormO(),
			model = form.getDataO(),
			$1stLevelTargetRepeat = formH.$.find('.jr-repeat[name="/nested_repeats/kids/kids_details"]').eq(1),
			$2ndLevelTargetRepeats = $1stLevelTargetRepeat.find('.jr-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]');

		expect($1stLevelTargetRepeat.length).toEqual(1);
		expect($2ndLevelTargetRepeats.length).toEqual(3);
	});

	//doesn't work in bloody Travis. STFU Travis!
	xit ("doesn't duplicate date widgets in a cloned repeat", function(){
		form = loadForm('nested_repeats.xml');
		form.init();
		var formH = form.getFormO(),
			model = form.getDataO(),
			$dates = formH.$.find('[name="/nested_repeats/kids/kids_details/immunization_info/date"]');

		expect($dates.length).toEqual(5);
		expect($dates.parent().find('.widget.date').length).toEqual(5);
	});
});

describe('calculations', function(){
	var formH, dataO, input1, input2,
		form = loadForm('calcs_in_repeats.xml');
	form.init();
	formH = form.getFormO();
	dataO = form.getDataO();
	it('also work inside repeats', function(){
		formH.$.find('button.repeat').click();
		formH.$.find('[name="/calcs_in_repeats/rep1/num1"]:eq(0)').val('10').trigger('change');
		formH.$.find('[name="/calcs_in_repeats/rep1/num1"]:eq(1)').val('20').trigger('change');
		expect(dataO.node('/calcs_in_repeats/rep1/calc3', 0).getVal()[0]).toEqual('200');
		expect(dataO.node('/calcs_in_repeats/rep1/calc3', 1).getVal()[0]).toEqual('400');
	});
});


describe('branching functionality', function(){
	var form;

	beforeEach(function() {
		//turn jQuery animations off
		jQuery.fx.off = true;
	});

	it ("hides irrelevant branches upon initialization", function(){
		form = new Form(formStr6, dataStr6);
		form.init();
		expect(form.getFormO().$.find('[name="/data/group"]').hasClass('disabled')).toBe(true);
		expect(form.getFormO().$.find('[name="/data/nodeC"]').parents('.disabled').length).toEqual(1);
	});

	it ("reveals a group branch when the relevant condition is met", function(){
		form = new Form(formStr6, dataStr6);
		form.init();
		//first check incorrect value that does not meet relevant condition
		form.getFormO().$.find('[name="/data/nodeA"]').val('no').trigger('change');
		expect(form.getFormO().$.find('[name="/data/group"]').hasClass('disabled')).toBe(true);
		//then check value that does meet relevant condition
		form.getFormO().$.find('[name="/data/nodeA"]').val('yes').trigger('change');
		expect(form.getFormO().$.find('[name="/data/group"]').hasClass('disabled')).toBe(false);
	});

	it ("reveals a question when the relevant condition is met", function(){
		form = new Form(formStr6, dataStr6);
		form.init();
		//first check incorrect value that does not meet relevant condition
		form.getFormO().$.find('[name="/data/group/nodeB"]').val(3).trigger('change');
		expect(form.getFormO().$.find('[name="/data/nodeC"]').parents('.disabled').length).toEqual(1);
		//then check value that does meet relevant condition
		form.getFormO().$.find('[name="/data/group/nodeB"]').val(2).trigger('change');
		expect(form.getFormO().$.find('[name="/data/nodeC"]').parents('.disabled').length).toEqual(0);
	});

	/*
	Issue 208 was a combination of two issues:
		1. branch logic wasn't evaluated on repeated radiobuttons (only on the original) in branch.update()
		2. position[i] wasn't properly injected in makeBugCompiant() if the context node was a radio button or checkbox
	 */
	it ('a) evaluates relevant logic on a repeated radio-button-question and b) injects the position correctly (issue 208)', function(){
		var repeatSelector = 'fieldset.jr-repeat[name="/issue208/rep"]';
		//form = new Form(formStr7, dataStr7);
		form = loadForm('issue208.xml');
		form.init();

		form.getFormO().$.find(repeatSelector).eq(0).find('button.repeat').click();
		expect(form.getFormO().$.find(repeatSelector).length).toEqual(2);
		//check if initial state of 2nd question in 2nd repeat is disabled

			console.debug('the input to check: ', form.getFormO().$.find(repeatSelector).eq(1)
				.find('[data-name="/issue208/rep/nodeB"]'));

		expect(form.getFormO().$.find(repeatSelector).eq(1)
			.find('[data-name="/issue208/rep/nodeB"]').closest('.restoring-sanity-to-legends')
			.hasClass('disabled')).toBe(true);
		//select 'yes' in first question of 2nd repeat
		form.getDataO().node('/issue208/rep/nodeA', 1).setVal('yes', null, 'string');
		//doublecheck if new value was set
		expect(form.getDataO().node('/issue208/rep/nodeA', 1).getVal()[0]).toEqual('yes');
		//check if 2nd question in 2nd repeat is now enabled
		expect(form.getFormO().$.find(repeatSelector).eq(1)
			.find('[data-name="/issue208/rep/nodeB"]').closest('.restoring-sanity-to-legends').hasClass('disabled')).toBe(false);

	});

	describe('when used with calculated items', function(){
		form = loadForm('calcs.xml');
		form.init();
		var $node = form.getFormO().$.find('[name="/calcs/cond1"]');
		var dataO = form.getDataO();

		it ('evaluates a calculated item only when it becomes relevant', function(){
			//node without relevant attribute:
			expect(dataO.node('/calcs/calc2').getVal()[0]).toEqual('12');
			//node that is irrelevant
			expect(dataO.node('/calcs/calc1').getVal()[0]).toEqual('');
			$node.val('yes').trigger('change');
			//node that has become relevant
			expect(dataO.node('/calcs/calc1').getVal()[0]).toEqual('3');
		});

		it ('empties an already calculated item once it becomes irrelevant', function(){
			$node.val('yes').trigger('change');
			expect(dataO.node('/calcs/calc1').getVal()[0]).toEqual('3');
			$node.val('no').trigger('change');
			expect(dataO.node('/calcs/calc1').getVal()[0]).toEqual('');
		});
	});

	//for some reason form.init() causes a declaration exception "Cannot read property 'style' of undefined"
	//this may be a phantomjs issue, so I gave up trying to fix it.
	xdescribe('inside repeats when multiple repeats are present upon loading (issue #507)', function(){
		form = loadForm('multiple_repeats_relevant.xml');
		form.init();
		var $relNodes = form.getFormO().$.find('[name="/multiple_repeats_relevant/rep/skipq"]').parent('.jr-branch');
		it ('correctly evaluates the relevant logic of each question inside all repeats', function(){
			expect($relNodes.length).toEqual(2);
			//check if both questions with 'relevant' attributes in the 2 repeats are disabled
			expect($relNodes.eq(0).hasClass('disabled')).toBe(true);
			expect($relNodes.eq(1).hasClass('disabled')).toBe(true);
		});
	});
});

describe('Required field validation', function(){
	var form, $numberInput, $branch;

	beforeEach(function() {
		jQuery.fx.off = true;//turn jQuery animations off
		form = new Form(formStr6, dataStr6);
		form.init();
		$numberInput = form.getFormO().$.find('[name="/data/group/nodeB"]');
		$numberLabel = form.getFormO().input.getWrapNodes($numberInput);
	});

	//this fails in phantomJS...
	xit ("validates a DISABLED and required number field without a value", function(){
		$numberInput.val('').trigger('change');
		expect($numberLabel.length).toEqual(1);
		expect($numberInput.val().length).toEqual(0);
		expect($numberLabel.parents('.jr-group').prop('disabled')).toBe(true);
		expect($numberLabel.hasClass('invalid-required')).toBe(false);
	});

	//see issue #144
	it ("validates an enabled and required number field with value 0 and 1", function(){
		form.getFormO().$.find('[name="/data/nodeA"]').val('yes').trigger('change');
		expect($numberLabel.length).toEqual(1);
		$numberInput.val(0).trigger('change').trigger('validate');
		expect($numberLabel.hasClass('invalid-required')).toBe(false);
		$numberInput.val(1).trigger('change').trigger('validate');
		expect($numberLabel.hasClass('invalid-required')).toBe(false);
	});

	it ("invalidates an enabled and required number field without a value", function(){
		form.getFormO().$.find('[name="/data/nodeA"]').val('yes').trigger('change');
		$numberInput.val('').trigger('change').trigger('validate');
		expect($numberLabel.hasClass('invalid-required')).toBe(true);
	});

	it ("invalidates an enabled and required textarea that contains only a newline character or other whitespace characters", function(){
		form = loadForm('thedata.xml');//new Form(formStr1, dataStr1);
		form.init();
		var $textarea = form.getFormO().$.find('[name="/thedata/nodeF"]');
		$textarea.val('\n').trigger('change').trigger('validate');
		expect($textarea.length).toEqual(1);
		expect($textarea.parent('label').hasClass('invalid-required')).toBe(true);
		$textarea.val('  \n  \n\r \t ').trigger('change').trigger('validate');
		expect($textarea.parent('label').hasClass('invalid-required')).toBe(true);
	});
});

describe('Readonly items', function(){
	it('preserve their default value', function(){
		var form = loadForm('readonly.xml');
		form.init();
		expect(form.getFormO().$.find('[name="/readonly/a"] .note-value').text()).toEqual('martijn');
	});
});

describe('Itemset functionality', function(){
	var form;

	it('is able to address an instance by id with the instance(id)/path/to/node syntax', function(){
		//form = new Form('', dataStr8);
		//form = new Form('', )
		//form.init();
		var dataO = getFormDataO('new_cascading_selections.xml');
		//console.log('data:', dataO.$.find('instance'));
		expect(dataO.evaluate("instance('cities')/root/item/name", "string")).toEqual('ams');
		expect(dataO.evaluate("instance('cities')/root/item[country=/new_cascading_selections/group4/country4]/name", "string")).toEqual('den');
		expect(dataO.evaluate("instance('cities')/root/item[country=/new_cascading_selections/group4/country4 and 1<2]", "nodes").length).toEqual(3);
		expect(dataO.evaluate("instance('cities')/root/item[country=/new_cascading_selections/group4/country4 and name=/new_cascading_selections/group4/city4]", "nodes").length).toEqual(1);
	});

	describe('in a cascading select using itext for all labels', function(){
		var $items1Radio, $items2Radio, $items3Radio, $items1Select, $items2Select, $items3Select, formHTMLO,
			sel1Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/country"]',
			sel2Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/city"]',
			sel3Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/neighborhood"]',
			sel1Select = 'select[name="/new_cascading_selections/group2/country2"]',
			sel2Select = 'select[name="/new_cascading_selections/group2/city2"]',
			sel3Select = 'select[name="/new_cascading_selections/group2/neighborhood2"]';

		beforeEach(function() {
			jQuery.fx.off = true;//turn jQuery animations off
			form = loadForm('new_cascading_selections.xml');
			form.init();

			formHTMLO = form.getFormO();
			spyOn(formHTMLO, 'itemsetUpdate').andCallThrough();

			$items1Radio = function(){return form.getFormO().$.find(sel1Radio);};
			$items2Radio = function(){return form.getFormO().$.find(sel2Radio);};
			$items3Radio = function(){return form.getFormO().$.find(sel3Radio);};
			$items1Select = function(){return form.getFormO().$.find(sel1Select+' > option:not(.itemset-template)');};
			$items2Select = function(){return form.getFormO().$.find(sel2Select+' > option:not(.itemset-template)');};
			$items3Select = function(){return form.getFormO().$.find(sel3Select+' > option:not(.itemset-template)');};
		});

		it('level 1: with <input type="radio"> elements has the expected amount of options', function(){
			expect($items1Radio().length).toEqual(2);
			expect($items1Radio().siblings().text()).toEqual('NederlandThe NetherlandsVerenigde StatenUnited States');
			expect($items2Radio().length).toEqual(0);
			expect($items3Radio().length).toEqual(0);
		});

		it('level 2: with <input type="radio"> elements has the expected amount of options', function(){
			//select first option in cascade
			runs(function(){
				form.getFormO().$.find(sel1Radio+'[value="nl"]').prop('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'country';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Radio().length).toEqual(2);
				expect($items2Radio().length).toEqual(3);
				expect($items2Radio().siblings().text()).toEqual('AmsterdamAmsterdamRotterdamRotterdamDrontenDronten');
				expect($items3Radio().length).toEqual(0);
			});
		});

		it('level 3: with <input type="radio"> elements has the expected amount of options', function(){
			//select first option
			runs(function(){
				form.getFormO().$.find(sel1Radio+'[value="nl"]').attr('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'country';}, 'itemsetUpdate not called!', 1000);

			//select second option
			runs(function(){
				form.getFormO().$.find(sel2Radio+'[value="ams"]').attr('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'city';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Radio().length).toEqual(2);
				expect($items2Radio().length).toEqual(3);
				expect($items3Radio().length).toEqual(2);
				expect($items3Radio().siblings().text()).toEqual('WesterparkWesterparkDe DamDam');
			});

			//select other first option to change itemset
			runs(function(){
				form.getFormO().$.find(sel1Radio+'[value="nl"]').attr('checked', false);
				form.getFormO().$.find(sel1Radio+'[value="usa"]').attr('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'city';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Radio().length).toEqual(2);
				expect($items2Radio().length).toEqual(3);
				expect($items2Radio().siblings().text()).toEqual('DenverDenverNieuw AmsterdamNew York CityDe EngelenLos Angeles');
				expect($items3Radio().length).toEqual(0);
			});
		});

		it('level 1: with <select> <option> elements has the expected amount of options', function(){
			expect($items1Select().length).toEqual(2);
			expect($items1Select().eq(0).attr('value')).toEqual('nl');
			expect($items1Select().eq(1).attr('value')).toEqual('usa');
			expect($items2Select().length).toEqual(0);
		});

		it('level 2: with <select> <option> elements has the expected amount of options', function(){
			//select first option in cascade
			runs(function(){
				form.getFormO().$.find(sel1Select).val("nl").trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'country2';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Select().length).toEqual(2);
				expect($items2Select().length).toEqual(3);
				expect($items2Select().eq(0).attr('value')).toEqual('ams');
				expect($items2Select().eq(2).attr('value')).toEqual('dro');
				expect($items3Select().length).toEqual(0);
			});
		});

		it('level 3: with <select> <option> elements has the expected amount of options', function(){
			//select first option in cascade
			runs(function(){
				form.getFormO().$.find(sel1Select).val("nl").trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'country2';}, 'itemsetUpdate not called!', 1000);

			//select second option
			runs(function(){
				form.getFormO().$.find(sel2Select).val("ams").trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'city2';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Select().length).toEqual(2);
				expect($items2Select().length).toEqual(3);
				expect($items3Select().length).toEqual(2);
				expect($items3Select().eq(0).attr('value')).toEqual('wes');
				expect($items3Select().eq(1).attr('value')).toEqual('dam');
			});

			//select other first option to change itemset
			runs(function(){
				form.getFormO().$.find(sel1Select).val("usa").trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'city2';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Select().length).toEqual(2);
				expect($items2Select().length).toEqual(3);
				expect($items2Select().eq(0).attr('value')).toEqual('den');
				expect($items2Select().eq(2).attr('value')).toEqual('la');
				expect($items3Select().length).toEqual(0);
			});
		});
	});

	describe('in a cascading select that includes labels without itext', function(){
		var $items1Radio, $items2Radio, $items3Radio, formHTMLO,
			sel1Radio = ':not(.itemset-template) > input:radio[data-name="/form/state"]',
			sel2Radio = ':not(.itemset-template) > input:radio[data-name="/form/county"]',
			sel3Radio = ':not(.itemset-template) > input:radio[data-name="/form/city"]';

		beforeEach(function() {
			jQuery.fx.off = true;//turn jQuery animations off
			form = loadForm('cascading_mixture_itext_noitext.xml');
			form.init();

			formHTMLO = form.getFormO();
			spyOn(formHTMLO, 'itemsetUpdate').andCallThrough();

			$items1Radio = function(){return form.getFormO().$.find(sel1Radio);};
			$items2Radio = function(){return form.getFormO().$.find(sel2Radio);};
			$items3Radio = function(){return form.getFormO().$.find(sel3Radio);};
		});

		it('level 3: with <input type="radio"> elements using direct references to instance labels without itext has the expected amount of options', function(){
			//select first option
			runs(function(){
				form.getFormO().$.find(sel1Radio+'[value="washington"]')
					.attr('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'state';}, 'itemsetUpdate not called!', 1000);

			//select second option
			runs(function(){
				form.getFormO().$.find(sel2Radio+'[value="king"]')
					.attr('checked', true).trigger('change');
			});

			waitsFor(function(){return formHTMLO.itemsetUpdate.mostRecentCall.args[0] === 'county';}, 'itemsetUpdate not called!', 1000);

			runs(function(){
				expect($items1Radio().length).toEqual(2);
				expect($items2Radio().length).toEqual(3);
				expect($items3Radio().length).toEqual(2);
				expect($items3Radio().siblings().text()).toEqual('SeattleRedmond');
			});
		});
	});

	describe('in a cloned repeat that includes a cascading select', function(){
		var countrySelector = '[data-name="/new_cascading_selections_inside_repeats/group1/country"]',
			citySelector = 'label:not(.itemset-template) [data-name="/new_cascading_selections_inside_repeats/group1/city"]',

			form, $masterRepeat, $clonedRepeat;

		beforeEach(function(){
			form = loadForm('new_cascading_selections_inside_repeats.xml'),
			form.init();
			$masterRepeat = form.getFormO().$.find('.jr-repeat'),
			//select usa in master repeat
			$masterRepeat.find(countrySelector+'[value="usa"]').prop('checked', true).trigger('change');
			//add repeat
			$masterRepeat.find('button.repeat').click();
			$clonedRepeat = form.getFormO().$.find('.jr-repeat.clone');
		});

		it('the itemset of the cloned repeat is correct (and not a cloned copy of the master repeat)', function(){
			expect($masterRepeat.find(citySelector).length).toEqual(3);
			expect($clonedRepeat.find(countrySelector+':selected').val()).toBeUndefined();
			expect($clonedRepeat.find(citySelector).length).toEqual(0);
		});

		it('the itemset of the master repeat is not affected if the cloned repeat is changed', function(){
			$clonedRepeat.find(countrySelector+'[value="nl"]').prop('checked', true).trigger('change');
			expect($masterRepeat.find(citySelector).length).toEqual(3);
			expect($masterRepeat.find(citySelector).eq(0).attr('value')).toEqual('den');
			expect($clonedRepeat.find(citySelector).length).toEqual(3);
			expect($clonedRepeat.find(citySelector).eq(0).attr('value')).toEqual('ams');
		});
	});
});

describe('output data functionality', function(){
	var dataO,
		form = new Form('', '');

	it('outputs a clone of the primary instance first child as a jQuery object if the object is wrapped inside <instance> and <model>', function(){
		dataO = form.Data('<model><instance><node/></instance><instance id="secondary"><secondary/></instance></model>');
		expect(dataO.getInstanceClone().length).toEqual(1);
		expect(dataO.getInstanceClone().prop('nodeName')).toEqual('node');
	});

	it('outputs a clone of the first node as a jQuery object if the object is NOT wrapped inside <instance> and <model>', function(){
		dataO = form.Data('<node/>');
		expect(dataO.getInstanceClone().length).toEqual(1);
		expect(dataO.getInstanceClone().prop('nodeName')).toEqual('node');
	});

});