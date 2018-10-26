import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'app.js',
    output: {
        file: 'build/js/enketo-bundle.js',
        format: 'iife'
    },
    plugins: [
        resolve( {
            module: true, // Default: true
            main: true, // Default: true
            browser: true, // Default: false
        } ),
        commonjs( {
            include: 'node_modules/**', // Default: undefined
            sourceMap: false, // Default: true
        } )
    ]
};
