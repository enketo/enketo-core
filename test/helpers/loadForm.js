var Form = require( '../../src/js/Form' );
var forms = require( '../mock/forms' );

module.exports = function( filename, editStr, options, session ) {
    var strings = forms[ filename ];
    return new Form( strings.html_form, {
        modelStr: strings.xml_model,
        instanceStr: editStr,
        session: session || {}
    }, options );
};