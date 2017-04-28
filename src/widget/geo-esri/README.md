# ArcGIS (Esri) Geo Widget

Supported: 

- geopoint

Not supported:

- geotrace
- geoshape

## Configure and Use

Like any other widget, this widget has to be enabled in widget.js and widgets.scss. Both these files exist in enketo-core but are normally overwritten in your own app.

It is possible to use both this widget (for geopoint questions) and the regular geo widget (for geoshape and geotrace questions) together, but this is highly discouraged as they do not match in styling and will result in a very poor loading performance, and poor performance when geopoints are used with calculations.

### Global Configuration

The global configuration is done in config.json (in your own app's replacement of it).

```jsons
{
    "arcGis": {
    	"jsUrl" : "/static/js/esri-arcgis-4-3.js",
    	"cssUrl" : "/static/js/esri-argis-4-3.css",
	    "webMapId": "45ded9b3e0e145139cc433b503a8f5ab",
	    "hasZ": false, 
	    "basemaps": [ "streets", "topo", "satellite", "osm" ] 
	}
}
```

#### arcGis.jsUrl
By default this picker will load a large JS file from a CDN. You can improve performance by serving the much smaller customized build [to follow].js file in /src/widget/geo-esri/ instead by copying it to your static js assets folder and adding the path to (your own app's) config.json. This cumbersome solution is required because Enketo is using CommonJS modules and the Esri ArcGIS for JS library is using AMD modules. This item is optional but recommended. This item can only be set as a global configuration.

#### arcGis.cssUrl
Same as previous item for for CSS resource.

#### arcGis.webMapId
Optionally, provide the default ArcGIS webmap ID to use. There is no default value in Enketo, but it will default to the ArcGIS JS API default.

#### arcGis.hasZ
Optional property to specify whether the altitude coordinate should be shown to the user. The default value is `true`.

#### arcGis.basemaps
Optional array of default basemaps to provide to the widget with a toggle button. See [this page](https://developers.arcgis.com/javascript/latest/api-reference/esri-Map.html#basemap) for possible values. The default value is `['streets', 'satellite', 'topo']`.


### Form Instantiation Options

Another lower level of configuration can be used on a per-form basis. It is up to the implementer whether to expose a UI to the user for these options or deal with them differently. It should be considered a bonus option for highly advanced applications where a fine-grained control of this geowidget is required. It deviates from all other widgets as none have this level of per-form customization. Most implementations may just not want to use this method.

It has all the options mentioned in the previous section under Global Configuration, except for the `jsUrl` property. This method of passing options takes precedence over the global configuration method so any global values for these properties would be overwritten.

```js
var data = {
	modelStr: modelStr
};
var options = {
	arcGis: {
	    webMapId: '45ded9b3e0e145139cc433b503a8f5ab',
	    hasZ: false, 
	    basemaps: [ 'streets', 'topo', 'satellite', 'osm' ] 
	}
};
var form = new Form( 'form.or:eq(0)', data, options );
```

### Form Definition Options

There is one option that can be defined by the user in the XForm/XLSForm definition. This is to set the ArcGIS webmap ID. This method takes precedence over the global configuration. However, the **form instantiation method takes precedence** over this method. 

Define the webmap ID in the XForm/XLSForm as follows:

#### XLSForm

settings sheet

| form_title | form_id | style                                    |
|------------|---------|------------------------------------------|
|            |         | arcgis::f2e9b762544945f390ca4ac3671cfa72 |

#### XForm

```xml
<h:body class="arcgis::f2e9b762544945f390ca4ac3671cfa72" >
```

Both methods are case-insensitive.
