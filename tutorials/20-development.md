### How to develop Enketo Core

1. install [node](http://nodejs.org/) version 8 until [this issue](https://github.com/enketo/enketo-transformer/issues/53) is closed, and [grunt-cli](http://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt`
4. start built-in auto-reloading development server with `npm start`
5. browse to [http://localhost:8005](http://localhost:8005/) and load an XForm url with the `xform` queryparameter or load a local from the /tests/forms folder in this repo
6. run tests with `npm test` (headless chrome) and `npm run test-browsers` (browsers)
7. adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### Notes for JavaScript Developers

* When creating new functions/Classes, make sure to describe them with JSDoc comments.
* JavaScript style see [ESLint](./eslintrc.json) config files. The check is added to the grunt `test` task. You can also manually run `grunt eslint:fix` to fix style issues.
* Testing is done with Jasmine and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
* When making a pull request, please add tests where relevant

### Notes for CSS Developers

The core can be fairly easily extended with alternative themes.
See the *plain*, the *grid*, and the *formhub* themes already included in [/src/sass](./src/sass).
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme.

For custom themes that go beyond just changing colors and fonts, keep in mind all the different contexts for a theme:

1. non-touchscreen vs touchscreen (add ?touch=true during development)
2. default one-page-mode and multiple-pages-mode
3. right-to-left form language vs left-to-right form language (!) - also the UI-language may have a different directionality
4. screen view vs. print view
5. questions inside a (nested) repeat group have a different background
6. large screen size --> smaller screen size ---> smallest screen size
7. question in valid vs. invalid state

### Release a new version

Documentation is auto-generated and is re-built for each new release. Do not commit updated documentation in non-release commits. The process to follow for each release that includes various helpful checks is:

1. Change some code.
2. Build documentation: `npm run build-docs`.
3. Bump the version tag in `package.json` file (we follow [semantic versioning](https://semver.org/)).
4. Merge all your changes to `master` (through PR).
5. Add git tag of new version.
6. Publish module to NPM: `npm run publish-please`

We use [publish-please](https://github.com/inikulin/publish-please) - a tool that does various checks before publishing to NPM repository. It runs the test suite, beautifies the code, builds documentation (to check if there are any unbuilt changes), checks for any uncommitted changes and more. It basically verifies that you didn't miss any of the required steps. If you want to test it without publishing, use a flag: `npx publish-please --dry-run`.