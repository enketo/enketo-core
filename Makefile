default: init test build

.PHONY: init
init:
	npm install

.PHONY: build
build:
	grunt medic

.PHONY: test
test:
	grunt test

.PHONY: server
server:
	grunt server
