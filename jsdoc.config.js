'use strict';

module.exports = {
    opts: {
        encoding: 'utf8',
        destination: './docs/',
        tutorials: './tutorials',
        recurse: true,
        package: 'package.json',
        readme: 'README.md',
        verbose: true
    },
    plugins: ['plugins/markdown'],
    source: {
        include: [
            'src'
        ]
    },
    templates: {
        cleverLinks: true,
        monospaceLinks: true
    }
};
