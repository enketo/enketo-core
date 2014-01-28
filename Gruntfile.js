/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */

/*jshint node:true*/
"use strict";

module.exports = function( grunt ) {
    var js;

    // Project configuration.
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
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
                    spawn: false
                }
            },
            js: {
                files: [ '*.js', 'src/**/*.js' ],
                tasks: [ 'modernizr' ],
                options: {
                    spawn: false
                }
            }
        },
        jasmine: {
            test: {
                src: 'src/js/**/*.js',
                options: {
                    keepRunner: true,
                    specs: 'test/spec/*.js',
                    helpers: [ 'test/util/*.js', 'test/mock/*.js' ],
                    host: 'http://127.0.0.1:8000/',
                    template: require( 'grunt-template-jasmine-requirejs' ),
                    templateOptions: {
                        requireConfig: {
                            baseUrl: 'lib',
                            paths: {
                                'enketo-js': '../src/js',
                                'enketo-widget': '../src/widget',
                                'enketo-config': '../config.json',
                                text: 'text/text',
                                xpath: 'xpath/build/xpathjs_javarosa',
                                'jquery.xpath': 'jquery-xpath/jquery.xpath',
                                'jquery.touchswipe': 'jquery-touchswipe/jquery.touchSwipe'
                            },
                            shim: {
                                'xpath': {
                                    exports: 'XPathJS'
                                },
                                'bootstrap': {
                                    deps: [ 'jquery' ],
                                    exports: 'jQuery.fn.bootstrap'
                                },
                                'widget/date/bootstrap3-datepicker/js/bootstrap-datepicker': {
                                    deps: [ 'jquery' ],
                                    exports: 'jQuery.fn.datepicker'
                                },
                                'widget/time/bootstrap3-timepicker/js/bootstrap-timepicker': {
                                    deps: [ 'jquery' ],
                                    exports: 'jQuery.fn.timepicker'
                                }
                            },
                            map: {
                                '*': {
                                    'enketo-js': '../src/js',
                                    'enketo-widget': '../src/widget'
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
                    style: 'expanded',
                    noCache: true
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
        // this compiles all javascript to a single minified file
        requirejs: {
            compile: {
                options: {
                    name: '../app',
                    baseUrl: 'lib',
                    mainConfigFile: "app.js",
                    findNestedDependencies: true,
                    include: ( function() {
                        //add widgets js and widget config.json files
                        var widgets = grunt.file.readJSON( 'config.json' ).widgets;
                        widgets.forEach( function( widget, index, arr ) {
                            arr.push( 'text!' + widget.substr( 0, widget.lastIndexOf( '/' ) + 1 ) + 'config.json' );
                        } );
                        return [ 'require.js' ].concat( widgets );
                    } )(),
                    out: "build/js/combined.min.js",
                    optimize: "uglify2"
                }
            }
        },
        modernizr: {
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
    } );

    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( 'grunt-jsbeautifier' );
    grunt.loadNpmTasks( 'grunt-contrib-jasmine' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-sass' );
    grunt.loadNpmTasks( 'grunt-contrib-requirejs' );
    grunt.loadNpmTasks( "grunt-modernizr" );

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
                widgetSassPath = widgetFolderPath.replace( /^enketo-widget\//, '../widget/' );
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
    grunt.registerTask( 'test', [ 'jsbeautifier:test', 'jshint', 'connect:test', 'compile', 'jasmine' ] );
    grunt.registerTask( 'style', [ 'prepWidgetSass', 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'default', [ 'jshint', 'prepWidgetSass', 'sass', 'test' ] );
};
