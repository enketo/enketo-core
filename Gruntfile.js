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
                src: [ "src/js/*.js", "src/widget/*/*.js" ],
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
        jasmine: {
            test: {
                src: 'src/js/**/*.js',
                options: {
                    specs: 'test/spec/*.js',
                    helpers: [ 'test/util/*.js', 'test/mock/*.js' ],
                    host: 'http://127.0.0.1:8000/',
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
        // this compiles all javascript to a single file, it is only used to prepare for 
        // testing closure compiler build warnings and errors
        requirejs: {
            combine: {
                options: {
                    name: '../app',
                    baseUrl: 'lib',
                    mainConfigFile: "app.js",
                    findNestedDependencies: true,
                    include: [ 'require.js', 'js/Widget' ].concat( grunt.file.readJSON( 'config.json' ).widgets ),
                    out: "build/js/combined.js",
                    optimize: "none"
                }
            }
        },
        //closurePath may be different. I installed with brew closure-compiler on Mac
        'closure-compiler': {
            compile: {
                closurePath: '/usr/local/opt/closure-compiler/libexec/',
                js: 'build/js/combined.js',
                jsOutputFile: 'build/js/combined.min.js',
                maxBuffer: 500,
                options: {
                    compilation_level: 'ADVANCED_OPTIMIZATIONS',
                    language_in: 'ECMASCRIPT5_STRICT'
                }
            }
        }
    } );

    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( 'grunt-jsbeautifier' );
    grunt.loadNpmTasks( 'grunt-contrib-jasmine' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-sass' );
    grunt.loadNpmTasks( 'grunt-contrib-requirejs' );
    grunt.loadNpmTasks( 'grunt-closure-compiler' );

    grunt.registerTask( 'prepWidgetSass', 'Preparing _widgets.scss dynamically', function() {
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
    grunt.registerTask( 'compile', [ 'requirejs:combine', 'closure-compiler:compile' ] );
    grunt.registerTask( 'test', [ 'jsbeautifier:test', 'connect:test', 'jasmine' ] );
    grunt.registerTask( 'style', [ 'prepWidgetSass', 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'default', [ 'jshint', 'prepWidgetSass', 'sass', 'test' ] );
};
