/**
 * Webpack entries for DocsPress Blocks modules.
 *
 * One entry per admin/module bundle under src/modules/. Blocks themselves stay
 * hand-authored JS beside their PHP until they need a compile step.
 */
const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		'pages-list': path.resolve(
			__dirname,
			'src/modules/pages-list/index.js'
		),
	},
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'build' ),
	},
};
