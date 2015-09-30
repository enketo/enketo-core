/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */

/*jshint node:true*/
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
                tasks: [ 'connect:server:keepalive', 'watch' ],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8005
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
            all: [ '*.js', 'src/js/**/*.js', '!src/js/extern.js' ]
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
                files: [ '*.js', 'src/**/*.js' ],
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
                reporters: [ 'dots' ]
            },
            headless: {
                configFile: 'test/headless-karma.conf.js',
                browsers: [ 'PhantomJS' ]
            },
            browsers: {
                configFile: 'test/browser-karma.conf.js',
                browsers: [ 'Chrome', 'ChromeCanary', 'Firefox', /*'Opera',*/ 'Safari' ]
            }
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
                    'build/js/enketo-bundle.min.js': [ 'build/js/enketo-bundle.js' ]
                },
            },
        },
    } );

    grunt.registerTask( 'compile', [ 'browserify', 'uglify' ] );
    grunt.registerTask( 'test', [ 'jsbeautifier:test', 'jshint', 'compile', 'karma:headless' ] );
    grunt.registerTask( 'style', [ 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'develop', [ 'browserify', 'concurrent:develop' ] );
    grunt.registerTask( 'default', [ 'style', 'compile' ] );
};
