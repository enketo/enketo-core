### How to develop Enketo Core

1. install prerequisites:
  - [Node](https://nodejs.org/) version 12.x
  - [npm CLI](https://docs.npmjs.com/cli/) version 6.x - comes bundled with Node, make sure it's not version 7.x, as it will not work
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
* Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `npm run test-watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [./#debugging-test-watch-mode-in-vscode](Debugging test watch mode in VSCode) below
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

1. Change some code.
2. Build documentation: `npm run build-docs`.
3. Bump the version tag in `package.json` file (we follow [semantic versioning](https://semver.org/)).
4. Merge all your changes to `master` (through PR).
5. Add git tag of new version.
6. Publish module to NPM: `npm run publish-please`

We use [publish-please](https://github.com/inikulin/publish-please) - a tool that does various checks before publishing to NPM repository. It runs the test suite, beautifies the code, builds documentation (to check if there are any unbuilt changes), checks for any uncommitted changes and more. It basically verifies that you didn't miss any of the required steps. If you want to test it without publishing, use a flag: `npx publish-please --dry-run`.
