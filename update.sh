#!/bin/bash

npm update
bower update
git submodule update --init --recursive
grunt
