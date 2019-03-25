### Modern Browser support

The following browsers are officially supported:
* latest Android webview on latest Android OS
* latest WKWebView on latest iOS
* latest version of Chrome/Chromium on OS X, Linux, Windows, Android and iOS
* latest version of Firefox on OS X, Windows, Linux, Android and iOS
* latest version of Safari on OS X, Windows, and on the latest version of iOS
* latest version of Microsoft Edge

We have to admit we do not test on all of these, but are committed to fixing browser-specific bugs that are reported for these browsers. Naturally, older browsers versions will often work as well - they are just not officially supported.

#### Internet Explorer 11

Internet Explorer 11 is not supported and not tested. Until we completely let go of this ancient browser some time in 2019, you may have some success with running Enketo Core-powered forms in IE11 by:

1. Importing the `_iefix.scss` files in the theme entry files. These are commented out in the default CSS builds for the 3 themes.
2. Including polyfills using a script tag with the `nomodule` attribute (which will prevent loading this file on modern browsers). See [/build/index.html](./build/index.html) for an example using a polyfill service + additional polyfill file(s) that is tested occasionally.
3. Creating a special IE11 build (using Babel) that transpiles Enketo Core's modern syntax to old syntax and (optionally) includes [js/src/workarounds-ie11.js](./sjs/src/workarounds-ie11). See the `compile-ie11` build task in the Gruntfile for an example.
4. Use loading tricks to avoid loading the IE11 build in modern browsers and avoid executing the modern build in IE11. See [build/index.html](./build.index.html) for a possible approach.

Note that as we convert more and more code to modern syntax forms on IE11 will become progressively _slower_. For any issues specific to IE11, we encourage you to create a PR. We likely will not prioritize IE11 issues, even if we have funding, because of the psychological distress caused by working on such an old browser.
