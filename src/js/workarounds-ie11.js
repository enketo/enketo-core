// 1. Replace download functionality for file upload and drawing widgets.
(function () {
    if (
        window.navigator.msSaveOrOpenBlob &&
        window.navigator.userAgent.indexOf('Trident/') >= 0
    ) {
        window.updateDownloadLinkIe11 = function (anchor, objectUrl, fileName) {
            let blob;
            // Shut off / reset previous link
            const listener = function () {
                window.navigator.msSaveOrOpenBlob(blob, fileName);

                return false;
            };
            anchor.removeEventListener('click', listener);
            if (objectUrl) {
                const xhr = new XMLHttpRequest();

                return new Promise((resolve) => {
                    xhr.open('GET', objectUrl);
                    xhr.responseType = 'blob';
                    xhr.onload = function () {
                        resolve(xhr.response);
                    };
                    xhr.send();
                })
                    .then((blb) => {
                        blob = blb;
                        anchor.addEventListener('click', listener);
                        anchor.removeAttribute('href');
                    })
                    .catch((e) => {
                        console.error(e);
                    });
            }
            // This wil hide the link with CSS
            anchor.setAttribute('href', '');
        };
    }
})();
