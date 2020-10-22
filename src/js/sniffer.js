/**
 * @module sniffer
 **/

const ua = navigator.userAgent;
const pf = navigator.platform;

// We usually don't need to know which OS is running, but want to know
// whether a specific OS is runnning.

/**
 * @namespace os
 **/
const os = {
    /**
     * @type {string}
     **/
    get ios() {
        // in iOS13, the default Safari setting is 'Request Desktop Site' to be On. 
        // The platform and useragent no longer show iPad/iPhone/iPod
        // so we use a trick that will work for a while until MacOs gets touchscreen support.
        return /iPad|iPhone|iPod/i.test( pf ) || ( /Mac/i.test( pf ) && document.documentElement.ontouchstart !== undefined );
    },
    /**
     * @type {string}
     **/
    get android() {
        return /android/i.test( ua );
    },

    /**
     * @type {string}
     **/
    get safari() {
        return this.getBrowser() === 'Safari';
    },

    /**
     * @type {string}
     **/
    getBrowser() {
        let browser = null;
        // Opera
        if ( ua.indexOf('Opera') !== -1) {
            browser = 'Opera';
        }
        // Opera Next
        if ( ua.indexOf('OPR') !== -1) {
            browser = 'Opera';
        }
        // Edge
        else if ( ua.indexOf('Edge') !== -1) {
            browser = 'Microsoft Edge';
        }
        // MSIE
        else if ( ua.indexOf('MSIE') !== -1) {
            browser = 'Microsoft Internet Explorer';
        }
        // Chrome
        else if ( ua.indexOf('Chrome') !== -1) {
            browser = 'Chrome';
        }
        // Safari
        else if ( ua.indexOf('Safari') !== -1) {
            browser = 'Safari';
        }
        // Firefox
        else if ( ua.indexOf('Firefox') !== -1) {
            browser = 'Firefox';
        }
        // MSIE 11+
        else if (ua.indexOf('Trident/') !== -1) {
            browser = 'Microsoft Internet Explorer';
        }
        // Other browsers
        else {
            browser = "Other";
        }
        return browser;
    }
};

export { os };
