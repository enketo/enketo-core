.PHONY: init
init:
	git submodule update --init --recursive
	npm install
	bower install
