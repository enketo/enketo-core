# ESRI/ArcGIS Geo Widget

Supported: 

- geopoint

Not supported:

- geotrace
- geoshape

## Configure

Like any other widget, this widget has to be enabled in widget.js and widgets.scss. Both these files exist in enketo-core but are normally overwritten in your own app.

It is possible to use both this widget (for geopoint question) and the regular geo widget (for geoshape and geotrace questions) together, but this is highly discouraged as they do not match in styling and will result in a very poor loading performance, and poor performance when geopoints are used with calculations.

By default this picker will load a large JS file from a CDN. You can improve performance by serving the much smaller customized build [to follow].js file in /src/widget/geo-esri/ instead by copying it to your static js assets folder and adding the path to (your own app's) config.json:

```json
{
        "esriArcGisJsUrl": "/static/js/esri-arcgis-4-0.js"
}
```

This cumbersome solution is required because Enketo is using CommonJS modules and the Esri ArcGIS for JS library is using AMD modules.

## Use

There are 2 ways you can pass an ArcGIS webmap ID to the widget. Both methods are per form, not per widget, so you cannot load different webmaps on multiple geopoint widgets in the same form.

### A. Instantiate the Form with an options parameter consisting of an object with a `webMapId` property like this:

```js
var data = {
	modelStr: modelStr
};
var options = {
    webMapId: '45ded9b3e0e145139cc433b503a8f5ab'
};
var form = new Form( 'form.or:eq(0)', data, options );
```
### B. Define the webmap ID in the XForm/XLSForm as follows:

XLSForm:

settings sheet

| form_title | form_id | style                                    |
|------------|---------|------------------------------------------|
|            |         | arcgis::f2e9b762544945f390ca4ac3671cfa72 |

XForm:

```xml
<h:body class="arcgis::f2e9b762544945f390ca4ac3671cfa72" >
```

Both methods are case-insensitive.

The JS method (A) takes precedence in case both methods are used for the same form.

