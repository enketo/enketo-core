### Notes for JavaScript Developers

* When creating new functions/Classes, make sure to describe them with JSDoc comments.
* JavaScript style see: [JsBeautifier](./.jsbeautifyrc), [ESLint](./eslintrc.json) config files. The jsbeautifier check is added to the grunt `test` task. You can also manually run `grunt jsbeautifier:fix` to fix style issues.
* Testing is done with Jasmine and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
* When making a pull request, please add tests where relevant
