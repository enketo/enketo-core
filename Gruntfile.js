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
          specs: 'tests/spec/*.js',
          helpers: [ 'tests/utils/*.js', 'tests/mocks/*.js' ],
          vendor: [
            'lib/jquery.min.js',
            'lib/bootstrap.min.js',
            'lib/modernizr.min.js',
            'lib/xpath/build/xpathjs_javarosa.min.js',
            'lib/bootstrap-datepicker/js/bootstrap-datepicker.js',
            'lib/bootstrap-timepicker/js/bootstrap-timepicker.js'
          ]
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