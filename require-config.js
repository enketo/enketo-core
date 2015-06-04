require.config( {
    baseUrl: "../lib",
    paths: {
        "enketo-js": "../src/js",
        "enketo-widget": "../src/widget",
        "enketo-config": "../config.json",
        "require-config": "../require-config", // required for build task
        "text": "text/text",
        "xpath": "xpath/build/enketo-xpathjs",
        "file-manager": "../src/js/file-manager",
        "jquery": "bower-components/jquery/dist/jquery",
        "jquery.xpath": "jquery-xpath/jquery.xpath",
        "jquery.touchswipe": "jquery-touchswipe/jquery.touchSwipe",
        "leaflet": "bower-components/leaflet/dist/leaflet",
        "bootstrap-slider": "bootstrap-slider/js/bootstrap-slider",
        "merge-xml": "bower-components/mergexml/mergexml",
        "q": "bower-components/q/q",
        "support": "../src/js/support"
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
