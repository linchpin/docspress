<?php
/**
 * Management sentinel block.
 *
 * Every Page the DocsPress Action publishes carries a record that ties it back to its Markdown
 * source: the Page key, the source path, a content hash, the version identity, and a base64 copy
 * of the Markdown the Page was built from. The Action used to write that record as a bare HTML
 * comment at the top of the content. The block editor has no block for a bare comment, so it
 * parsed the whole thing as freeform content and showed the reader a Classic block whose body was
 * a wall of JSON — and converting that Classic block to blocks turned the record into a visible
 * paragraph, which corrupts it.
 *
 * Registering the record as a real block fixes both halves: the parser recognizes it, and the
 * editor renders the placeholder below instead of the payload. It renders nothing on the front
 * end. The record itself lives in one object attribute rather than a field per key, because the
 * Action adds keys to it (versions, sidebars, source content) and the editor drops any attribute
 * a block did not register — a flattened record would lose those keys the first time an author
 * saved the Page, and a lost hash makes the Page unmanageable.
 *
 * @package DocsPressBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Render the sentinel.
 *
 * The record is metadata for the synchronization, not content: it has no front-end output at all.
 *
 * @return string
 */
function docspress_blocks_render_sentinel() {
	return '';
}

/**
 * Register the Sentinel block.
 */
function docspress_blocks_register_sentinel() {
	$block_url = DOCSPRESS_BLOCKS_URL . 'blocks/sentinel/';

	wp_register_script(
		'docspress-sentinel-editor',
		$block_url . 'editor.js',
		array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n' ),
		DOCSPRESS_BLOCKS_VERSION,
		true
	);
	wp_register_style( 'docspress-sentinel-editor', $block_url . 'editor.css', array( 'wp-edit-blocks' ), DOCSPRESS_BLOCKS_VERSION );

	register_block_type(
		'docspress/sentinel',
		array(
			'api_version'     => 3,
			'editor_script'   => 'docspress-sentinel-editor',
			'editor_style'    => 'docspress-sentinel-editor',
			'render_callback' => 'docspress_blocks_render_sentinel',
			'attributes'      => array(
				// The whole synchronization record, verbatim.
				'sentinel' => array( 'type' => 'object' ),
				// Block-level locking. The editor adds this key to every block type on its own;
				// declaring it here keeps the lock in the markup even if that ever changes.
				'lock'     => array( 'type' => 'object' ),
			),
			'supports'        => array(
				'anchor'          => false,
				'className'       => false,
				'customClassName' => false,
				'html'            => false,
				// The Action writes this block. Nobody inserts one by hand, and a second copy on
				// one Page would make the record ambiguous.
				'inserter'        => false,
				'multiple'        => false,
				'reusable'        => false,
				// Hide the lock toggle: the Action locks the block against removal, and unlocking
				// it only lets an editor break the Page's link to its source.
				'lock'            => false,
			),
		)
	);
}
add_action( 'init', 'docspress_blocks_register_sentinel', 10 );

/**
 * Load the block's editor styles in the admin document as well as the canvas.
 *
 * Since WordPress 6.6 the editor canvas is an iframe, and a block's editor_style lands inside
 * it. The record modal renders in a portal on the admin document outside that iframe, so it
 * would otherwise open unstyled.
 */
function docspress_blocks_enqueue_sentinel_modal_style() {
	wp_enqueue_style( 'docspress-sentinel-editor' );
}
add_action( 'enqueue_block_editor_assets', 'docspress_blocks_enqueue_sentinel_modal_style' );
