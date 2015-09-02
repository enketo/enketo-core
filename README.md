## enketo-core 

[![npm version](https://badge.fury.io/js/enketo-core.svg)](http://badge.fury.io/js/enketo-core) [![Build Status](https://travis-ci.org/enketo/enketo-core.svg?branch=master)](https://travis-ci.org/enketo/enketo-core) [![Dependency Status](https://david-dm.org/enketo/enketo-core/status.svg)](https://david-dm.org/enketo/enketo-core) [![devDependency Status](https://david-dm.org/enketo/enketo-core/dev-status.svg)](https://david-dm.org/enketo/enketo-core#info=devDependencies) [![Codacy Badge](https://www.codacy.com/project/badge/dc1c5aaa9267d75cbd2d6714d2b4fa32)](https://www.codacy.com/app/martijn_1548/enketo-core)

The engine that powers [Enketo Smart Paper](https://enketo.org) and [various third party tools](https://enketo.org/#tools).

This repo is meant to use as a building block for any enketo-powered application.

Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.

### Usage as a library

1. Install with `npm install enketo-core --save` or include as a git submodule.
2. Develop a way to perform an XSL Transformation on OpenRosa-flavoured XForms inside your app. The transformation will output an XML instance and a HTML form. See [enketo-transformer](https://github.com/enketo/enketo-transformer) for an example. For development purposes you may also use the free (and slow, not robust at all) API provided by Enketo LLC at [http://xslt-dev.enketo.org/transform](http://xslt-dev.enketo.org/transform/) (add `?xform=http://myforms.com/myform.xml` to use API).
3. Add [themes](./src/sass) to your stylesheet build system (2 stylesheets per theme, 1 is for `media="print"`).
4. Override [config.json](./config.json) and optionally [widgets.js](./src/js/widgets.js) with your app-specific versions.
5. Main methods illustrated in code below:

```javascript 
	
var Form = require('enketo-core');

// The XSL transformation result contains a HTML Form and XML instance.
// These can be obtained dynamically on the client, or at the server/
// In this example we assume the HTML was injected at the server and modelStr 
// was injected as a global variable inside a <script> tag.

// required string of the jquery selector of the HTML Form DOM element
var formSelector = 'form.or:eq(0)';

// required object containing data for the form
var data = {
	// required string of the default instance defined in the XForm
	modelStr: globalXMLInstance,
	// optional string of an existing instance to be edited
	instanceStr: null,
	// optional boolean whether this instance has been submitted already
	submitted: false,
	// optional array of objects containing {id: 'someInstanceId', xmlStr: '<root>external instance content</root>'}
	external = []
};

// instantiate a form, with 2 parameters
var form = new Form( formSelector, data);

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
        form = new Form( 'form.or:eq(0)', { modelStr: modelStr } );

        // do what you want with the record
    }
} );

```

### How to run to develop on enketo-core

1. install [node](http://nodejs.org/) and [grunt-cli](http://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt`
4. start built-in auto-reloading development server with `grunt develop` 
5. browse to [http://localhost:8005/forms/index.html](http://localhost:8005/forms/index.html)

### How to create or extend widgets

To create new widgets, we recommend using this [plugin template](https://gist.github.com/MartijnR/6943281). The option {touch: [boolean]}, is added automatically to all widgets to indicate whether the client is using a touchscreen device.

Each widget needs to fulfill following requirements:

* be an CommonJS/AMD-compliant jQuery plugin
* it needs to return an object with its own name and selector-to-instantiate with
* path to stylesheet scss file relative to the widget's own folder to be added in [_widgets.scss](./src/sass/core/_widgets.scss) (this will be automated in the future)
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
* please write test specs in the widget's /test folder.....(yeah, need to do that for the existing widgets too...)

### Notes for All Developers

* build with grunt
* helpful to use `grunt develop` to automatically compile (sass and js) when a source file changes, serve, and refresh
* adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### Notes for JavaScript Developers

* The JS library uses CommonJS modules, but all the modules are still AMD-compliant. It may be quite a bit of work to get them working properly using requirejs though (AMD-specific issues won't be fixed by us, but AMD-specific patches/PRs are welcome)
* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still trying to find a JS Documentation system to use that likes Closure-style JSDoc
* JavaScript style see [JsBeautifier](./.jsbeautifyrc) config file, the jsbeautifier check is added to the grunt `test` task. You can also manually run `grunt jsbeautifier:fix` to fix style issues (Note, I had to add `"ensure_newline_at_eof_on_save": true` to the Sublime Text 3 user settings to make grunt jsbeautifier happy with the style produced by the ST3 JsFormat plugin.)
* Testing is done with Jasmine and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
* When making a pull request, please add tests where relevant

### Notes for CSS Developers

The core can be fairly easily extended with alternative themes. 
See the *plain*, the *grid*, and the *formhub* themes already included in [/src/sass](./src/sass). 
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme. 

For custom themes that go beyond just changing colors and fonts, keep in mind all the different contexts for a theme:

1. non-touchscreen vs touchscreen (add ?touch=true during development)
2. default one-page-mode and multiple-pages-mode
3. right-to-left form language vs left-to-right form language (!) - also the UI-language may have a different directionality
4. screen view vs. print view
5. questions inside a (nested) repeat group have a different background
6. large screen size --> smaller screen size ---> smallest screen size 
7. question in valid vs. invalid state

### Acknowledgements

I would like to acknowledge and thank the indirect contribution by the creators of the following excellent works that were used in the project:

* [XPathJS by Andrej Pavlovic](https://github.com/andrejpavlovic/xpathjs)
* [Bootstrap Datepicker by eternicode](https://github.com/eternicode/bootstrap-datepicker)
* [Bootstrap Timepicker by jdewit](http://jdewit.github.io/bootstrap-timepicker/)

### Sponsors

The development of this app and [enketo-core](https://github.com/enketo/enketo-core) was sponsored by:

* [Sustainable Engineering Lab at Columbia University](http://modi.mech.columbia.edu/)
* [WHO - HRP project](http://www.who.int/reproductivehealth/topics/mhealth/en/index.html)
* [Santa Fe Insitute & Slum/Shack Dwellers International](http://www.santafe.edu/)
* [Enketo LLC](http://www.linkedin.com/company/enketo-llc)
* [iMMAP](http://immap.org)
* [KoBo Toolbox (Harvard Humanitarian Initiative)](https://kobotoolbox.org)
* [Enketo LLC](https://enketo.org)

### Related Projects

* [Enketo Express](https://github.com/enketo/enketo-express) - The modern node.js Enketo Smart Paper app
* [Enketo Legacy](https://github.com/enketo/enketo-legacy) - The old PHP Enketo Smart Paper app 
* [Enketo XpathJS](https://github.com/enketo/enketo-xpathjs) - The XPath evaluator used in the form engine (enketo-core)
* [Enketo Transformer](https://github.com/enketo/enketo-transformer) - Node.js XSL Transformer module for Enketo.
* [Enketo XSLT](https://github.com/enketo/enketo-xslt) - The XSLT sheets used to transform OpenRosa XForms into Enketo HTML forms
* [Enketo XSLT Transformer PHP](https://github.com/enketo/enketo-xslt-transformer-php) - A minimalistic example in PHP of an XSLT transformer
* [Enketo Dristhi](https://github.com/enketo/enketo-dristhi) - used inside an Android app around enketo
* [Enketo JSON](https://github.com/enketo/enketo-json) - XML-JSON instance convertor used inside e.g. Dristhi

### Change log

See [change log](./CHANGELOG.md)

### Performance (live)

See [graphs](https://github.com/enketo/enketo-core-performance-monitor#live-results)

