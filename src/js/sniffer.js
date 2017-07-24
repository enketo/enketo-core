'use strict';

var ua = navigator.userAgent;

// We usually don't need to know which OS is running, but want to know
// whether a specific OS is runnning.

module.exports = {
    os: {
        get ios() {
            return /iPad|iPhone|iPod/i.test( ua );
        },
        get android() {
            return /android/i.test( ua );
        }
    }
};
