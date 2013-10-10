enketo-core [![Build Status](https://travis-ci.org/MartijnR/enketo-core.png)](https://travis-ci.org/MartijnR/enketo-core)
================

The engine that powers [Enketo Smart Paper](https://enketo.org) - Use it to develop your own Enketo-powered app! Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.

##Currently undergoing major modernization work!

###Related Projects

* [XPathJS_javarosa](https://github.com/MartijnR/xpathjs_javarosa) - used inside this repo
* [enketo-xslt](https://github.com/MartijnR/enketo-xslt)
* [enketo-xslt-transformer-php] - To follow
* [enketo-xslt-transformer-node] - To follow
* [enketo-dristhi](https://github.com/MartijnR/enketo-dristhi)
* [file-manager](https://github.com/MartijnR/file-manager)

###How to Use



###How to create or extend widgets elements
Each widget needs to follow the following:

* be an AMD-compliant jQuery plugin
* be in its own folder with a config.json file
* be responsive up to a window width of 320px
* use JSDoc style documentation for the purpose of passing the Google Closure Compiler without warnings and errors
* if hiding original input element, it needs to load the default value from that input element into the widget
* if hiding original input element, it needs to keep it up-to-date and trigger a change event on it whenever it updates
* it needs to apply the `widget` css class to any new elements it adds to the DOM (but not to their children)
* new input/select/textarea elements inside widgets need to get the `ignore` class
* it requires the following methods:
	* `destroy()` (to totally destroy widgets in repeat groups/questions when these groups/questions are cloned)
	* `disable()` (if it doesn't get disabled automatically when a parent fieldset element is disabled)
	* `update()` to update the widget when called after the content used to instantiate it has changed (language or options). In its simplest form this could simply call destroy() and then re-initialize the widget.
* disable when an ancestor (`<fieldset>`) is disabled (also when disabled upon initialization!)
* enable when its disabled ancestor is enabled
* if the widget needs tweaks or needs to be disabled for mobile (touchscreen) use, build this in. The option { touch: [boolean] } is passed to the plugin by default. If your widget supports both, you could create an all-in-one widget or create separate widgets for desktop and mobile (as done with select-desktop and select-mobile widgets)
* allow setting an empty value (that empties node in instance)
* [to check] send a focus event to the original input when the widget gets focus
* for extra robustness: if the widget already exists, destroy it first

###Notes for All Developers

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

* build with Grunt (using Compass is also possible as long as config.json does not change)
* requires webserver (just to enable loading of config.json in widgets.js over http - if you have a clever idea to keep using config.json but serve a form as file://..../myform.html please let me know!)
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
