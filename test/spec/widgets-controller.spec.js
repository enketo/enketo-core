import events from '../../src/js/event';
import loadForm from '../helpers/load-form';

describe('Widgets controller', () => {
    it('globally initializes widgets which are only present in a repeat instance with count=0 on load', () => {
        const form = loadForm('repeat-count-widget-global-init.xml');

        form.init();

        const setRepeatCount = () => {
            /** @type {HTMLInputElement} */
            const countControl = form.view.html.querySelector(
                'input[name="/data/rep-count"]'
            );

            countControl.value = '1';

            countControl.dispatchEvent(events.Change());
        };

        expect(setRepeatCount).not.to.throw();
    });
});
