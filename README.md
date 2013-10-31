enketo-core [![Build Status](https://travis-ci.org/MartijnR/enketo-core.png)](https://travis-ci.org/MartijnR/enketo-core)
================

The engine that powers [Enketo Smart Paper](https://enketo.org).

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.


##Enketo-core 2.0 is Under Active Construction!

It will be considered stable when [this milestone](https://github.com/MartijnR/enketo-core/issues?milestone=1&state=open) is reached.


###Related Projects

* [XPathJS_javarosa](https://github.com/MartijnR/xpathjs_javarosa) - used inside this repo
* [enketo-xslt](https://github.com/MartijnR/enketo-xslt) - the XSLT sheets used to transform OpenRosa XForms into Enketo HTML forms
* [enketo-xslt-transformer-php](https://github.com/MartijnR/enketo-xslt-transformer-php) - a minimalistic example in PHP of an XSLT transformer
* [enketo-xslt-transformer-node] - To follow
* [enketo-dristhi](https://github.com/MartijnR/enketo-dristhi)
* [file-manager](https://github.com/MartijnR/file-manager)
* [openrosa-forms](https://github.com/MartijnR/openrosa-forms) - bunch of test forms, for development

###How to run it

1. install node, npm, grunt-cli
2. clone repo
3. install dependencies from project root with `npm install`
4. build and test with `grunt`
5. start built-in server with `grunt server` or use an alternative
6. browse to e.g. 'http://localhost:8080/forms/dev.html`


###Recommended usage as a library

1. Develop a way to perform an XSLT Transformations on the OpenRosa-flavoured XForm inside your app. The transformation will output an XML instance and a HTML form. See [enketo-xslt-transformer-php](https://github.com/MartijnR/enketo-xslt-transformer-php) for an example. For development purposes you may also use this free (and slow, not robust) API provided by Enketo LLC: [http://xslt-dev.enketo.org/](http://xslt-dev.enketo.org/) 
2. Fork enketo-core so you can extend it and easily send pull requests back to this repository.
3. Add your fork as a git submodule to your app (e.g. in /lib). This provides an easy way to pull updates to enketo-core into your application.
4. Ignore (or copy parts of) [Gruntfile.js](Gruntfile.js), [config.json](config.json) and [app.js](app.js) and create your own app's build system instead (in your App's root)
5. If you make changes to enketo-core, send a pull request to the [https://github.com/MartijnR/enketo-core]! As an added advantage, when your pull request gets accepted it will be much easier to keep your app up-to-date with the latest enketo-core updates without merge conflicts.
6. ....to follow: examples for instantiating a form, validating, getting the instance out, editing an existing instance, etc....

###How to create or extend widgets

The form [dev.html](dev.html) is a useful form to test widgets. This [plugin template](https://gist.github.com/MartijnR/6943281) may also be useful for new widgets. It is recommended to use this template.
The option {touch: [boolean]}, is added automatically to all widgets to indicate whether the client is using a touchscreen device and whether the widgets are inside a newly cloned repeat.

Each widget needs to fulfill following requires:

* be an AMD-compliant jQuery plugin
* be in its own folder with a config.json file, including
	* `name: ` the name of the widget used to instantiate it
	* `selector: ` the selector of the elements to instantiate the widget on, or `null` if it needs to be applied globally
	* `options: ` any default options to pass
	* `stylesheet: ` path to stylesheet scss file relative to the widget's own folder
* be responsive up to a minimum window width of 320px
* use JSDoc style documentation for the purpose of passing the Google Closure Compiler without warnings and errors
* if hiding original input element, it needs to load the default value from that input element into the widget
* if hiding original input element, it needs to keep it up-to-date and trigger a change event on it whenever it updates
* it is recommended to apply the `widget` css class to any new elements it adds to the DOM (but not to their children)
* new input/select/textarea elements inside widgets need to get the `ignore` class
* it requires the following methods (which can be automatically obtained by extending the Widget base class as demonstrated in the [plugin template](https://gist.github.com/MartijnR/6943281)
	* `destroy(element)` to totally destroy widgets in *repeat* groups/questions when these groups/questions are cloned This may be an empty function if:
		* a deep `$.clone(true, true)` of the widget (incl data and eventhandlers) works without problems (problems are likely!)
		* the widget simply changes the DOM and doesn't have issues when the question is cloned.
	* `enable()` to enable the widget when a disabled ancestor gets enabled. This may be an empty function if that happens automatically.
	* `disable()` This may be an empty function if the widgets gets disabled automatically cross-browser when a branch becomes irrelevant.
	* `update()` to update the widget when called after the content used to instantiate it has changed (language or options). In its simplest forms this could simply call destroy() and then re-initialize the widget, or be an empty function if language changes are handled automatically and it is not a `<select>` widget.
* any eventhandlers added to the original input should be namespaced (if extending thew Widget base class, the namespace is available as `this.namespace`)
* if the widget needs tweaks or needs to be disabled for mobile (touchscreen) use, build this in. The option `{ touch: [boolean] }` is passed to the plugin by default. If your widget requires tweaks for mobile, you could create an all-in-one widget using the `options.touch` check or you could create separate widgets for desktop and mobile (as done with select-desktop and select-mobile widgets)
* allow clearing of the original input (i.e. setting value to '')
* [to check: send a focus event to the original input when the widget gets focus]
* [for extra robustness where applicable: if the widget already exists, destroy it first]

###Notes for All Developers

* build with Grunt (using Compass is also possible as long as config.json does not change)
* requires webserver - one is included in this repo and can be fired up with `grunt server`

###Notes for JavaScript Developers

* The JS library uses Require.js
* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still deliberating what JS Documentation system to use
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
