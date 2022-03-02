/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */
const nodeSass = require('node-sass');

module.exports = (grunt) => {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    const eslintInclude = [
        '*.js',
        'scripts/**/*.js',
        'src/**/*.js',
        'test/**/*.js',
        '!test/mock/forms.js',
    ];

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concurrent: {
            develop: {
                tasks: [
                    'shell:transformer',
                    'connect:server:keepalive',
                    'watch',
                ],
                options: {
                    logConcurrentOutput: true,
                },
            },
            test: {
                tasks: ['karma:watch', 'watch:transforms'],
                options: {
                    logConcurrentOutput: true,
                },
            },
        },
        connect: {
            server: {
                options: {
                    port: 8005,
                    base: ['test/forms', 'test/temp', 'build'],
                },
            },
            test: {
                options: {
                    port: 8000,
                },
            },
        },
        eslint: {
            check: {
                src: eslintInclude,
            },
            fix: {
                options: {
                    fix: true,
                },
                src: eslintInclude,
            },
        },
        watch: {
            sass: {
                files: [
                    'grid/sass/**/*.scss',
                    'src/sass/**/*.scss',
                    'src/widget/**/*.scss',
                ],
                tasks: ['css'],
                options: {
                    spawn: true,
                    livereload: true,
                },
            },
            js: {
                files: ['config.json', '*.js', 'src/**/*.js'],
                tasks: ['shell:build'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            transforms: {
                files: 'test/forms/*.xml',
                tasks: ['transforms'],
                options: {
                    spawn: true,
                    livereload: false,
                },
            },
        },
        karma: {
            options: {
                singleRun: true,
                configFile: 'test/karma.conf.js',
                customLaunchers: {
                    ChromeHeadlessNoSandbox: {
                        base: 'ChromeHeadless',
                        flags: ['--no-sandbox'],
                    },
                    ChromeHeadlessDebug: {
                        base: 'ChromeHeadless',
                        flags: ['--no-sandbox', '--remote-debugging-port=9333'],
                    },
                },
            },
            headless: {
                browsers: ['ChromeHeadlessNoSandbox'],
            },
            browsers: {
                browsers:
                    process.env.CI === 'true'
                        ? ['Chrome', 'Firefox']
                        : ['Chrome', 'Firefox', 'Safari'],
            },
            watch: {
                browsers: ['ChromeHeadlessDebug'],
                options: {
                    autoWatch: true,
                    client: {
                        mocha: {
                            timeout: Number.MAX_SAFE_INTEGER,
                        },
                    },
                    reporters: ['dots'],
                    singleRun: false,
                },
            },
        },
        sass: {
            options: {
                implementation: nodeSass,
                sourceMap: false,
                importer(url, prev, done) {
                    // Fixes enketo-core submodule references.
                    // Those references are correct in apps that use enketo-core as a submodule.
                    url = /\.\.\/\.\.\/node_modules\//.test(url)
                        ? url.replace('../../node_modules/', 'node_modules/')
                        : url;
                    done({
                        file: url,
                    });
                },
            },
            compile: {
                cwd: 'src/sass',
                dest: 'build/css',
                expand: true,
                outputStyle: 'expanded',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last',
            },
        },
        shell: {
            transformer: {
                command: 'node node_modules/enketo-transformer/app.js',
            },
            build: {
                command: 'node ./scripts/build.js',
            },
        },
    });

    grunt.loadNpmTasks('grunt-sass');

    grunt.registerTask('transforms', 'Creating forms.js', function () {
        const forms = {};
        const done = this.async();
        const jsonStringify = require('json-pretty');
        const formsJsPath = 'test/mock/forms.js';
        const xformsPaths = grunt.file.expand({}, 'test/forms/*.xml');
        const transformer = require('enketo-transformer');
        grunt.log.write('Transforming XForms ');
        xformsPaths
            .reduce(
                (prevPromise, filePath) =>
                    prevPromise.then(() => {
                        const xformStr = grunt.file.read(filePath);
                        grunt.log.write('.');

                        return transformer
                            .transform({ xform: xformStr })
                            .then((result) => {
                                forms[
                                    filePath.substring(
                                        filePath.lastIndexOf('/') + 1
                                    )
                                ] = {
                                    html_form: result.form,
                                    xml_model: result.model,
                                };
                            });
                    }),
                Promise.resolve()
            )
            .then(() => {
                grunt.file.write(
                    formsJsPath,
                    `export default ${jsonStringify(forms)};`
                );
                done();
            });
    });

    grunt.registerTask('compile', ['shell:build']);
    grunt.registerTask('test', [
        'transforms',
        'eslint:check',
        'compile',
        'karma:headless',
        'css',
    ]);
    grunt.registerTask('test:watch', ['transforms', 'concurrent:test']);
    grunt.registerTask('css', ['sass']);
    grunt.registerTask('server', ['connect:server:keepalive']);
    grunt.registerTask('develop', ['css', 'compile', 'concurrent:develop']);
    grunt.registerTask('default', ['css', 'compile']);
};
