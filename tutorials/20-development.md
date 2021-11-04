### How to develop Enketo Core

1. install prerequisites:
  - Volta (optional, but recommended)
  - Node.js 16 and npm 6 (Node.js 14 is also supported)
  - [grunt-cli](https://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt` (`npx grunt`)
4. start built-in auto-reloading development server with `npm start`
5. browse to [http://localhost:8005](http://localhost:8005/) and load an XForm url with the `xform` queryparameter or load a local from the /tests/forms folder in this repo
6. run tests with `npm test` (headless chrome) and `npm run test-browsers` (browsers); **note:** running tests updates the coverage badge in README.md, but these changes should not be committed except when preparing a release
7. adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### Notes for JavaScript Developers

* When creating new functions/Classes, make sure to describe them with JSDoc comments.
* JavaScript style see [ESLint](./eslintrc.json) config files. The check is added to the grunt `test` task. You can also manually run `grunt eslint:fix` to fix style issues.
* Testing is done with Mocha and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
* Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `npm run test-watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [Debugging test watch mode in VSCode](./#debugging-test-watch-mode-in-vscode) below
* When making a pull request, please add tests where relevant

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select "Test (watch + debug)"
3. Click the play button

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding keybinding

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


1. Create release PR
1. Check [Dependabot](https://github.com/enketo/enketo-core/security/dependabot) for alerts
1. Run `npm update`
    -  If enketo-transformer is updated, bump the version in `src/js/form.js`
1. Run `npm audit`
    - Run `npm audit fix --production` to apply most important fixes
1. Run `npm ci`
1. Run `npm test`
1. Run `npm run test-browsers`
1. Run `npm run beautify`
1. Run `npm run build-docs`
1. Update `CHANGELOG.md`
1. Update version in `package.json`
    - Bump to major version if downstream has to make changes.
1. Merge PR with all changes
1. Create GitHub release
1. Tag and publish the release
    - GitHub Action will publish it to npm
