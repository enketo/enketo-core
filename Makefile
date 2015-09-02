default: init test build compare-built server

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
