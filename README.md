[![npm version](https://badge.fury.io/js/enketo-core.svg)](http://badge.fury.io/js/enketo-core) ![Build Status](https://github.com/enketo/enketo-core/actions/workflows/npmjs.yml/badge.svg)

# Enketo Core

The engine that powers [Enketo Smart Paper](https://enketo.org) and various third party tools including [this selection](https://enketo.org/about/adoption/).

Enketo's form engine is compatible with tools in the ODK ecosystem and complies with its [XForms specification](https://getodk.github.io/xforms-spec/) though not all features in that specification have been implemented yet.

This repo is meant to be used as a building block for any Enketo-powered application. See [this page](https://enketo.org/develop/#libraries) for a schematic overview of a real-life full-fledged data collection application and how Enketo Core fits into this.

**To get started visit our [technical documentation](https://github.com/enketo/enketo-core/tree/master/tutorials).**

Follow the [Enketo blog](https://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.

### Browser support

The following browsers are officially supported:

-   latest Android webview on latest Android OS
-   latest WKWebView on latest iOS
-   latest version of Chrome/Chromium on Mac OS, Linux, Windows, Android and iOS
-   latest version of Firefox on Mac OS, Windows, Linux, Android and iOS
-   latest version of Safari on Mac OS, Windows, and on the latest version of iOS
-   latest version of Microsoft Edge

We have to admit we do not test on all of these, but are committed to fixing browser-specific bugs that are reported for these browsers. Naturally, older browsers versions will often work as well - they are just not officially supported.

### Releases

1. Create release PR
1. Update `CHANGELOG.md`
1. Update version in `package.json`
    - Bump to major version if consumers have to make changes.
1. Check [Dependabot](https://github.com/enketo/enketo-core/security/dependabot) for alerts
1. Run `npm update`
    - Check if `node-forge` has been updated and if so, verify encrypted submissions end-to-end
    - If `enketo-transformer` has been updated, change `Form.requiredTransformerVersion`
1. Run `npm audit`
    - Run `npm audit fix --production` to apply most important fixes
1. Run `npm i`
1. Run `npm test`
1. Merge PR with all changes
1. Create GitHub release
1. Tag and publish the release
    - GitHub Action will publish it to npm

### Sponsors

The development of this library was sponsored by:

-   [OpenClinica](https://www.openclinica.com/)
-   [Sustainable Engineering Lab at Columbia University](http://modi.mech.columbia.edu/)
-   [WHO - HRP project](http://www.who.int/reproductivehealth/topics/mhealth/en/index.html)
-   [Santa Fe Insitute & Slum/Shack Dwellers International](http://www.santafe.edu/)
-   [Enketo LLC](http://www.linkedin.com/company/enketo-llc)
-   [iMMAP](http://immap.org)
-   [KoBo Toolbox (Harvard Humanitarian Initiative)](https://kobotoolbox.org)
-   [Ona](https://ona.io)
-   [Medic](https://medic.org/)
-   [Esri](https://esri.com)
-   [DIAL Open Source Center](https://www.osc.dial.community/)

### Performance (live)

See [graphs](https://github.com/enketo/enketo-core-performance-monitor#live-results)

### License

See [license](https://github.com/enketo/enketo-core/blob/master/LICENSE) document and additional clause below:

Any product that uses enketo-core is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which enketo-core or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/about/sponsors/](https://enketo.org/about/sponsors/) and on [this page](#sponsors) are exempted from this requirements and so are contributors listed in [package.json](https://github.com/enketo/enketo-core/blob/master/package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>
