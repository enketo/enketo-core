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
        src: 'src/js/**/*.js',
        options: {
          specs: 'test/spec/*.js',
          helpers: [ 'test/util/*.js', 'test/mock/*.js' ],
          template: require( 'grunt-template-jasmine-requirejs' ),
          templateOptions: {
            requireConfig: {
              baseUrl: 'lib',
              paths: {
                js: '../src/js',
                widget: '../src/widget',
                text: 'text/text',
                xpath: 'xpath/build/xpathjs_javarosa',
                config: '../config.json'
              },
              shim: {
                'xpath': {
                  exports: 'XPathJS'
                },
                'bootstrap': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.bootstrap'
                },
                'widget/date/bootstrap-datepicker/js/bootstrap-datepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.datepicker'
                },
                'widget/time/bootstrap-timepicker/js/bootstrap-timepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.timepicker'
                }
              },
              map: {
                '*': {
                  'js': '../src/js',
                  'widget': '../src/widget'
                }
              }
            }
          }
        },
      }
    },
    prepWidgetSass: {
      writePath: 'src/sass/_widgets.scss',
      widgetConfigPath: 'config.json'
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

  grunt.registerTask( 'prepWidgetSass', 'Preparing _widgets.scss dynamically', function( ) {
    var widgetConfig, widgetFolderPath, widgetSassPath, widgetConfigPath,
      config = grunt.config( 'prepWidgetSass' ),
      widgets = grunt.file.readJSON( config.widgetConfigPath ).widgets,
      content = '// Dynamically created list of widget stylesheets to import based on the content\r\n' +
        '// based on the content of config.json\r\n\r\n';

    widgets.forEach( function( widget ) {
      if ( widget.indexOf( 'widget/' ) === 0 ) {
        //strip require.js module name
        widgetFolderPath = widget.substr( 0, widget.lastIndexOf( '/' ) + 1 );
        //replace widget require.js path shortcut with proper path relative to src/js
        widgetSassPath = widgetFolderPath.replace( /^widget\//, '../widget/' );
        //create path to widget config file
        widgetConfigPath = widgetFolderPath.replace( /^widget\//, 'src/widget/' ) + 'config.json';
        grunt.log.writeln( 'widget config path: ' + widgetConfigPath );
        //create path to widget stylesheet file
        widgetSassPath += grunt.file.readJSON( widgetConfigPath ).stylesheet;
      } else {
        grunt.log.error( [ 'Expected widget path "' + widget + '" in config.json to be preceded by "widget/".' ] );
      }
      //replace this by a function that parses config.json in each widget folder to get the 'stylesheet' variable
      content += '@import "' + widgetSassPath + '";\r\n';
    } );

    grunt.file.write( config.writePath, content );

  } );

  grunt.registerTask( 'test', [ 'jasmine' ] );
  grunt.registerTask( 'style', [ 'prepWidgetSass', 'sass' ] );
  grunt.registerTask( 'default', [ 'jshint', 'prepWidgetSass', 'sass', 'test' ] );
};