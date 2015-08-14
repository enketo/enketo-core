require.config( {
    paths: {
        "enketo-js": "./src/js",
        "enketo-widget": "./src/widget",
        "enketo-config": "./config.json",
        "require-config": "./require-config", // required for build task
        "text": "./lib/text/text",
        "xpath": "./lib/xpath/build/enketo-xpathjs",
        "file-manager": "./src/js/file-manager",
        "jquery": "./lib/bower-components/jquery/dist/jquery",
        "jquery.xpath": "./lib/jquery-xpath/jquery.xpath",
        "jquery.touchswipe": "./lib/jquery-touchswipe/jquery.touchSwipe",
        "leaflet": "./lib/bower-components/leaflet/dist/leaflet",
        "bootstrap-slider": "./lib/bootstrap-slider/js/bootstrap-slider",
        "merge-xml": "./lib/bower-components/mergexml/mergexml",
        "q": "./lib/bower-components/q/q",
        "support": "./src/js/support"
    },
    shim: {
        "xpath": {
            exports: "XPathJS"
        },
        "widget/date/bootstrap3-datepicker/js/bootstrap-datepicker": {
            deps: [ "jquery" ],
            exports: "jQuery.fn.datepicker"
        },
        "widget/time/bootstrap3-timepicker/js/bootstrap-timepicker": {
            deps: [ "jquery" ],
            exports: "jQuery.fn.timepicker"
        },
        "leaflet": {
            exports: "L"
        }
    }
} );
