eefault: init test browserify server

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
