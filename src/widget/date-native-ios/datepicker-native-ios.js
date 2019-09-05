import Widget from '../../js/widget';
import { os } from '../../js/sniffer';
import { elementDataStore as data } from '../../js/dom-utils';

/**
 * The whole purpose of this widget is to workaround iOS browser bugs. See bug descriptions inline below.
 *
 * @extends Widget
 */
class DatepickerNativeIos extends Widget {
    /**
     * @type string
     */
    static get selector() {
        return '.question input[type="date"]';
    }

    /**
     * @param {Element} element
     * @return {boolean}
     */
    static condition( element ) {
        // Do not instantiate if DatepickerExtended was instantiated on element or if non-iOS browser is used.
        return !data.has( element, 'DatepickerExtended' ) && os.ios;
    }

    _init() {

        /*
         * Bug 1.
         *
         * This bug deals with readonly date inputs on iOS browsers (e.g. Safari and Chrome).
         * See https://github.com/OpenClinica/enketo-express-oc/issues/219.
         * Once this bug is fixed in iOS, this code can be removed.
         *
         * Unfortunately, I don't think we can detect the presence of the bug itself to avoid
         * using the workaround automatically (after Apple fixes it).
         *
         * This is a very ugly solution, but the bug is fairly obscure, and the workaround is hopefully
         * just temporary.
         */
        console.log( 'Adding iOS readonly datepicker workaround.' );
        this.element.addEventListener( 'focus', () => {
            // prepare for future where readonly state is dynamic
            if ( this.element.readOnly ) {
                this.element.blur();
            }
        } );
    }
}

export default DatepickerNativeIos;
