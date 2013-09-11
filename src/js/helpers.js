/**
 * Pads a string with prefixed zeros until the requested string length is achieved.
 * @param  {number} digits [description]
 * @return {String|string}        [description]
 */
String.prototype.pad = function(digits){
	var x = this;
	while (x.length < digits){
		x = '0'+x;
	}
	return x;
};

var profilerRecords = [];
var xpathEvalNum=0, xpathEvalTime=0, xpathEvalTimePure=0;

/**
 * Little profiler
 * @param {string} taskName [description]
 * @constructor
 */
function Profiler( taskName ) {
	var start = new Date().getTime();
	/**
	 * @param  {string=} message [description]
	 */
	this.report = function( message ) {
		message = message || 'time taken for '+taskName+' to execute in milliseconds: '+ (new Date().getTime() - start);
		//console.error(message);
		profilerRecords.push(message);
	};
}

/**
 * splits an array of file sizes into batches (for submission) based on a limit
 * @param  {Array.<number>} fileSizes   array of file sizes
 * @param  {number}     limit   limit in byte size of one chunk (can be exceeded for a single item)
 * @return {Array.<Array.<number>>} array of arrays with index, each secondary array of indices represents a batch
 */
function divideIntoBatches( fileSizes, limit ) {
	var i, j, batch, batchSize,
		sizes = [],
		batches = [];
	//limit = limit || 5 * 1024 * 1024;
	for ( i=0; i < fileSizes.length ; i++ ) {
		sizes.push({ 'index': i, 'size': fileSizes[i] });
	}
	while( sizes.length > 0){
		batch = [sizes[0].index];
		batchSize = sizes[0].size;
		if (sizes[0].size < limit) {
			for ( i = 1; i<sizes.length; i++ ) {
				if (( batchSize + sizes[i].size) < limit ) {
					batch.push(sizes[i].index);
					batchSize += sizes[i].size;
				}
			}
		}
		batches.push(batch);
		for (i=0; i<sizes.length; i++){
			for (j=0; j<batch.length; j++){
				if (sizes[i].index === batch[j]){
					sizes.splice(i, 1);
				}
			}
		}
	}
	return batches;
}

var helper = new Helper();
/**
 * @constructor
 */
function Helper() {
	"use strict";
	this.setSettings = function() {
		var i, queryParam,
			settingsMap =
			[
				{q: 'return', s: 'returnURL'},
				{q: 'showbranch', s: 'showBranch'},
				{q: 'debug', s: 'debug'},
				{q: 'touch', s: 'touch'},
				{q: 'server', s: 'serverURL'},
				{q: 'form', s:'formURL'},
				{q: 'id', s: 'formId'},
				{q: 'formName', s: 'formId'},
				{q: 'instanceId', s: 'instanceId'},
				{q: 'entityId', s: 'entityId'}
			];
		for (i=0 ; i< settingsMap.length ; i++) {
			queryParam = this.getQueryParam(settingsMap[i].q);
			//a query variable has preference
			settings[settingsMap[i].s] = (queryParam !== null) ?
				queryParam : (typeof settings[settingsMap[i].s] !== 'undefined') ? settings[settingsMap[i].s] : null;
		}
	};
	this.getQueryParam = function ( param ) {
		var allParams = this.getAllQueryParams();
		for (var paramName in allParams){
			if (paramName.toLowerCase() === param.toLowerCase()){
				return allParams[paramName];
			}
		}
		return null;
	};
	this.getAllQueryParams = function() {
		var val, processedVal,
			query = window.location.search.substring(1),
			vars = query.split("&"),
			params = {};
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			if (pair[0].length > 0){
				val = decodeURIComponent(pair[1]);
				processedVal = (val === 'true') ? true : (val === 'false') ? false : val;
				params[pair[0]] = processedVal;
			}
		}
		return params;
	};
}

window.onload = function() {
	setTimeout( function(){
		var loadLog, t, loadingTime, exLog, timingO = {};
		if (window.performance){
			t = window.performance.timing;
			loadingTime = t.loadEventEnd - t.responseEnd;
			if (typeof settings !== 'undefined' && settings.debug){
				exLog = /**@type {string} */window.localStorage.getItem('__loadLog');
				loadLog = (exLog) ? JSON.parse(exLog) : [];
				loadLog.push(loadingTime);
				if (loadLog.length > 10){
					loadLog.shift();
				}
				window.localStorage.setItem('__loadLog', JSON.stringify(loadLog));
			}
			profilerRecords.push('total loading time: '+ loadingTime+' milliseconds');
			//$('.enketo-power').append('<p style="font-size: 0.7em;">(total load: '+loadingTime+' msec, XPath: '+xpathEvalTime+' msec)</p>');
			//FF doesn't allow stringifying native window objects so we create a copy first
			for (var prop in window.performance.timing) { timingO[prop] = window.performance.timing[prop]; }
			if (window.opener && window.performance && window.postMessage) window.opener.postMessage(JSON.stringify(timingO), '*');
			$(profilerRecords).each(function(i,v){console.log(v);});
		}
	}, 0 );
};

( function( $ ){
	"use strict";

	/**
	 * Creates an XPath from a node (currently not used inside this Class (instead FormHTML.prototype.generateName is used) but will be in future);
	 * @param  {string=} rootNodeName   if absent the root is #document
	 * @return {string}                 XPath
	 */
	$.fn.getXPath = function(rootNodeName) {
		//other nodes may have the same XPath but because this function is used to determine the corresponding input name of a data node, index is not included 
		var position,
			$node = this.first(),
			nodeName = $node.prop('nodeName'),
			//$sibSameNameAndSelf = $node.siblings(nodeName).addBack(),
			steps = [nodeName],
			$parent = $node.parent(),
			parentName = $parent.prop('nodeName');

		//position = ($sibSameNameAndSelf.length > 1) ? '['+($sibSameNameAndSelf.index($node)+1)+']' : '';
		//steps.push(nodeName+position);

		while ($parent.length == 1 && parentName !== rootNodeName && parentName !== '#document') {
			//$sibSameNameAndSelf = $parent.siblings(parentName).addBack();
			//position = ($sibSameNameAndSelf.length > 1) ? '['+($sibSameNameAndSelf.index($parent)+1)+']' : '';
			//steps.push(parentName+position);
			steps.push(parentName);
			$parent = $parent.parent();
			parentName = $parent.prop('nodeName');
		}
		return '/'+steps.reverse().join('/');
	};

	// give a set of elements the same (longest) width
	$.fn.toLargestWidth = function( plus ){
		var largestWidth = 0;
		plus = plus || 0;
		return this.each(function(){
			if ($(this).width() > largestWidth) {
				largestWidth = $(this).width();
			}
		}).each(function(){
			$(this).width(largestWidth + plus);
		});
	};

	$.fn.toSmallestWidth = function() {
		var smallestWidth = 2000;
		return this.each(function(){
			if ($(this).width() < smallestWidth) {
				smallestWidth = $(this).width();
			}
		}).each(function(){
			$(this).width(smallestWidth);
		});
	};

	//reverse jQuery collection
	$.fn.reverse = [].reverse;

	// Alphanumeric plugin for form input elements see http://www.itgroup.com.ph/alphanumeric/
	$.fn.alphanumeric = function( p ) {

		p = $.extend({
			ichars: "!@#$%^&*()+=[]\\\';,/{}|\":<>?~`.- ",
			nchars: "",
			allow: ""
		}, p);

		return this.each(function(){

			if (p.nocaps) p.nchars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			if (p.allcaps) p.nchars += "abcdefghijklmnopqrstuvwxyz";

			var s = p.allow.split('');
			for (var i=0;i<s.length;i++) if (p.ichars.indexOf(s[i]) != -1) s[i] = "\\" + s[i];
			p.allow = s.join('|');

			var reg = new RegExp(p.allow,'gi');
			var ch = p.ichars + p.nchars;
			ch = ch.replace(reg,'');

			$(this).keypress
				(
					function (e)
						{
							var k;
							if (!e.charCode) k = String.fromCharCode(e.which);
								else k = String.fromCharCode(e.charCode);

							if (ch.indexOf(k) != -1) e.preventDefault();
							if (e.ctrlKey&&k=='v') e.preventDefault();

						}

				);

			$(this).bind('contextmenu',function () {return false;});
		});
	};

	$.fn.numeric = function( p ) {

		var az = "abcdefghijklmnopqrstuvwxyz";
		az += az.toUpperCase();

		p = $.extend({
			nchars: az
		}, p);

		return this.each (function()
			{
				$(this).alphanumeric(p);
			}
		);

	};

	$.fn.alpha = function( p ) {

		var nm = "1234567890";

		p = $.extend({
			nchars: nm
		}, p);

		return this.each (function()
			{
				$(this).alphanumeric(p);
			}
		);

	};

	$.fn.btnBusyState = function(busy) {
		var $button, btnContent;
		return this.each( function() {
			$button = $(this);
			btnContent = $button.data('btnContent');
			console.log('busy ', busy);
			console.log('btnContent', btnContent);

			if (busy && !btnContent) {
				btnContent = $button.html();
				$button.data('btnContent', btnContent);
				$button
					.empty()
					.append('<progress></progress>')
					.attr('disabled', true);
			} else if (!busy && btnContent) {
				$button.data('btnContent', null);
				$button
					.empty()
					.append(btnContent)
					.removeAttr('disabled');
			}
		} );
	};

	// plugin to select the first word(s) of a string and capitalize it
	$.fn.capitalizeStart = function ( numWords ) {
		if(!numWords){
			numWords = 1;
		}
		var node = this.contents().filter(function () {
			return this.nodeType == 3;
			}).first(),
			text = node.text(),
			first = text.split(" ", numWords).join(" ");

		if (!node.length)
			return;

		node[0].nodeValue = text.slice(first.length);
		node.before('<span class="capitalize">' + first + '</span>');
	};


})(jQuery);