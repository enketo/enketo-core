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
    }
};

export { os };
