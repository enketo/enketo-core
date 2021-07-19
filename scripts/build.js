/* eslint-env node */

const alias = require( 'esbuild-plugin-alias' );
const esbuild = require( 'esbuild' );
const path = require( 'path' );
const pkg = require( '../package.json' );

const isProduction = process.env.NODE_ENV === 'production';

const aliases = Object.fromEntries(
    Object.entries( pkg.browser ).map( ( [ key, value ] ) => (
        [ key, path.resolve( process.cwd(), value ).replace( /(\.js)?$/, '.js' ) ]
    ) )
);

esbuild.build( {
    assetNames: '[name]',
    bundle: true,
    entryPoints: [ 'src/index.html', 'app.js' ],
    format: 'iife',
    loader: { '.html': 'file' },
    minify: isProduction,
    outdir: 'build',
    plugins: [
        alias( aliases )
    ],
    sourcemap: isProduction ? false : 'inline',
    target: [
        'chrome89',
        'edge89',
        'firefox90',
        'safari13',
    ],
} );
