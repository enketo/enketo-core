enketo-core [![Build Status](https://travis-ci.org/MartijnR/enketo-core.png)](https://travis-ci.org/MartijnR/enketo-core)
================

The engine that powers Enketo Smart Paper - Use it to develop your own Enketo-powered app!

##Currently undergoing major modernization work!

###Related Projects

* [XPathJS_javarosa](https://github.com/MartijnR/xpathjs_javarosa)
* [enketo-xslt](https://github.com/MartijnR/enketo-xslt)
* [enketo-xslt-transformer-php] - To follow
* [enketo-xslt-transformer-node] - To follow
* [enketo-dristhi](https://github.com/MartijnR/enketo-drishti)

###Notes for All Developers

This repo is meant to use as a building block for your own enketo-powered application or to add features that you'd like to see in enketo hosted on [formhub.org](https://formhub.org) and [enketo.org](https://enketo.org)

* build with your preferred Sass tool - Compass configuration already included (Grunt build will be added soon)

###Notes for JavaScript Developers

* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still deliberating what JS Documentation system to use
* JavaScript style guide: https://github.com/rwaldron/idiomatic.js/
* Testing is done with Jasmine (in browser and headless)
* install node and grunt
* run `npm install` to install dependencies
* run `grunt` to test
* When making a pull request, please add tests where relevant

###Notes for CSS Developers

The core can be fairly easily extended with alternative themes. 
See the *default* and the *formhub* themes already included in /src/sass. 
We would be happy to discuss whether your contribution should be a part of the core, the default them or be turned into a new theme. 

###Acknowledgements

I would like to acknowledge and thank the indirect contribution by the creators of the following excellent works that were used in the project:

* [XPathJS by Andrej Pavlovic](https://github.com/andrejpavlovic/xpathjs)
* [JQuery](http://jquery.com)
* [Modernizr](http://modernizr.com)
* [Bootstrap](http://twitter.github.com/bootstrap/)
* [Bootstrap Datepicker by eternicode](https://github.com/eternicode/bootstrap-datepicker)
* [Bootstrap Timepicker by jdewit](http://jdewit.github.io/bootstrap-timepicker/)
