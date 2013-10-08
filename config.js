/**
 * Configuration file for Enketo-core
 */

define( function( ) {
	return {
		//simply comment out the widgets you do no wish to use
		"widgets": [
			"bootstrap-datepicker/js/bootstrap-datepicker",
			"bootstrap-timepicker/js/bootstrap-timepicker",
			"app/geopoint/geopointpicker",
			"app/offline-file/offline-filepicker",
			"app/select/selectpicker"
		]
	};
} );