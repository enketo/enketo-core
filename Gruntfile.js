"use strict";

module.exports = function(grunt) {
  var js;

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jasmine: {
      test: {
        src: 'src/**/*.js',
        options: {
          specs: 'tests/spec/*.js',
          helpers: ['tests/utils/*.js', 'tests/mocks/*.js'],
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');

  grunt.registerTask('test', ['jasmine']);
  grunt.registerTask('default', ['test']);
};