<?php
/**
 * Plugin Name:       DocsPress Blocks
 * Plugin URI:        https://github.com/Automattic/docspress/tree/main/plugins/docspress-blocks
 * Description:       Documentation-focused Gutenberg blocks for interactive API examples, schemas, code playgrounds, diagrams, troubleshooting, prompts, flows, and polished documentation layouts, plus the documentation shell: navigation, search, breadcrumbs, table of contents, Page feedback, and llms.txt.
 * x-release-please-start-version
 * Version:           1.3.0
 * x-release-please-end
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       docspress-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// x-release-please-start-version
define( 'DOCSPRESS_BLOCKS_VERSION', '1.3.0' );
// x-release-please-end
define( 'DOCSPRESS_BLOCKS_FILE', __FILE__ );
define( 'DOCSPRESS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'DOCSPRESS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

/**
 * Design tools shared by every DocsPress block.
 *
 * These map directly to the Block Editor's Styles panel. Content-specific
 * options remain in each block's inspector while colors, typography, spacing,
 * borders, dimensions, and positioning use native WordPress controls.
 *
 * @param array<int,string>|false $align Optional supported alignments.
 * @return array<string,mixed>
 */
function docspress_blocks_design_supports( $align = false ) {
	$supports = array(
		'anchor'     => true,
		'html'       => false,
		'className'  => true,
		'color'      => array(
			'background' => true,
			'gradients'  => true,
			'link'       => true,
			'text'       => true,
		),
		'spacing'    => array(
			'blockGap' => true,
			'margin'   => true,
			'padding'  => true,
		),
		'typography' => array(
			'fontFamily'    => true,
			'fontSize'      => true,
			'fontStyle'     => true,
			'fontWeight'    => true,
			'letterSpacing' => true,
			'lineHeight'    => true,
			'textDecoration' => true,
			'textTransform' => true,
		),
		'border'     => array(
			'color'  => true,
			'radius' => true,
			'style'  => true,
			'width'  => true,
		),
		'dimensions' => array(
			'minHeight' => true,
		),
		'position'   => array(
			'sticky' => true,
		),
		'shadow'     => true,
	);

	if ( $align ) {
		$supports['align'] = $align;
	}

	return $supports;
}

require_once DOCSPRESS_BLOCKS_PATH . 'includes/code-surface.php';
require_once DOCSPRESS_BLOCKS_PATH . 'includes/versioning.php';
require_once DOCSPRESS_BLOCKS_PATH . 'includes/modules.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/sentinel/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/version-switcher/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/version-notice/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/hero/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/audience-paths/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/colorful-code/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/code-tabs/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/callout/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/api-request/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/terminal-session/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/result/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/symbol/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/flow/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/file-tree/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/prompt/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/fields/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/code-playground/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/diagram/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'blocks/troubleshooter/block.php';
require_once DOCSPRESS_BLOCKS_PATH . 'includes/patterns.php';

/**
 * Load the documentation shell: the Page-tree and source-link helpers, the shell blocks the
 * DocsPress theme's templates compose, and the llms.txt and Markdown endpoints.
 *
 * The shell moved here from the DocsPress theme with its function names unchanged, so themes
 * and companion plugins that call those functions keep working. A theme released before the
 * move still declares them, and redeclaring a function is fatal, so the shell stands aside while
 * such a theme is active. after_setup_theme runs once the theme's functions.php has loaded and
 * before init, so every hook the shell adds is still in time.
 */
function docspress_blocks_load_documentation_shell() {
	if ( function_exists( 'docspress_get_docs_pages' ) ) {
		return;
	}

	require_once DOCSPRESS_BLOCKS_PATH . 'includes/documentation.php';
	require_once DOCSPRESS_BLOCKS_PATH . 'includes/shell-blocks.php';
	require_once DOCSPRESS_BLOCKS_PATH . 'includes/llms.php';
}
add_action( 'after_setup_theme', 'docspress_blocks_load_documentation_shell', 0 );

/**
 * Flush the llms.txt and Markdown routes on the first request after activation.
 *
 * An activation request includes this file after after_setup_theme has run, so the shell has not
 * registered its routes yet and a flush here would drop them. Clearing the marker lets
 * docspress_maybe_flush_llms_rewrite_rules() flush on the next request, once they exist.
 */
function docspress_blocks_schedule_llms_rewrite_flush() {
	delete_option( 'docspress_llms_rewrite_version' );
}
register_activation_hook( DOCSPRESS_BLOCKS_FILE, 'docspress_blocks_schedule_llms_rewrite_flush' );

/**
 * Register the small shared layer used by multiple block folders.
 */
function docspress_blocks_register_shared_assets() {
	$asset_url = DOCSPRESS_BLOCKS_URL . 'assets/';

	wp_register_script(
		'docspress-blocks-editor-shared',
		$asset_url . 'editor-shared.js',
		array( 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n' ),
		DOCSPRESS_BLOCKS_VERSION,
		true
	);

	wp_add_inline_script(
		'docspress-blocks-editor-shared',
		'window.docspressBlocksSettings = ' . wp_json_encode(
			array(
				'preset' => 'site-editor',
				'tokens' => array(),
			)
		) . ';',
		'before'
	);

	wp_register_script(
		'docspress-blocks-view',
		$asset_url . 'view.js',
		array(),
		DOCSPRESS_BLOCKS_VERSION,
		true
	);

	wp_register_style(
		'docspress-blocks-code',
		$asset_url . 'code.css',
		array(),
		DOCSPRESS_BLOCKS_VERSION
	);

	wp_register_style(
		'docspress-blocks-code-editor',
		$asset_url . 'code-editor.css',
		array( 'wp-edit-blocks', 'docspress-blocks-code' ),
		DOCSPRESS_BLOCKS_VERSION
	);
}
add_action( 'init', 'docspress_blocks_register_shared_assets', 5 );
