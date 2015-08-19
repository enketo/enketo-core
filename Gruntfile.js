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
                files: [ 'config.json', 'grid/sass/**/*.scss', 'src/sass/**/*.scss', 'src/widget/**/*.scss' ],
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
        browserify: {
            standalone: {
                files: { 'build/js/enketo.grunt.js': browserify_includeList() },
            },
            options: {
                alias: browserify_aliases(),
            },
        },
        uglify: {
            standalone: {
                files: { 'build/js/enketo.grunt.min.js': [ 'build/js/enketo.grunt.js' ] },
            },
        },
    } );

    function browserify_aliases() {
        var aliases = {};
        browserify_widgetIncludes().forEach(function(w) {
            aliases[w] = w;
        });
        return aliases;
    }

    function browserify_widgetIncludes() {
        var config = require('./config.json'),
                includes = [];
        config.widgets.forEach(function(widget) {
            includes.push(widget + '.js');
            includes.push(widget.replace(/\/[^\/]*$$/, '') + '/config.json');
        });
        return includes;
    }

    function browserify_includeList() {
        var includes = browserify_widgetIncludes();
        includes.unshift('app.js');
        return includes;
    }

    //maybe this can be turned into a npm module?
    grunt.registerTask( 'prepWidgetSass', 'Preparing _widgets.scss dynamically', function() {
        var widgetFolderPath, widgetSassPath, widgetConfigPath,
            config = grunt.config( 'prepWidgetSass' ),
            widgets = grunt.file.readJSON( config.widgetConfigPath ).widgets,
            content = '// Dynamically created list of widget stylesheets to import based on the content\r\n' +
            '// based on the content of config.json\r\n\r\n';

        widgets.forEach( function( widget ) {
            if ( widget.indexOf( './src/' ) === 0 ) {
                //strip require.js module name
                widgetFolderPath = widget.substr( 0, widget.lastIndexOf( '/' ) + 1 );
                //replace widget require.js path shortcut with proper path relative to src/js
                widgetSassPath = widgetFolderPath.replace( /^\.\/src\//, '../../' );
                //create path to widget config file
                widgetConfigPath = widgetFolderPath + 'config.json';
                grunt.log.writeln( 'widget config path: ' + widgetConfigPath );
                //create path to widget stylesheet file
                widgetSassPath += grunt.file.readJSON( widgetConfigPath ).stylesheet;
            } else {
                grunt.log.error( [ 'Expected widget path "' + widget + '" in config.json to be preceded by "./src/".' ] );
            }
            //replace this by a function that parses config.json in each widget folder to get the 'stylesheet' variable
            content += '@import "' + widgetSassPath + '";\r\n';
        } );

        grunt.file.write( config.writePath, content );

    } );

    grunt.registerTask( 'compile', [ 'browserify', 'uglify' ] );
    grunt.registerTask( 'test', [ /*'jsbeautifier:test',*/ 'jshint', 'compile', 'karma:headless' ] );
    grunt.registerTask( 'style', [ 'prepWidgetSass', 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'develop', [ 'concurrent:develop' ] );
    grunt.registerTask( 'default', [ 'prepWidgetSass', 'sass', 'compile' ] );
};
