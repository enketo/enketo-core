eefault: init test browserify compile server

CC_VERSION = compiler-20150729.tar.gz
WIDGETS_REQUIRED = $(shell node -e "require('./config.json').widgets.forEach(function(widget) {\
	widget = widget.replace(/^..\/widget\//, './src/widget/'); \
	console.log('-r ' + widget + '.js -r ' \
		+ widget.replace(/\/[^\/]*$$/, '') + '/config.json'); });")

debug:
	@echo ${WIDGETS_REQUIRED}

.PHONY: init
init:
	git submodule update --init --recursive
	npm install
	bower install

.PHONY: build-init browserify
build-init:
	mkdir -p build/js
browserify: build-init
	./node_modules/browserify/bin/cmd.js \
		app.js \
		-o build/js/browserify-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js

.PHONY: watch
watch: build-init
	./node_modules/watchify/bin/cmd.js \
		--debug --verbose \
		app.js \
		-o build/js/browserify-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js

.PHONY: test
test:
	grunt test

.PHONY: server
server:
	grunt server

.PHONY: compile-dependencies
compile-dependencies:
	mkdir -p build/fetch/cc
	(cd build/fetch/cc && \
		wget -c http://dl.google.com/closure-compiler/${CC_VERSION} && \
		tar -xf ${CC_VERSION} && \
		cp compiler.jar ../../lib)

.PHONY: compile
compile: build-browserify compile-dependencies
	java -jar build/lib/compiler.jar \
		--language_in ES5 \
		--js_output_file=build/js/browserify-bundle.min.js \
		build/js/browserify-bundle.js
