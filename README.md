enketo-core [![Build Status](https://travis-ci.org/enketo/enketo-core.svg)](https://travis-ci.org/enketo/enketo-core) [![devDependency Status](https://david-dm.org/enketo/enketo-core/dev-status.svg)](https://david-dm.org/enketo/enketo-core#info=devDependencies)
================

The engine that powers [Enketo Smart Paper](https://enketo.org) and various third party tools.

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.


###How to run it

1. install [node](http://nodejs.org/) (and [npm](https://npmjs.org/)), [grunt-cli](http://gruntjs.com/getting-started) and [ruby](https://www.ruby-lang.org/en/downloads/)
2. clone the repo
3. get the submodules with `git submodule update --init --recursive` (run this again after pulling updates!)
3. install most dependencies with `npm install` and `bower install`
4. install sass with `gem install sass` or `gem update sass` if already installed
4. build and test with `grunt`
5. start built-in server with `grunt server` 
6. browse to [http://localhost:8080/forms/dev.html](http://localhost:8080/forms/dev.html) (static form) or 
7. browse to [http://localhost:8080/forms/index.html](http://localhost:8080/forms/index.html) (dynamic AJAX form loader)


###Recommended usage as a library

1. Develop a way to perform an XSL Transformation on OpenRosa-flavoured XForms inside your app. The transformation will output an XML instance and a HTML form. See [enketo-xslt-transformer-php](https://github.com/MartijnR/enketo-xslt-transformer-php) for an example. For development purposes you may also use the free (and slow, not robust at all) API provided by Enketo LLC at [http://xslt-dev.enketo.org/](http://xslt-dev.enketo.org/) (add `?xform=http://myforms.com/myform.xml` to use API).
2. Fork enketo-core so you can extend it and easily send pull requests back to this repository.
3. Add your enketo-core fork as a git submodule to your app (e.g. in /lib). This provides an easy way to pull updates to enketo-core into your application.
4. Ignore (or copy parts of) [Gruntfile.js](Gruntfile.js), [config.json](config.json) and [app.js](app.js) and create your own app's build system instead
5. If you make changes to enketo-core, send a pull request to the [https://github.com/MartijnR/enketo-core]! As an added advantage, when your pull request gets accepted it will be much easier to keep your app up-to-date with the latest enketo-core updates without merge conflicts.
6. Main methods illustrated in code below:

```javascript 

requirejs(['js/Form'], function (Form){

	// The XSL transformation result contains a HTML Form and XML instance.
	// These can be obtained dynamically on the client, or at the server/
	// In this example we assume the HTML was injected at the server and modelStr 
	// was injected as a global variable inside a <script> tag.

	// string of the jquery selector of the HTML Form DOM element
	var formSelector = 'form.or:eq(0)';

	// string of the default instance defined in the XForm
	var modelStr = globalXMLInstance;

	// string of an existing instance to be edited
	var modelToEditStr = null;

	// instantiate a form, with 2 (or 3) parameters
	var form = new Form( formSelector, modelStr, modelToEditStr);

	//initialize the form and capture any load errors
	var loadErrors = form.init();

	//submit button handler for validate button
    $( '#submit' ).on( 'click', function() {
        form.validateForm();
        if ( !form.isValid() ) {
            alert( 'Form contains errors. Please see fields marked in red.' );
        } else {
            // Record is valid! 
            var record = form.getDataStr();

            // reset the form view
            form.resetView();

            // reinstantiate a new form with the default model 
            form = new Form( 'form.or:eq(0)', modelStr);

            // do what you want with the record
        }
    } );
});
```

###How to create or extend widgets

The form [dev.html](forms/dev.html) is a useful form to test widgets. For new widgets, I recommend usin this [plugin template](https://gist.github.com/MartijnR/6943281). The option {touch: [boolean]}, is added automatically to all widgets to indicate whether the client is using a touchscreen device and whether the widgets are inside a newly cloned repeat.

Each widget needs to fulfill following requirements:

* be an AMD-compliant jQuery plugin
* be in its own folder with a config.json file, including
	* `name: ` the name of the widget used to instantiate it, or null if the widget only contains scss (see select-likert)
	* `selector: ` the selector of the elements to instantiate the widget on, or `null` if it needs to be applied globally
	* `options: ` any default options to pass
	* `stylesheet: ` path to stylesheet scss file relative to the widget's own folder
* be responsive up to a minimum window width of 320px
* use JSDoc style documentation for the purpose of passing the Google Closure Compiler without warnings and errors
* if hiding the original input element, it needs to load the default value from that input element into the widget
* if hiding the original input element, it needs to keep it synchronized and trigger a change event on the original whenever it updates
* it is recommended to apply the `widget` css class to any new elements it adds to the DOM (but not to their children)
* new input/select/textarea elements inside widgets need to get the `ignore` class
* it requires the following methods (which can be automatically obtained by extending the Widget base class as demonstrated in the [plugin template](https://gist.github.com/MartijnR/6943281)
	* `destroy(element)` to totally destroy widgets in *repeat* groups/questions when these groups/questions are cloned This may be an empty function if:
		* a deep `$.clone(true, true)` of the widget (incl data and eventhandlers) works without problems (problems are likely!)
	* `enable()` to enable the widget when a disabled ancestor gets enabled. This may be an empty function if that happens automatically.
	* `disable()` This may be an empty function if the widgets gets disabled automatically cross-browser when its branch becomes irrelevant.
	* `update()` to update the widget when called after the content used to instantiate it has changed (language or options). In its simplest form this could simply call destroy() and then re-initialize the widget, or be an empty function if language changes are handled automatically and it is not a `<select>` widget.
* any eventhandlers added to the original input should be namespaced (if extending the Widget base class, the namespace is available as `this.namespace`)
* if the widget needs tweaks or needs to be disabled for mobile (touchscreen) use, build this in. The option `{ touch: [boolean] }` is passed to the plugin by default. If your widget requires tweaks for mobile, you could create an all-in-one widget using the `options.touch` check or you could create separate widgets for desktop and mobile (as done with select-desktop and select-mobile widgets)
* allow clearing of the original input (i.e. setting value to '')
* send a `fakefocus` and `fakeblur` event to the original input when the widget gets focus or looses it (see select-desktop)
* please write Jasmine specs and a runner.html in the widget's /test folder.....(yeah, need to do that for the existing widgets too...)

###Notes for All Developers

* build with Grunt (using Compass for sass is also possible as long as config.json does not change)
* use `grunt watch` to automatically compile (sass) when a source file changes
* requires webserver - one is included in this repo and can be fired up with `grunt server`
* adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

###Notes for JavaScript Developers

* The JS library uses Require.js
* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still trying to find a JS Documentation system to use with grunt that likes Closure-style JSDoc
* JavaScript style see [JsBeautifier](./.jsbeautifyrc) config file, the jsbeautifier check is added to the grunt `test` task. You can also manually run `grunt jsbeautifier:fix` to fix style issues (Note, I had to add `"ensure_newline_at_eof_on_save": true` to the Sublime Text 2 user settings to make grunt jsbeautifier happy with the style produced by the ST2 JsFormat plugin.)
* Testing is done with Jasmine (in browser and headless with phantomjs `grunt test`)
* When making a pull request, please add tests where relevant

###Notes for CSS Developers

The core can be fairly easily extended with alternative themes. 
See the *default* and the *formhub* themes already included in /src/sass. 
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme. 

###Acknowledgements

I would like to acknowledge and thank the indirect contribution by the creators of the following excellent works that were used in the project:

* [XPathJS by Andrej Pavlovic](https://github.com/andrejpavlovic/xpathjs)
* [JQuery](http://jquery.com)
* [Modernizr](http://modernizr.com)
* [Bootstrap](http://twitter.github.com/bootstrap/)
* [Bootstrap Datepicker by eternicode](https://github.com/eternicode/bootstrap-datepicker)
* [Bootstrap Timepicker by jdewit](http://jdewit.github.io/bootstrap-timepicker/)

###Related Projects

* [enketo-express](https://github.com/enketo/enketo-express) - A modern node.js version of Enketo Smart Paper
* [enketo-xpath-js](https://github.com/enketo/enketo-xpathjs) - used inside this repo
* [enketo-xslt](https://github.com/MartijnR/enketo-xslt) - the XSLT sheets used to transform OpenRosa XForms into Enketo HTML forms
* [enketo-xslt-transformer-php](https://github.com/MartijnR/enketo-xslt-transformer-php) - a minimalistic example in PHP of an XSLT transformer
* [enketo-xslt-transformer-node] - To follow hopefully
* [enketo-dristhi](https://github.com/enketo/enketo-dristhi) - used inside an Android app around enketo
* [enketo-json](https://github.com/MartijnR/enketo-json) - XML-JSON instance convertor used inside e.g. Dristhi
* [file-manager](https://github.com/enketo/file-manager) - library to deal with the experimental Filesystem API
* [openrosa-forms](https://github.com/MartijnR/openrosa-forms) - bunch of test forms, for development
* [enketo-api-docs](https://github.com/MartijnR/enketo-api-docs) - recommended API to support with your app
