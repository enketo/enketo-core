enketo-js-engine [![Build Status](https://travis-ci.org/MartijnR/enketo-core.png)](https://travis-ci.org/MartijnR/enketo-core)
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

* Still deliberating whether to keep using Google Closure
* Still deliberating what JS Documentation system to use
* Still deliberating whether to switch to Coffeescript
* Still deliberating which style guide to use
* Testing is done with Jasmine (in browser and headless)
* install node and grunt
* run `npm install` to install dependencies
* run `grunt` to test
* When making a pull request, please add tests where relevant

###Notes for CSS Developers

The core to be extended with different themes. 
See the default and the formhub themes included in /src/sass. 
Would be happy to discuss whether your contribution should be a part of the core, the default them or be turned into a new theme. 
