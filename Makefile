default: init test build compare-built

.PHONY: init
init:
	git submodule update --init --recursive
	npm install
	bower install

.PHONY: build build-require build-browserify
build: build-require build-browserify
build-require:
	grunt compile
build-browserify:
	browserify src/js/Form.js \
		-o build/js/browserify-bundle.js

.PHONY: test
test:
	grunt test

.PHONY: compare-built
compare-built:
	ls -al build/js/*.js
