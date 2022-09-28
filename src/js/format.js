/**
 * @module format
 */

import events from './event';

/**
 * @typedef LocaleState
 * @property {string[]} locales
 * @property {string} dateString
 * @property {string} timeString
 * @property {Intl.DateTimeFormat} timeFormatter
 */

/** @type {LocaleState | null} */
let localeState = null;

const setLocalizedTimeFormatter = () => {
    const locales = Intl.getCanonicalLocales(navigator.languages);
    const date = new Date(2000, 1, 1, 1, 23, 45);
    const dateString = date.toLocaleString();
    const timeString = date.toLocaleTimeString();
    const timeFormatter = Intl.DateTimeFormat(locales, {
        timeStyle: 'short',
    });

    localeState = {
        locales,
        dateString,
        timeString,
        timeFormatter,
    };
};

/**
 * @param {HTMLFormElement} [rootElement]
 */
const initTimeLocalization = (rootElement) => {
    const languageChangeListener = () => {
        setLocalizedTimeFormatter();

        rootElement?.dispatchEvent(events.ChangeLanguage());
    };

    addEventListener('languagechange', languageChangeListener);

    setLocalizedTimeFormatter();

    return removeEventListener.bind(
        window,
        'languagechange',
        languageChangeListener
    );
};

/**
 * @namespace time
 */
const time = {
    /**
     * @type {boolean}
     */
    get hour12() {
        const { hour12 } = localeState.timeFormatter.resolvedOptions();

        return Boolean(hour12);
    },

    /**
     * @type {string}
     */
    get pmNotation() {
        return this.meridianNotation(new Date(2000, 1, 1, 23, 0, 0));
    },

    /**
     * @type {string}
     */
    get amNotation() {
        return this.meridianNotation(new Date(2000, 1, 1, 1, 0, 0));
    },

    /**
     * @param {Date} date - datetime string
     */
    meridianNotation(date) {
        const formatted = localeState.timeFormatter.formatToParts(date);
        const meridianPart = formatted.find(({ type }) => type === 'dayPeriod');

        if (meridianPart != null) {
            return meridianPart.value;
        }

        return null;
    },

    /**
     * Whether time string has meridian parts
     *
     * @type {Function}
     * @param {string} time - Time string
     */
    hasMeridian(time) {
        return time.includes(this.amNotation) || time.includes(this.pmNotation);
    },
};

export { initTimeLocalization, time };
