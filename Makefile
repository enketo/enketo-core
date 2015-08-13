default: init test build compare-built

WIDGETS_REQUIRED = $(shell node -e "require('./config.json').widgets.forEach(function(widget) { console.log('-r ' + widget.replace(/^..\/widget\//, './src/widget/') + '.js'); });")

debug:
	@echo ${WIDGETS_REQUIRED}

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
		-o build/js/browserify-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js

.PHONY: test
test:
	grunt test

.PHONY: compare-built
compare-built:
	ls -al build/js/*.js
