enketo-core [![Build Status](https://travis-ci.org/MartijnR/enketo-core.png)](https://travis-ci.org/MartijnR/enketo-core)
================

The engine that powers [Enketo Smart Paper](https://enketo.org) - Use it to develop your own Enketo-powered app! Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.

##Under Active Reorganization!.

###Related Projects

* [XPathJS_javarosa](https://github.com/MartijnR/xpathjs_javarosa) - used inside this repo
* [enketo-xslt](https://github.com/MartijnR/enketo-xslt)
* [enketo-xslt-transformer-php] - To follow
* [enketo-xslt-transformer-node] - To follow
* [enketo-dristhi](https://github.com/MartijnR/enketo-dristhi)
* [file-manager](https://github.com/MartijnR/file-manager)
* [openrosa-forms](https://github.com/MartijnR/openrosa-forms) - bunch of test forms, for development

###How to Use



###How to create or extend widgets elements

The form [dev.html](dev.html) is a useful form to test widgets. This [plugin template](https://gist.github.com/MartijnR/6943281) may also be useful for new widgets. It is recommended to use this template.
The option {touch: [boolean]}, is added automatically to all widgets to indicate whether the client is using a touchscreen device and whether the widgets are inside a newly cloned repeat.

Each widget needs to follow the following:

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
* any eventhandlers added to the original input should be namespaced (if extending thew Widget base class, this can be obtained as this.namespace)
* if the widget needs tweaks or needs to be disabled for mobile (touchscreen) use, build this in. The option { touch: [boolean] } is passed to the plugin by default. If your widget requires tweak for mobile, you could create an all-in-one widget using the options.touch check or create separate widgets for desktop and mobile (as done with select-desktop and select-mobile widgets)
* allow clearing of the original input (setting value to '')
* [to check: send a focus event to the original input when the widget gets focus]
* [for extra robustness where applicable: if the widget already exists, destroy it first]

###Notes for All Developers

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

* build with Grunt (using Compass is also possible as long as config.json does not change)
* requires webserver - one is included in this repo and can be started up with `grunt server`
* many of the outstanding issues for enketo-core are still managed in the [modilabs repo](https://github.com/modilabs/enketo/issues?state=open)

###Notes for JavaScript Developers

* The JS library will highly likely be transformed into a more modular architecture, using Require.js
* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still deliberating what JS Documentation system to use
* JavaScript style see [JsBeautifier](./.jsbeautifyrc) config file
* Testing is done with Jasmine (in browser and headless)
* install node.js and grunt-cli
* run `npm install` to install dependencies
* run `grunt` to test
* When making a pull request, please add tests where relevant

###Notes for CSS Developers

The core can be fairly easily extended with alternative themes. 
See the *default* and the *formhub* themes already included in /src/sass. 
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme. 
Once the JS modernization work is complete, themes can include/exclude JS widgets as well!

###Acknowledgements

I would like to acknowledge and thank the indirect contribution by the creators of the following excellent works that were used in the project:

* [XPathJS by Andrej Pavlovic](https://github.com/andrejpavlovic/xpathjs)
* [JQuery](http://jquery.com)
* [Modernizr](http://modernizr.com)
* [Bootstrap](http://twitter.github.com/bootstrap/)
* [Bootstrap Datepicker by eternicode](https://github.com/eternicode/bootstrap-datepicker)
* [Bootstrap Timepicker by jdewit](http://jdewit.github.io/bootstrap-timepicker/)
