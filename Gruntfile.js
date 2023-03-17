/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 */
const fs = require('fs');
const path = require('path');
const nodeSass = require('node-sass');
const transformer = require('enketo-transformer');

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

    const karmaWatchOptions = {
        autoWatch: true,
        client: {
            mocha: {
                timeout: Number.MAX_SAFE_INTEGER,
            },
        },
        reporters: ['dots'],
        singleRun: false,
    };

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
                    base: ['test/forms', 'test/mock', 'test/temp', 'build'],
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
                files: [
                    'config.json',
                    '*.js',
                    'src/**/*.js',
                    'test/mock/forms.mjs',
                ],
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
                options: karmaWatchOptions,
            },
            watchBrowsers: {
                browsers: ['Chrome', 'Firefox', 'Safari'],
                options: karmaWatchOptions,
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

    /**
     * @param {string} path
     */
    const fileExists = (path) => {
        const stat = fs.statSync(path, {
            throwIfNoEntry: false,
        });

        return stat != null;
    };

    grunt.registerTask(
        'transforms',
        'Creating forms.js',
        async function transformsTask() {
            const forms = {};
            const done = this.async();
            const formsJsPath = './test/mock/forms.js';
            const formsESMPath = './test/mock/forms.mjs';
            const xformsPaths = grunt.file.expand({}, 'test/forms/*.xml');
            grunt.log.write('Transforming XForms ');

            let currentForms;

            const jsModuleExists = fileExists(formsJsPath);

            if (!jsModuleExists) {
                fs.mkdirSync(path.dirname(formsJsPath), {
                    recursive: true,
                });
                fs.writeFileSync(formsJsPath, 'export default {}');
            }

            const esmLinkExists = fileExists(formsESMPath);

            if (!esmLinkExists) {
                fs.linkSync(formsJsPath, formsESMPath);
            }

            try {
                // This needs to be dynamic in case forms change during watch mode.
                // eslint-disable-next-line import/no-dynamic-require, global-require
                currentForms = (await import(formsESMPath)).default;
            } catch (error) {
                currentForms = {};
            }

            for await (const filePath of xformsPaths) {
                const formsKey = filePath.substring(
                    filePath.lastIndexOf('/') + 1
                );
                const current = currentForms[formsKey];
                const { mtimeMs } = fs.statSync(filePath);
                const modifiedTime = Math.floor(mtimeMs);

                if (
                    current?.modifiedTime != null &&
                    modifiedTime <= current.modifiedTime
                ) {
                    forms[formsKey] = current;

                    continue;
                }

                const xformStr = grunt.file.read(filePath);
                grunt.log.write('.');

                const result = await transformer.transform({ xform: xformStr });

                forms[formsKey] = {
                    modifiedTime,
                    html_form: result.form,
                    xml_model: result.model,
                };
            }

            fs.writeFileSync(
                formsJsPath,
                `export default ${JSON.stringify(forms, null, 2)};`
            );

            done();
        }
    );

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
    grunt.registerTask('develop', [
        'css',
        'compile',
        'transforms',
        'concurrent:develop',
    ]);
    grunt.registerTask('default', ['css', 'compile']);
};
