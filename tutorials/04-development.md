### How to develop Enketo Core

1. install [node](http://nodejs.org/) version 8 until [this issue](https://github.com/enketo/enketo-transformer/issues/53) is closed, and [grunt-cli](http://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt`
4. start built-in auto-reloading development server with `npm start`
5. browse to [http://localhost:8005](http://localhost:8005/) and load an XForm url with the `xform` queryparameter or load a local from from the /tests/forms folder in this repo
6. run tests with `npm test`
7. adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens
