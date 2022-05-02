/* eslint no-console: 0 */

/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */

import support from './src/js/support';
import { Form } from './src/js/form';
import fileManager from './src/js/file-manager';
import events from './src/js/event';
import { fixGrid, styleToAll, styleReset } from './src/js/print';

let form;
let formStr;
let modelStr;
const xform = getURLParameter('xform');

// if querystring touch=true is added, override detected touchscreen presence
if (getURLParameter('touch') === 'true') {
    support.touch = true;
    document.querySelector('html').classList.add('touch');
}

// Check if HTML form is hardcoded or needs to be retrieved
// note: when running this file in enketo-core-performance-monitor xform = 'null'
if (xform && xform !== 'null') {
    (async () => {
        const isRemote = /^https?:\/\//.test(xform);
        const xformURL = isRemote ? xform : `${location.origin}/${xform}`;
        const transformerUrl = `http://${location.hostname}:8085/transform?xform=${xformURL}`;

        try {
            document.querySelector('.guidance').remove();

            /** @type {import('enketo-transformer').TransformedSurvey & { modifiedTime?: number } | null} */
            let survey = null;

            if (!isRemote) {
                // This must be dynamically imported or it'll be included in the build
                const localForms = (await import(`./${'forms'}.mjs`)).default;
                const localForm = localForms[xform];

                if (localForm != null) {
                    survey = {
                        form: localForm.html_form,
                        model: localForm.xml_model,
                    };
                }
            }

            if (survey == null) {
                const response = await fetch(transformerUrl);

                survey = await response.json();
            }

            formStr = survey.form;
            modelStr = survey.model;
            const range = document.createRange();
            const formEl = range
                .createContextualFragment(formStr)
                .querySelector('form');
            document.querySelector('.form-header').after(formEl);
            initializeForm();
        } catch (error) {
            // eslint-disable-next-line no-alert
            window.alert(
                `Error fetching form from enketo-transformer at:
                ${transformerUrl}.\n\nPlease check that enketo-transformer has been started.
                ${error}`
            );

            throw error;
        }
    })();
} else if (document.querySelector('form.or')) {
    document.querySelector('.guidance').remove();
    modelStr = window.globalModelStr;
    initializeForm();
}

// validate handler for validate button
document.querySelector('#validate-form').addEventListener('click', () => {
    // validate form
    form.validate().then((valid) => {
        if (!valid) {
            window.alert(
                'Form contains errors. Please see fields marked in red.'
            );
        } else {
            window.alert(
                'Form is valid! (see XML record and media files in the console)'
            );
            form.view.html.dispatchEvent(events.BeforeSave());
            console.log('record:', form.getDataStr());
            console.log('media files:', fileManager.getCurrentFiles());
        }
    });
});

// initialize the form
function initializeForm() {
    const formEl = document.querySelector('form.or');
    form = new Form(
        formEl,
        {
            modelStr,
        },
        {
            printRelevantOnly: false,
        }
    );
    // for debugging
    window.form = form;
    // initialize form and check for load errors
    const loadErrors = form
        .init()
        .filter((error) => error !== "Can't find last-saved.");

    if (loadErrors.length > 0) {
        window.alert(`loadErrors: ${loadErrors.join(', ')}`);
    }
}

// get query string parameter
function getURLParameter(name) {
    return decodeURI(
        (new RegExp(`${name}=` + `(.+?)(&|$)`).exec(location.search) || [
            null,
            null,
        ])[1]
    );
}

// to facilitate developing print-specific issues
function printView(on = true, grid = false) {
    if (on) {
        document
            .querySelectorAll('.question')
            .forEach((el) => el.dispatchEvent(events.Printify()));
        styleToAll();
        if (grid) {
            fixGrid({ format: 'letter' }).then(() => console.log('done'));
        }
    } else {
        document
            .querySelectorAll('.question')
            .forEach((el) => el.dispatchEvent(events.DePrintify()));
        styleReset();
    }
}

window.printGridView = (on = true) => printView(on, true);
window.printView = printView;
