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

#### Print only the "relevant" parts of the form

If `printRelevantOnly` is set to `true` or not set at all, printing the form only includes what is visible, ie. all the groups and questions that do not have a `relevant` expression or for which the expression evaluates to `true`.

```
new Form(formselector, data, {
  printRelevantOnly: false
});
```

#### Explicitly set the default form language

The `language` option overrides the default languages rules of the XForm itself. Pass any valid and present-in-the-form IANA subtag string, e.g. `ar`.
