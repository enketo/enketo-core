Enketo Core [![npm version](https://badge.fury.io/js/enketo-core.svg)](http://badge.fury.io/js/enketo-core) [![Build Status](https://travis-ci.org/enketo/enketo-core.svg?branch=master)](https://travis-ci.org/enketo/enketo-core) [![Dependency Status](https://david-dm.org/enketo/enketo-core/status.svg)](https://david-dm.org/enketo/enketo-core) [![devDependency Status](https://david-dm.org/enketo/enketo-core/dev-status.svg)](https://david-dm.org/enketo/enketo-core?type=dev) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/dc1c5aaa9267d75cbd2d6714d2b4fa32)](https://www.codacy.com/app/martijnr/enketo-core?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=enketo/enketo-core&amp;utm_campaign=Badge_Grade)
===============

The engine that powers [Enketo Smart Paper](https://enketo.org) and various third party tools including [these](https://enketo.org/about/adoption/).

This repo is meant to use as a building block for any Enketo-powered application. See [this page](https://enketo.org/develop/#libraries) for a schematic overview of an Enketo-powered application and how Enketo Core fits into this.

Follow the [Enketo blog](http://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.

### Usage as a library

1. Install with `npm install enketo-core --save` or include as a git submodule.
2. Develop a way to perform an [XSL Transformation](https://enketo.org/develop/#transformation) on OpenRosa-flavoured XForms inside your app. The transformation will output an XML instance and a HTML form. See [enketo-transformer](https://github.com/enketo/enketo-transformer) for an available library/app to use or develop your own.
3. Add [themes](./src/sass) to your stylesheet build system (2 stylesheets per theme, 1 is for `media="print"`).
4. Override [the files under "browser"](./package.json), e.g. using [aliasify](https://www.npmjs.com/package/aliasify) with your app-specific versions.
5. Main methods illustrated in code below:

```javascript 
// assumes the enketo-core package is mapped from the node_modules folder
import { Form } from 'enketo-core';

// The XSL transformation result contains a HTML Form and XML instance.
// These can be obtained dynamically on the client, or at the server/
// In this example we assume the HTML was injected at the server and modelStr 
// was injected as a global variable inside a <script> tag.

// required string of the selector of the HTML Form DOM element
const formSelector = 'form.or';

// required object containing data for the form
 const data = {
  // required string of the default instance defined in the XForm
  modelStr: globalXMLInstance,
  // optional string of an existing instance to be edited
  instanceStr: null,
  // optional boolean whether this instance has ever been submitted before
  submitted: false,
  // optional array of external data objects containing: 
  // {id: 'someInstanceId', xml: XMLDocument}
  external: [],
  // optional object of session properties 
  // 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid'
  session: {}
};

// Form-specific configuration
const options = {
  clearIrrelevantImmediately: true  // this is the default, it can be omitted
}

// Instantiate a form, with 2 parameters
const form = new Form( formSelector, data, options);

// Initialize the form and capture any load errors
let loadErrors = form.init();

// If desired, scroll to a specific question with any XPath location expression,
// and aggregate any loadErrors.
loadErrors = loadErrors.concat( form.goTo( '//repeat[3]/node' ) );

// submit button handler for validate button
$( '#submit' ).on( 'click', function() {
  // clear irrelevant questions and validate
  form.validate()
    .then(function (valid){
      if ( !valid ) {
        alert( 'Form contains errors. Please see fields marked in red.' );
      } else {
        // Record is valid! 
        const record = form.getDataStr();

        // reset the form view
        form.resetView();
            
        // reinstantiate a new form with the default model and no options
        form = new Form( formSelector, { modelStr: modelStr }, {} );

        // do what you want with the record
      }
    });
} );

```

### Modern Browser support

The following browsers are officially supported:
* latest Android webview on latest Android OS
* latest WKWebView on latest iOS
* latest version of Chrome/Chromium on OS X, Linux, Windows, Android and iOS
* latest version of Firefox on OS X, Windows, Linux, Android and iOS
* latest version of Safari on OS X, Windows, and on the latest version of iOS
* latest version of Microsoft Edge

We have to admit we do not test on all of these, but are committed to fixing browser-specific bugs that are reported for these browsers. Naturally, older browsers versions will often work as well - they are just not officially supported.

#### Internet Explorer 11

Internet Explorer 11 is not supported and not tested. Until we completely let go of this ancient browser some time in 2019, you may have some success with running Enketo Core-powered forms in IE11 by:

1. Importing the `_iefix.scss` files in the theme entry files. These are commented out in the default CSS builds for the 3 themes. 
2. Including polyfills using a script tag with the `nomodule` attribute (which will prevent loading this file on modern browsers). See [/build/index.html](./build/index.html) for an example using a polyfill service + additional polyfill file(s) that is tested occasionally.
3. Creating a special IE11 build (using Babel) that transpiles Enketo Core's modern syntax to old syntax and (optionally) includes [js/src/workarounds-ie11.js](./sjs/src/workarounds-ie11). See the `compile-ie11` build task in the Gruntfile for an example.
4. Use loading tricks to avoid loading the IE11 build in modern browsers and avoid executing the modern build in IE11. See [build/index.html](./build.index.html) for a possible approach.

Note that as we convert more and more code to modern syntax forms on IE11 will become progressively _slower_. For any issues specific to IE11, we encourage you to create a PR. We likely will not prioritize IE11 issues, even if we have funding, because of the psychological distress caused by working on such an old browser.

### Global Configuration

Global configuration (per app) is done in [config.json](./config.json) which is meant to be overridden by a config file in your own application (e.g. by using rollup).

#### maps
The `maps` configuration can include an array of Mapbox TileJSON objects (or a subset of these with at least a `name`,  `tiles` (array) and an `attribution` property, and optionally `maxzoom` and `minzoom`). You can also mix and match Google Maps layers. Below is an example of a mix of two map layers provided by OSM (in TileJSON format) and Google maps.

```
[ 
  {
    "name": "street",
    "tiles": [ "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" ],
    "attribution": "Map data © <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors"
  }, 
  {
    "name": "satellite",
    "tiles": "GOOGLE_SATELLITE"
  } 
]
```

For GMaps layers you have the four options as tiles values: `"GOOGLE_SATELLITE"`, `"GOOGLE_ROADMAP"`, `"GOOGLE_HYBRID"`, `"GOOGLE_TERRAIN"`. You can also add other TileJSON properties, such as minZoom, maxZoom, id to all layers. 

#### googleApiKey
The Google API key that is used for geolocation (in the geo widgets' search box). Can be obtained [here](https://console.developers.google.com/project). Make sure to enable the _GeoCoding API_ service. If you are using Google Maps layers, the same API key is used. Make sure to enable the _Google Maps JavaScript API v3_ service as well in that case (see next item).

#### validateContinuously
This setting with the default `false` value determines whether Enketo should validate questions immediately if a related value changes. E.g. if question A has a constraint that depends on question B, this mode would re-validate question A if the value for question B changes. **This mode will slow down form traversal.** When set to `false` that type of validation is only done at the end when the Submit button is clicked or in Pages mode when the user clicks Next.

#### validatePage
This setting with default `true` value determines whether the Next button should trigger validation of the current page and block the user from moving to the next page if validation fails.

#### swipePage 
This setting with default `true` value determines whether to enable support for _swiping_ to the next and previous page for forms that are divided into pages.

### Form Configuration

Per-form configuration is done by adding an (optional) options object as 3rd parameter when instantiating a form.

#### Behaviour of skip logic

```
new Form(formselector, data, { 
  clearIrrelevantImmediately: false
});
```

If `clearIrrelevantImmediately` is set to `true` or not set at all, Enketo will clear the value of a question as soon as it becomes irrelevant, after loading (so while the user traverses the form). If it is set to `false` Enketo will leave the values intact (and just hide the question).

In the second case the irrelevant values will not be cleared until `form.validate()` is called (usually when the user marks a record as complete).

#### Print only the "relevant" parts of the form

If `printRelevantOnly` is set to `true` or not set at all, printing the form only includes what is visible, ie. all the groups and questions that do not have a `relevant` expression or for which the expression evaluates to `true`.

```
new Form(formselector, data, { 
  printRelevantOnly: false
});
```

### How to develop Enketo Core

1. install [node](http://nodejs.org/) version 8 until [this issue](https://github.com/enketo/enketo-transformer/issues/53) is closed, and [grunt-cli](http://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt`
4. start built-in auto-reloading development server with `npm start` 
5. browse to [http://localhost:8005](http://localhost:8005/) and load an XForm url with the `xform` queryparameter or load a local from  the /tests/forms folder in this repo
6. run tests with `npm test`
7. adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### How to create or extend widgets

See [doc/widgets.md](./doc/widgets.md).


### Notes for JavaScript Developers

* JavaScript style see [JsBeautifier](./.jsbeautifyrc) config file, the jsbeautifier check is added to the grunt `test` task. You can also manually run `grunt jsbeautifier:fix` to fix style issues.
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

### Sponsors

The development of this library was sponsored by:

* [OpenClinica](https://www.openclinica.com/)
* [Sustainable Engineering Lab at Columbia University](http://modi.mech.columbia.edu/)
* [WHO - HRP project](http://www.who.int/reproductivehealth/topics/mhealth/en/index.html)
* [Santa Fe Insitute & Slum/Shack Dwellers International](http://www.santafe.edu/)
* [Enketo LLC](http://www.linkedin.com/company/enketo-llc)
* [iMMAP](http://immap.org)
* [KoBo Toolbox (Harvard Humanitarian Initiative)](https://kobotoolbox.org)
* [Ona](https://ona.io)
* [Medic Mobile](http://medicmobile.org/)
* [Enketo LLC](https://enketo.org)

### Change log

See [change log](./CHANGELOG.md)

### Performance (live)

See [graphs](https://github.com/enketo/enketo-core-performance-monitor#live-results)

### License

See [license](./LICENSE) document and additional clause below: 

Any product that uses enketo-core is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which enketo-core or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/about/sponsors/](https://enketo.org/about/sponsors/) and on [this page](#sponsors) are exempted from this requirements and so are contributors listed in [package.json](./package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>
