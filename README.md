![coverage-shield-badge-1](https://img.shields.io/badge/coverage-74.56%25-yellow.svg)
[![npm version](https://badge.fury.io/js/enketo-core.svg)](http://badge.fury.io/js/enketo-core) [![Build Status](https://travis-ci.org/enketo/enketo-core.svg?branch=master)](https://travis-ci.org/enketo/enketo-core) [![Dependency Status](https://david-dm.org/enketo/enketo-core/status.svg)](https://david-dm.org/enketo/enketo-core) [![devDependency Status](https://david-dm.org/enketo/enketo-core/dev-status.svg)](https://david-dm.org/enketo/enketo-core?type=dev) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/dc1c5aaa9267d75cbd2d6714d2b4fa32)](https://www.codacy.com/app/martijnr/enketo-core?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=enketo/enketo-core&amp;utm_campaign=Badge_Grade)

Enketo Core
===========

The engine that powers [Enketo Smart Paper](https://enketo.org) and various third party tools including [this selection](https://enketo.org/about/adoption/).

Enketo's form engine is compatible with tools in the ODK ecosystem and complies with its [XForms specification](https://opendatakit.github.io/xforms-spec/) though not all features in that specification have been implemented yet.

This repo is meant to be used as a building block for any Enketo-powered application. See [this page](https://enketo.org/develop/#libraries) for a schematic overview of a real-life full-fledged data collection application and how Enketo Core fits into this.

**To get started visit our [technical documentation](https://enketo.github.io/enketo-core).**

Follow the [Enketo blog](https://blog.enketo.org) or [Enketo on twitter](https://twitter.com/enketo) to stay up to date.


### Browser support

The following browsers are officially supported:
* latest Android webview on latest Android OS
* latest WKWebView on latest iOS
* latest version of Chrome/Chromium on Mac OS, Linux, Windows, Android and iOS
* latest version of Firefox on Mac OS, Windows, Linux, Android and iOS
* latest version of Safari on Mac OS, Windows, and on the latest version of iOS
* latest version of Microsoft Edge

We have to admit we do not test on all of these, but are committed to fixing browser-specific bugs that are reported for these browsers. Naturally, older browsers versions will often work as well - they are just not officially supported.

[Here is some guidance](https://enketo.github.io/enketo-core/tutorial-90-ie11.html) that may be helpful when trying to create a build that possibly runs on Internet Explorer 11.

### Sponsors

The development of this library was sponsored by:

* [OpenClinica](https://www.openclinica.com/)
* [Sustainable Engineering Lab at Columbia University](http://modi.mech.columbia.edu/)
* [WHO - HRP project](http://www.who.int/reproductivehealth/topics/mhealth/en/index.html)
* [Santa Fe Insitute & Slum/Shack Dwellers International](http://www.santafe.edu/)
* [Enketo LLC](http://www.linkedin.com/company/enketo-llc)
* [iMMAP](http://immap.org)
* [KoBo Toolbox (Harvard Humanitarian Initiative)](https://kobotoolbox.org)
* [Ona](https://ona.io)
* [Medic Mobile](http://medicmobile.org/)
* [Esri](https://esri.com)

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
