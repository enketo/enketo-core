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

###Notes for All Developers

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

* build with your preferred Sass tool - Compass configuration and Grunt build configuration already included
* many of the outstanding issues for enketo-core are managed in the [modilabs repo](https://github.com/modilabs/enketo/issues?state=open)

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
