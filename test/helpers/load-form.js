import { Form } from '../../src/js/Form';
import forms from '../mock/forms';

export default ( filename, editStr, options, session ) => {
    const strings = forms[ filename ];
    return new Form( strings.html_form, {
        modelStr: strings.xml_model,
        instanceStr: editStr,
        session: session || {}
    }, options );
};
