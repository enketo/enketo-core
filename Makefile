default: init test build compare-built server

VERSION = $(shell [ -z "`git status --porcelain`" ] && git describe --tags --exact-match 2>/dev/null || echo 'SNAPSHOT')
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

.PHONY: build-init build build-require build-browserify build-medic
build: build-require build-browserify
build-init:
	mkdir -p build/js
build-require:
	grunt compile
build-browserify: build-init
	./node_modules/browserify/bin/cmd.js \
		app.browserify.js \
		-o build/js/browserify-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js
build-medic: build-init
	./node_modules/browserify/bin/cmd.js \
		medic-mobile.js \
		-o build/js/browserify-medic-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js

.PHONY: watch
watch:
	./node_modules/watchify/bin/cmd.js \
		--debug --verbose \
		app.browserify.js \
		-o build/js/browserify-bundle.js \
		${WIDGETS_REQUIRED} \
		-r ./src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js

.PHONY: test
test:
	grunt test

.PHONY: server
server:
	grunt server

.PHONY: compare-built
compare-built:
	ls -al build/js/*.js

.PHONY: dev
dev: build-medic
	cp build/js/browserify-medic-bundle.js ../webapp/static/enketo/js/enketo-core-${VERSION}.js
