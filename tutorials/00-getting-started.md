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
  session: {}
};

// Form-specific configuration
const options = {}

// Instantiate a form, with 2 parameters
const form = new Form( formEl, data, options);

// Initialize the form and capture any load errors
let loadErrors = form.init();

// If desired, scroll to a specific question with any XPath location expression,
// and aggregate any loadErrors.
loadErrors = loadErrors.concat( form.goTo( '//repeat[3]/node' ) );

// submit button handler for validate button
$( '#submit' ).on( 'click', function() {
  // clear non-relevant questions and validate
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
