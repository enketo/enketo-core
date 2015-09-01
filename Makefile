default: init test build compare-built server

VERSION = $(shell [ -z "`git status --porcelain`" ] && git describe --tags --exact-match 2>/dev/null || echo 'SNAPSHOT')

debug:
	@echo ${WIDGETS_REQUIRED}

.PHONY: init
init:
	git submodule update --init --recursive
	npm install
	bower install

.PHONY: build-init build build
build-init:
	mkdir -p build/js
build:
	grunt medic

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
dev: build
	cp build/js/medic-enketo-bundle.js ../webapp/static/enketo/js/enketo-core-${VERSION}.js
