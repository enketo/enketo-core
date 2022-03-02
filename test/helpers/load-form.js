import { Form } from '../../src/js/form';
import forms from '../mock/forms';

const range = document.createRange();

export default (filename, recordStr, options, session, externalArr) => {
    const strings = forms[filename];
    const formEl = range
        .createContextualFragment(`<div>${strings.html_form}</div>`)
        .querySelector('form');

    return new Form(
        formEl,
        {
            modelStr: strings.xml_model,
            external: externalArr || [],
            instanceStr: recordStr,
            session: session || {},
        },
        options
    );
};
