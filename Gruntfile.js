/* jshint node:true */
/* global Promise */

/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */
'use strict';

module.exports = function( grunt ) {
    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    // Project configuration.
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        concurrent: {
            develop: {
                tasks: [ 'shell:transformer', 'connect:server:keepalive', 'watch' ],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8005,
                    base: [ 'test/forms', 'build' ]
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
                src: [ '*.js', 'src/js/*.js', 'src/widget/*/*.js' ],
                options: {
                    config: './.jsbeautifyrc',
                    mode: 'VERIFY_ONLY'
                }
            },
            fix: {
                src: [ '*.js', 'src/js/*.js', 'src/widget/*/*.js' ],
                options: {
                    config: './.jsbeautifyrc'
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [ '*.js', 'src/**/*.js', '!esri/**/*.js' ]
        },
        watch: {
            sass: {
                files: [ 'grid/sass/**/*.scss', 'src/sass/**/*.scss', 'src/widget/**/*.scss' ],
                tasks: [ 'style' ],
                options: {
                    spawn: true,
                    livereload: true,
                }
            },
            js: {
                files: [ 'config.json', '*.js', 'src/**/*.js' ],
                tasks: [ 'browserify' ],
                options: {
                    spawn: false,
                    livereload: true
                }
            }
        },
        karma: {
            options: {
                singleRun: true,
                reporters: [ 'dots' ],
                configFile: 'test/karma.conf.js',
            },
            headless: {
                browsers: [ 'ChromeHeadless' ]
            },
            browsers: {
                browsers: [ 'Chrome', 'ChromeCanary', 'Firefox', /*'Opera','Safari' */ ]
            }
        },
        sass: {
            options: {
                sourceMap: false,
                // this importer should be removed (npm 3+) or changed(npm 2) in the gruntFile of the app that is using enketo-core
                importer: function( url, prev, done ) {
                    // fixes enketo-core submodule references
                    url = ( /\.\.\/\.\.\/node_modules\//.test( url ) ) ? url.replace( '../../node_modules/', 'node_modules/' ) : url;
                    done( {
                        file: url
                    } );
                }
            },
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
        browserify: {
            standalone: {
                files: {
                    'build/js/enketo-bundle.js': [ 'app.js' ]
                },
            },
            options: {
                alias: {},
            },
        },
        uglify: {
            standalone: {
                files: {
                    'build/js/enketo-bundle.js': [ 'build/js/enketo-bundle.js' ]
                },
            },
        },
        shell: {
            transformer: {
                command: 'node node_modules/enketo-transformer/app.js'
            },
        }
    } );

    grunt.loadNpmTasks( 'grunt-sass' );

    grunt.registerTask( 'transforms', 'Creating forms.json', function( task ) {
        var forms = {};
        var done = this.async();
        var jsonStringify = require( 'json-pretty' );
        var formsJsonPath = 'test/mock/forms.json';
        var xformsPaths = grunt.file.expand( {}, 'test/forms/*.xml' );
        var transformer = require( 'enketo-transformer' );

        xformsPaths.reduce( function( prevPromise, filePath ) {
                return prevPromise.then( function() {
                    var xformStr = grunt.file.read( filePath );
                    grunt.log.writeln( 'Transforming ' + filePath + '...' );
                    return transformer.transform( {
                            xform: xformStr
                        } )
                        .then( function( result ) {
                            forms[ filePath.substring( filePath.lastIndexOf( '/' ) + 1 ) ] = {
                                html_form: result.form,
                                xml_model: result.model
                            };
                        } );
                } );

            }, Promise.resolve() )
            .then( function() {
                grunt.file.write( formsJsonPath, jsonStringify( forms ) );
                done();
            } );
    } );

    grunt.registerTask( 'compile', [ 'browserify', 'uglify' ] );
    grunt.registerTask( 'test', [ 'jsbeautifier:test', 'jshint', 'compile', 'transforms', 'karma:headless', 'style' ] );
    grunt.registerTask( 'style', [ 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'develop', [ 'style', 'browserify', 'concurrent:develop' ] );
    grunt.registerTask( 'default', [ 'style', 'compile' ] );
};
