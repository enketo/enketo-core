/*jshint node:true*/
"use strict";

module.exports = function( grunt ) {
  var js;

  // Project configuration.
  grunt.initConfig( {
    pkg: grunt.file.readJSON( 'package.json' ),
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [ 'Gruntfile.js', 'src/js/**/*.js', '!src/js/extern.js' ]
    },
    jasmine: {
      test: {
        src: 'src/**/*.js',
        options: {
          specs: 'test/spec/*.js',
          helpers: [ 'test/util/*.js', 'test/mock/*.js' ],
          template: require('grunt-template-jasmine-requirejs'),
          templateOptions: {
            requireConfig: {
              baseUrl: 'lib',
              paths: {
                app:   '../src/js/' //fails without trailing slash
              },
              shim: {
                'xpath/build/xpathjs_javarosa': {
                  exports: 'XPathJS'
                },
                'bootstrap-datepicker/js/bootstrap-datepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.datepicker'
                },
                'bootstrap-timepicker/js/bootstrap-timepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.timepicker'
                }
              }
            }
          }
        },
      }
    },
    sass: {
      dist: {
        options: {
          style: 'compressed'
        },
        files: [ {
          expand: true,
          cwd: 'src/sass',
          src: [ '**/*.scss', '!**/_*.scss' ],
          dest: 'build/css',
          ext: '.css'
        } ]
      }
    },
  } );

  grunt.loadNpmTasks( 'grunt-contrib-jasmine' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-contrib-sass' );

  grunt.registerTask( 'test', [ 'jasmine' ] );
  grunt.registerTask( 'default', [ 'jshint', 'sass', 'test' ] );
};