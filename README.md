[![npm version](https://badge.fury.io/js/enketo-core.svg)](http://badge.fury.io/js/enketo-core) ![Build Status](https://github.com/enketo/enketo-core/actions/workflows/npmjs.yml/badge.svg)

# Enketo Core

The engine that powers [Enketo Express](https://github.com/enketo/enketo-express) and various third party tools including [this selection](https://enketo.org/about/adoption/).

Enketo's form engine is compatible with tools in the ODK ecosystem and complies with its [XForms specification](https://getodk.github.io/xforms-spec/) though not all features in that specification have been implemented yet.

This repo is meant to be used as a building block for any Enketo-powered application. See [this page](https://enketo.org/develop/#libraries) for a schematic overview of a real-life full-fledged data collection application and how Enketo Core fits into this.

## Project status

As of 2022, Enketo is maintained by the [ODK team](https://getodk.org/about/team.html) (primarily [Trevor Schmidt](https://github.com/eyelidlessness/)). Martijn, its original author, continues to provide advice and continuity. The ODK project sets priorities in collaboration with its [Technical Advisory Board](https://getodk.org/about/ecosystem.html).

Broader context is available in [the Enketo Express repository](https://github.com/enketo/enketo-express#project-status).

## Browser support

The following browsers are officially supported:

-   latest Android webview on latest Android OS
-   latest WKWebView on latest iOS
-   latest version of Chrome/Chromium on Mac OS, Linux, Windows, Android and iOS
-   latest version of Firefox on Mac OS, Windows, Linux, Android and iOS
-   latest version of Safari on Mac OS, Windows, and on the latest version of iOS
-   latest version of Microsoft Edge

We have to admit we do not test on all of these, but are committed to fixing browser-specific bugs that are reported for these browsers. Naturally, older browsers versions will often work as well - they are just not officially supported.

### Performance (live)

See [graphs](https://github.com/enketo/enketo-core-performance-monitor#live-results)

## Usage as a library

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

// required HTML Form DOM element
const formEl = document.querySelector('form.or');

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
    session: {},
};

// Form-specific configuration
const options = {};

// Instantiate a form, with 2 parameters
const form = new Form(formEl, data, options);

// Initialize the form and capture any load errors
let loadErrors = form.init();

// If desired, scroll to a specific question with any XPath location expression,
// and aggregate any loadErrors.
loadErrors = loadErrors.concat(form.goTo('//repeat[3]/node'));

// submit button handler for validate button
$('#submit').on('click', function () {
    // clear non-relevant questions and validate
    form.validate().then(function (valid) {
        if (!valid) {
            alert('Form contains errors. Please see fields marked in red.');
        } else {
            // Record is valid!
            const record = form.getDataStr();

            // reset the form view
            form.resetView();

            // reinstantiate a new form with the default model and no options
            form = new Form(formSelector, { modelStr: modelStr }, {});

            // do what you want with the record
        }
    });
});
```

## Global Configuration

Global configuration (per app) is done in [config.json](./config.json) which is meant to be overridden by a config file in your own application (e.g. by using rollup).

### maps

The `maps` configuration can include an array of Mapbox TileJSON objects (or a subset of these with at least a `name`, `tiles` (array) and an `attribution` property, and optionally `maxzoom` and `minzoom`). You can also mix and match Google Maps layers. Below is an example of a mix of two map layers provided by OSM (in TileJSON format) and Google maps.

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

### googleApiKey

The Google API key that is used for geocoding (in the geo widgets' search box). Can be obtained [here](https://console.developers.google.com/project). Make sure to enable the _GeoCoding API_ service. If you are using Google Maps layers, the same API key is used. Make sure to enable the _Google Maps JavaScript API v3_ service as well in that case (see next item).

### validateContinuously

This setting with the default `false` value determines whether Enketo should validate questions immediately if a related value changes. E.g. if question A has a constraint that depends on question B, this mode would re-validate question A if the value for question B changes. **This mode will slow down form traversal.** When set to `false` that type of validation is only done at the end when the Submit button is clicked or in Pages mode when the user clicks Next.

### validatePage

This setting with default `true` value determines whether the Next button should trigger validation of the current page and block the user from moving to the next page if validation fails.

### swipePage

This setting with default `true` value determines whether to enable support for _swiping_ to the next and previous page for forms that are divided into pages.

## Form Configuration

Per-form configuration is done by adding an (optional) options object as 3rd parameter when instantiating a form.

### Print only the "relevant" parts of the form

If `printRelevantOnly` is set to `true` or not set at all, printing the form only includes what is visible, ie. all the groups and questions that do not have a `relevant` expression or for which the expression evaluates to `true`.

```
new Form(formselector, data, {
  printRelevantOnly: false
});
```

### Explicitly set the default form language

The `language` option overrides the default languages rules of the XForm itself. Pass any valid and present-in-the-form IANA subtag string, e.g. `ar`.

## How to develop Enketo Core

1. install prerequisites:

-   Volta (optional, but recommended)
-   Node.js 16 and npm 6 (Node.js 14 is also supported)
-   [grunt-cli](https://gruntjs.com/getting-started)

2. install dependencies with `npm install`
3. build with `grunt` (`npx grunt`)
4. start built-in auto-reloading development server with `npm start`
5. browse to [http://localhost:8005](http://localhost:8005/) and load an XForm url with the `xform` queryparameter or load a local from the /tests/forms folder in this repo
6. run tests with `npm test` (headless chrome) and `npm run test-browsers` (browsers); **note:** running tests updates the coverage badge in README.md, but these changes should not be committed except when preparing a release
7. adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### Notes for JavaScript Developers

-   When creating new functions/Classes, make sure to describe them with JSDoc comments.
-   JavaScript style see [ESLint](./eslintrc.json) config files. The check is added to the grunt `test` task. You can also manually run `grunt eslint:fix` to fix style issues.
-   Testing is done with Mocha and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
-   Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `npm run test-watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [Debugging test watch mode in VSCode](./#debugging-test-watch-mode-in-vscode) below
-   When making a pull request, please add tests where relevant

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select "Test (watch + debug)"
3. Click the play button

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding keybinding

### Notes for CSS Developers

The core can be fairly easily extended with alternative themes.
See the _plain_, the _grid_, and the _formhub_ themes already included in [/src/sass](./src/sass).
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme.

For custom themes that go beyond just changing colors and fonts, keep in mind all the different contexts for a theme:

1. non-touchscreen vs touchscreen (add ?touch=true during development)
2. default one-page-mode and multiple-pages-mode
3. right-to-left form language vs left-to-right form language (!) - also the UI-language may have a different directionality
4. screen view vs. print view
5. questions inside a (nested) repeat group have a different background
6. large screen size --> smaller screen size ---> smallest screen size
7. question in valid vs. invalid state

### Widgets in Enketo Core

Widgets extend the [Widget class](https://github.com/enketo/enketo-core/blob/master/src/js/widget.js). This is an example:

(see full functioning example at [/src/widget/example/my-widget.js](https://github.com/enketo/enketo-core/blob/master/src/widget/example/my-widget.js)

```js
import Widget from '../../js/widget';

/*
 * Make sure to give the widget a unique widget class name and extend Widget.
 */
class MyWidget extends Widget {
    /*
     * The selector that determines on which form control the widget is instantiated.
     * Make sure that any other widgets that target the same from control are not interfering with this widget by disabling
     * the other widget or making them complementary.
     * This function is always required.
     */
    static get selector() {
        return '.or-appearance-my-widget input[type="number"]';
    }

    /*
     * Initialize the widget that has been instantiated using the Widget (super) constructor.
     * The _init function is called by that super constructor unless that constructor is overridden.
     * This function is always required.
     */
    _init() {
        // Hide the original input
        this.element.classList.add('hide');

        // Create the widget's DOM fragment.
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget">
                <input class="ignore" type="range" min="0" max="100" step="1"/>
            <div>`
        );
        fragment.querySelector('.widget').appendChild(this.resetButtonHtml);

        // Only when the new DOM has been fully created as a HTML fragment, we append it.
        this.element.after(fragment);

        const widget = this.element.parentElement.querySelector('.widget');
        this.range = widget.querySelector('input');

        // Set the current loaded value into the widget
        this.value = this.originalInputValue;

        // Set event handlers for the widget
        this.range.addEventListener('change', this._change.bind(this));
        widget
            .querySelector('.btn-reset')
            .addEventListener('click', this._reset.bind(this));

        // This widget initializes synchronously so we don't return anything.
        // If the widget initializes asynchronously return a promise that resolves to `this`.
    }

    _reset() {
        this.value = '';
        this.originalInputValue = '';
        this.element.classList.add('empty');
    }

    _change(ev) {
        // propagate value changes to original input and make sure a change event is fired
        this.originalInputValue = ev.target.value;
        this.element.classList.remove('empty');
    }

    /*
     * Disallow user input into widget by making it readonly.
     */
    disable() {
        this.range.disabled = true;
    }

    /*
     * Performs opposite action of disable() function.
     */
    enable() {
        this.range.disabled = false;
    }

    /*
     * Update the language, list of options and value of the widget.
     */
    update() {
        this.value = this.originalInputValue;
    }

    /*
     * Obtain the current value from the widget. Usually required.
     */
    get value() {
        return this.element.classList.contains('empty') ? '' : this.range.value;
    }

    /*
     * Set a value in the widget. Usually required.
     */
    set value(value) {
        this.range.value = value;
    }
}

export default MyWidget;
```

Some of the tests are common to all widgets, and can be run with a few lines:

(see full functioning example at [/test/spec/widget.example.spec.js](https://github.com/enketo/enketo-core/blob/master/test/spec/widget.example.spec.js))

```js
import ExampleWidget from '../../src/widget/example/my-widget';
import { runAllCommonWidgetTests } from '../helpers/testWidget';

const FORM = `<label class="question or-appearance-my-widget">
        <input type="number" name="/data/node">
    </label>`;
const VALUE = '2';

runAllCommonWidgetTests(ExampleWidget, FORM, VALUE);
```

### DO

-   use the rank widget as a more complex example that uses the best practices (some other widgets use an older style)
-   add an `_init` function to your widget that either returns nothing or a Promise (if it initializes asynchronously)
-   include a widget.my-widget.spec.js file in the /test folder
-   run at least the standardized common widget tests by doing: TBD
-   make the widget responsive up to a minimum window width of 320px
-   ensure the widget's scss and js file is/are loaded in widgets.js and \_widgets.scss respectively
-   if hiding the original input element, it needs to load the default value `this.originalInputValue` into the widget
-   if hiding the original input element, keep its value syncronized using `this.originalInputValue = ...`
-   if hiding the original input element, it needs to listen for the `applyfocus` event on the original input and focus the widget
-   if hiding the original input element, the widget value needs to update when the original input updates due to a calculation or becoming non-relevant (update)
-   apply the `widget` css class to the top level elements it adds to the DOM (but not to their children)
-   new input/select/textarea elements inside widgets should have the `ignore` class to isolate them from the Enketo form engine
-   include `enable()`, `disable()` and `update()` method overrides. See the Widget class.
-   if the widget needs tweaks or needs to be disabled for mobile use, use support.js to detect this and override the static `condition()` function in Widget.js.
-   allow clearing of the original input (i.e. setting value to '')
-   if the widget does not get automatic (built-in HTML) focus, trigger a `fakefocus` event to the original input when the widget gets focus (rarely required, but see rank widget)

#### DON'T

-   do not include jQuery, React, Vue or any other general purpose libraries or frameworks

### Events in Enketo Core

##### inputupdate

Fired on a form control when it is programmatically updated and when this results in a change in value

#### xforms-value-changed

Fired on a form control when it is updated directly by the user and when this results in a change in value

##### invalidated

Fired on a form control when it has failed constraint, datatype, or required validation.

##### dataupdate

Fired on model.$events, when a single model value has changed its value, a repeat is added, or a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### odk-instance-first-load

Fired on model.events when a new record (instance) is loaded for the first time. It's described here: [odk-instance-first-load](https://getodk.github.io/xforms-spec/#event:odk-instance-first-load).

##### odk-new-repeat

Fired on a newly added repeat. It's described here: [odk-instance-first-load](https://getodk.github.io/xforms-spec/#event:odk-new-repeat).

##### removerepeat

Fired on the repeat or repeat element immediately following a removed repeat.

##### removed

Fired on model.events, when a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### goto-irrelevant

Fired on form control when an attempt is made to 'go to' this field but it is hidden from view because it is non-relevant.

##### goto-invisible

Fired on form control when an attempt is made to 'go to' this field but it is hidden from view because it is has no form control.

##### pageflip

Fired when user flips to a new page, on the page element itself.

##### edited

Fired on form.or element when user makes first edit in form. Fires only once.

##### validation-complete

Fired on form.or element when validation completes.

##### progress-update

Fired when the user moves to a different question in the form.

## Release

1. Create release PR
1. Update `CHANGELOG.md`
1. Update version in `package.json`
    - Bump to major version if consumers have to make changes.
1. Check [Dependabot](https://github.com/enketo/enketo-core/security/dependabot) for alerts
1. Run `npm update`
    - Check if `node-forge` has been updated and if so, verify encrypted submissions end-to-end
    - If `enketo-transformer` has been updated, change `Form.requiredTransformerVersion`
1. Run `npm audit`
    - Run `npm audit fix --production` to apply most important fixes
1. Run `npm i`
1. Run `npm test`
1. Merge PR with all changes
1. Create GitHub release
1. Tag and publish the release
    - GitHub Action will publish it to npm

## Sponsors

The development of this library is now led by [ODK](https://getodk.org) and funded by customers of the ODK Cloud hosted service.

Past sponsors include:

-   [OpenClinica](https://www.openclinica.com/)
-   [Sustainable Engineering Lab at Columbia University](http://modi.mech.columbia.edu/)
-   [WHO - HRP project](http://www.who.int/reproductivehealth/topics/mhealth/en/index.html)
-   [Santa Fe Insitute & Slum/Shack Dwellers International](http://www.santafe.edu/)
-   [Enketo LLC](http://www.linkedin.com/company/enketo-llc)
-   [iMMAP](http://immap.org)
-   [KoBo Toolbox (Harvard Humanitarian Initiative)](https://kobotoolbox.org)
-   [Ona](https://ona.io)
-   [Medic](https://medic.org/)
-   [Esri](https://esri.com)
-   [DIAL Open Source Center](https://www.osc.dial.community/)

## License

See [license](https://github.com/enketo/enketo-core/blob/master/LICENSE) document and additional clause below:

Any product that uses enketo-core is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which enketo-core or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/about/sponsors/](https://enketo.org/about/sponsors/) and on [this page](#sponsors) are exempted from this requirements and so are contributors listed in [package.json](https://github.com/enketo/enketo-core/blob/master/package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>
