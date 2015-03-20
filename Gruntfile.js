/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */

/*jshint node:true*/
"use strict";

module.exports = function( grunt ) {
    var js;

    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    // Project configuration.
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        concurrent: {
            develop: {
                tasks: [ 'connect:server:keepalive', 'watch' ],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8080
                }
            },
            test: {
                options: {
                    port: 8000
                }
            }
        },
        jsbeautifier: {
            test: {
                src: [ "*.js", "src/js/*.js", "src/widget/*/*.js" ],
                options: {
                    config: "./.jsbeautifyrc",
                    mode: "VERIFY_ONLY"
                }
            },
            fix: {
                src: [ "*.js", "src/js/*.js", "src/widget/*/*.js" ],
                options: {
                    config: "./.jsbeautifyrc"
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [ '*.js', 'src/js/**/*.js', '!src/js/extern.js' ]
        },
        watch: {
            sass: {
                files: [ 'config.json', 'grid/sass/**/*.scss', 'src/sass/**/*.scss', 'src/widget/**/*.scss' ],
                tasks: [ 'style' ],
                options: {
                    spawn: true,
                    livereload: true,
                }
            },
            js: {
                files: [ '*.js', 'src/**/*.js' ],
                tasks: [ 'modernizr' ],
                options: {
                    spawn: false,
                    livereload: true
                }
            }
        },
        karma: {
            options: {
                singleRun: true,
                reporters: [ 'dots' ]
            },
            headless: {
                configFile: 'test/karma.conf.js',
                browsers: [ 'PhantomJS' ]
            },
            browsers: {
                configFile: 'test/karma.conf.js',
                browsers: [ 'Chrome', 'ChromeCanary', /*'Firefox'*/ /*, 'Opera',*/ 'Safari' ]
            }
        },
        prepWidgetSass: {
            writePath: 'src/sass/core/_widgets.scss',
            widgetConfigPath: 'config.json'
        },
        sass: {
            compile: {
                cwd: 'src/sass',
                dest: 'build/css',
                expand: true,
                outputStyle: 'expanded',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last'
            }
        },
        // this compiles all javascript to a single minified file
        requirejs: {
            compile: {
                options: {
                    name: '../app',
                    baseUrl: './lib',
                    mainConfigFile: 'require-config.js',
                    findNestedDependencies: true,
                    include: ( function() {
                        //add widgets js and widget config.json files
                        var widgets = grunt.file.readJSON( 'config.json' ).widgets;
                        widgets.forEach( function( widget, index, arr ) {
                            arr.push( 'text!' + widget.substr( 0, widget.lastIndexOf( '/' ) + 1 ) + 'config.json' );
                        } );
                        return [ './bower-components/requirejs/require.js' ].concat( widgets );
                    } )(),
                    out: "build/js/combined.min.js",
                    optimize: "uglify2"
                }
            }
        },
        modernizr: {
            dist: {
                "devFile": "remote",
                "outputFile": "lib/Modernizr.js",
                "extra": {
                    "shiv": false,
                    "printshiv": true,
                    "load": false,
                    "mq": false,
                    "cssclasses": true
                },
                "uglify": false,
                "parseFiles": true
            }
        }
    } );

    //maybe this can be turned into a npm module?
    grunt.registerTask( 'prepWidgetSass', 'Preparing _widgets.scss dynamically', function() {
        var widgetConfig, widgetFolderPath, widgetSassPath, widgetConfigPath,
            config = grunt.config( 'prepWidgetSass' ),
            widgets = grunt.file.readJSON( config.widgetConfigPath ).widgets,
            content = '// Dynamically created list of widget stylesheets to import based on the content\r\n' +
            '// based on the content of config.json\r\n\r\n';

        widgets.forEach( function( widget ) {
            if ( widget.indexOf( 'enketo-widget/' ) === 0 ) {
                //strip require.js module name
                widgetFolderPath = widget.substr( 0, widget.lastIndexOf( '/' ) + 1 );
                //replace widget require.js path shortcut with proper path relative to src/js
                widgetSassPath = widgetFolderPath.replace( /^enketo-widget\//, '../../widget/' );
                //create path to widget config file
                widgetConfigPath = widgetFolderPath.replace( /^enketo-widget\//, 'src/widget/' ) + 'config.json';
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

    grunt.registerTask( 'compile', [ 'requirejs:compile' ] );
    grunt.registerTask( 'test', [ 'modernizr', 'jsbeautifier:test', 'jshint', 'compile', 'karma:headless' ] );
    grunt.registerTask( 'style', [ 'prepWidgetSass', 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'develop', [ 'concurrent:develop' ] );
    grunt.registerTask( 'default', [ 'prepWidgetSass', 'sass', 'compile' ] );
};
