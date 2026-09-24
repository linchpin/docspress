<?php
/**
 * DocsPress block theme functions.
 *
 * @package DocsPress
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Set up the block theme.
 */
function docspress_setup() {
	load_theme_textdomain( 'docspress', get_template_directory() . '/languages' );

	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'block-template-parts' );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 256,
			'width'       => 256,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);
	add_theme_support( 'editor-styles' );
	add_theme_support( 'html5', array( 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'wp-block-styles' );
	add_editor_style( 'style.css' );
}
add_action( 'after_setup_theme', 'docspress_setup' );

/**
 * Give the block editor the parent copy of every registered editor style when
 * a child theme is active.
 *
 * add_editor_style( 'style.css' ) above registers a relative file name, and
 * get_block_editor_theme_styles() resolves it with get_theme_file_path(), which
 * returns only the child theme's copy. Because every child theme ships its own
 * style.css, activating one silently replaces the parent stylesheet in the post
 * and Site Editor canvases and the documentation shell renders unstyled. The
 * classic editor's get_editor_stylesheets() already loads the parent copy ahead
 * of the child's; this mirrors that for the block editor.
 *
 * @param array<string,mixed> $settings Block editor settings.
 * @return array<string,mixed>
 */
function docspress_block_editor_parent_theme_styles( $settings ) {
	global $editor_styles;

	if ( ! is_child_theme() || empty( $editor_styles ) || ! is_array( $editor_styles ) || ! current_theme_supports( 'editor-styles' ) ) {
		return $settings;
	}

	$template_dir  = get_template_directory();
	$template_uri  = get_template_directory_uri();
	$parent_styles = array();

	foreach ( array_unique( array_filter( $editor_styles ) ) as $style ) {
		if ( ! is_string( $style ) || preg_match( '~^(https?:)?//~', $style ) ) {
			continue;
		}

		$file = $template_dir . '/' . $style;
		// When the child does not override the file, core already loaded this copy.
		if ( ! is_file( $file ) || get_theme_file_path( $style ) === $file ) {
			continue;
		}

		$css = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		if ( false === $css ) {
			continue;
		}

		$parent_styles[] = array(
			'css'            => $css,
			'baseURL'        => $template_uri . '/' . $style,
			'__unstableType' => 'theme',
			'isGlobalStyles' => false,
		);
	}

	if ( ! $parent_styles ) {
		return $settings;
	}

	$styles = isset( $settings['styles'] ) && is_array( $settings['styles'] ) ? array_values( $settings['styles'] ) : array();
	$index  = count( $styles );
	// Land ahead of the first theme (child) stylesheet so the child still cascades over the parent.
	foreach ( $styles as $position => $style ) {
		if ( is_array( $style ) && isset( $style['__unstableType'] ) && 'theme' === $style['__unstableType'] && empty( $style['isGlobalStyles'] ) ) {
			$index = $position;
			break;
		}
	}
	array_splice( $styles, $index, 0, $parent_styles );
	$settings['styles'] = $styles;

	return $settings;
}
add_filter( 'block_editor_settings_all', 'docspress_block_editor_parent_theme_styles' );

/**
 * Refresh WordPress's persistent theme.json cache after bundled style files
 * change. This matters for mounted Playground themes as well as upgrades.
 */
function docspress_maybe_refresh_theme_json_cache() {
	$files = array_merge(
		array( get_theme_file_path( 'theme.json' ) ),
		(array) glob( get_theme_file_path( 'styles/theme/*.json' ) ),
		(array) glob( get_theme_file_path( 'styles/color/*/*.json' ) ),
		(array) glob( get_theme_file_path( 'styles/block/*.json' ) )
	);
	$versions = array();

	foreach ( $files as $file ) {
		if ( is_readable( $file ) ) {
			$versions[] = $file . ':' . filemtime( $file ) . ':' . filesize( $file );
		}
	}

	$signature = md5( implode( '|', $versions ) );
	if ( get_option( 'docspress_theme_json_signature' ) === $signature ) {
		return;
	}

	if ( function_exists( 'wp_clean_theme_json_cache' ) ) {
		wp_clean_theme_json_cache();
	}
	update_option( 'docspress_theme_json_signature', $signature, false );
}
add_action( 'after_setup_theme', 'docspress_maybe_refresh_theme_json_cache', 100 );

/**
 * Check whether Post Title typography matches a retired DocsPress default.
 *
 * @param array<string,mixed> $typography Typography settings.
 * @return bool
 */
function docspress_is_legacy_post_title_typography( $typography ) {
	if ( ! is_array( $typography ) ) {
		return false;
	}

	$font_family = isset( $typography['fontFamily'] ) ? (string) $typography['fontFamily'] : '';
	$font_weight = isset( $typography['fontWeight'] ) ? (string) $typography['fontWeight'] : '';
	$legacy_locks = array(
		array( 'var:preset|font-family|ui', 'var:custom|headingWeight' ),
		array( 'var(--wp--preset--font-family--ui)', 'var(--wp--custom--heading-weight)' ),
		array( 'var:preset|font-family|inter', '700' ),
		array( 'var(--wp--preset--font-family--inter)', '700' ),
		array( 'var:preset|font-family|eb-garamond', '400' ),
		array( 'var(--wp--preset--font-family--eb-garamond)', '400' ),
		array( 'var:preset|font-family|recoleta', '400' ),
		array( 'var(--wp--preset--font-family--recoleta)', '400' ),
	);

	return in_array( array( $font_family, $font_weight ), $legacy_locks, true );
}

/**
 * Remove typography locks copied into Global Styles by older DocsPress style
 * variations so Core Post Title follows the site's Heading element settings.
 *
 * The filter is intentionally narrow: a deliberate Post Title override that
 * does not match one of the retired theme defaults is preserved.
 *
 * @param WP_Theme_JSON_Data $theme_json User-origin Global Styles data.
 * @return WP_Theme_JSON_Data
 */
function docspress_inherit_post_title_typography_from_headings( $theme_json ) {
	if ( ! $theme_json instanceof WP_Theme_JSON_Data ) {
		return $theme_json;
	}

	$data       = $theme_json->get_data();
	$typography = isset( $data['styles']['blocks']['core/post-title']['typography'] )
		? $data['styles']['blocks']['core/post-title']['typography']
		: array();

	if ( ! is_array( $typography ) ) {
		return $theme_json;
	}

	if ( ! docspress_is_legacy_post_title_typography( $typography ) ) {
		return $theme_json;
	}

	unset(
		$data['styles']['blocks']['core/post-title']['typography']['fontFamily'],
		$data['styles']['blocks']['core/post-title']['typography']['fontWeight']
	);

	if ( empty( $data['styles']['blocks']['core/post-title']['typography'] ) ) {
		unset( $data['styles']['blocks']['core/post-title']['typography'] );
	}
	if ( empty( $data['styles']['blocks']['core/post-title'] ) ) {
		unset( $data['styles']['blocks']['core/post-title'] );
	}
	if ( empty( $data['styles']['blocks'] ) ) {
		unset( $data['styles']['blocks'] );
	}

	return new WP_Theme_JSON_Data( $data, 'custom' );
}
add_filter( 'wp_theme_json_data_user', 'docspress_inherit_post_title_typography_from_headings' );

/**
 * Remove the retired Post Title typography lock from the saved Global Styles
 * post so the Site Editor canvas and REST responses inherit Headings too.
 */
function docspress_migrate_legacy_post_title_typography() {
	if (
		'1' === get_option( 'docspress_post_title_typography_migration' ) ||
		! current_user_can( 'edit_theme_options' ) ||
		! class_exists( 'WP_Theme_JSON_Resolver' )
	) {
		return;
	}

	$post_id = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
	$post    = $post_id ? get_post( $post_id ) : null;

	if ( ! $post instanceof WP_Post ) {
		update_option( 'docspress_post_title_typography_migration', '1', false );
		return;
	}

	$data       = json_decode( $post->post_content, true );
	$typography = isset( $data['styles']['blocks']['core/post-title']['typography'] )
		? $data['styles']['blocks']['core/post-title']['typography']
		: array();

	if ( docspress_is_legacy_post_title_typography( $typography ) ) {
		unset(
			$data['styles']['blocks']['core/post-title']['typography']['fontFamily'],
			$data['styles']['blocks']['core/post-title']['typography']['fontWeight']
		);

		if ( empty( $data['styles']['blocks']['core/post-title']['typography'] ) ) {
			unset( $data['styles']['blocks']['core/post-title']['typography'] );
		}
		if ( empty( $data['styles']['blocks']['core/post-title'] ) ) {
			unset( $data['styles']['blocks']['core/post-title'] );
		}
		if ( empty( $data['styles']['blocks'] ) ) {
			unset( $data['styles']['blocks'] );
		}

		wp_update_post(
			array(
				'ID'           => $post_id,
				'post_content' => wp_slash(
					wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP )
				),
			)
		);

		if ( function_exists( 'wp_clean_theme_json_cache' ) ) {
			wp_clean_theme_json_cache();
		}
	}

	update_option( 'docspress_post_title_typography_migration', '1', false );
}
add_action( 'admin_init', 'docspress_migrate_legacy_post_title_typography' );

/**
 * Give the reusable discussion shell its own meaningful template-part area.
 *
 * @param array<int,array<string,mixed>> $areas Registered areas.
 * @return array<int,array<string,mixed>>
 */
function docspress_template_part_areas( $areas ) {
	$areas[] = array(
		'area'        => 'comments',
		'area_tag'    => 'section',
		'label'       => __( 'Comments', 'docspress' ),
		'description' => __( 'Reusable discussion and reply-form layouts.', 'docspress' ),
		'icon'        => 'sidebar',
	);
	return $areas;
}
add_filter( 'default_wp_template_part_areas', 'docspress_template_part_areas' );

/**
 * Install the bundled DocsPress icon as the initial editable Site Logo.
 *
 * WordPress stores the Site Logo as a Media Library attachment. Seeding the
 * bundled PNG once lets the core Site Logo block display, replace, crop, or
 * remove it normally. The marker prevents a deliberately removed logo from
 * being restored on a later request.
 */
function docspress_maybe_seed_default_site_logo() {
	if ( get_option( 'docspress_default_site_logo_seeded' ) ) {
		return;
	}

	$current_logo_id = absint( get_option( 'site_logo' ) );
	if ( ! $current_logo_id ) {
		$current_logo_id = absint( get_theme_mod( 'custom_logo' ) );
	}

	if ( $current_logo_id && wp_attachment_is_image( $current_logo_id ) ) {
		update_option( 'docspress_default_site_logo_seeded', $current_logo_id );
		return;
	}

	$existing_default = get_posts(
		array(
			'fields'         => 'ids',
			'meta_key'       => '_docspress_default_site_logo',
			'meta_value'     => '1',
			'post_status'    => 'inherit',
			'post_type'      => 'attachment',
			'posts_per_page' => 1,
		)
	);

	if ( $existing_default ) {
		$logo_id = absint( $existing_default[0] );
	} else {
		$source = get_theme_file_path( 'assets/images/docspress-hybrid-logo.png' );
		if ( ! is_readable( $source ) ) {
			return;
		}

		$image = file_get_contents( $source );
		if ( false === $image ) {
			return;
		}

		$upload = wp_upload_bits( 'docspress-logo.png', null, $image );
		if ( ! empty( $upload['error'] ) ) {
			return;
		}

		$filetype = wp_check_filetype( $upload['file'], null );
		$logo_id  = wp_insert_attachment(
			array(
				'guid'           => $upload['url'],
				'post_mime_type' => $filetype['type'],
				'post_status'    => 'inherit',
				'post_title'     => __( 'DocsPress logo', 'docspress' ),
			),
			$upload['file']
		);

		if ( is_wp_error( $logo_id ) ) {
			return;
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		$metadata = wp_generate_attachment_metadata( $logo_id, $upload['file'] );
		if ( $metadata ) {
			wp_update_attachment_metadata( $logo_id, $metadata );
		}
		update_post_meta( $logo_id, '_wp_attachment_image_alt', __( 'DocsPress', 'docspress' ) );
		update_post_meta( $logo_id, '_docspress_default_site_logo', '1' );
	}

	update_option( 'site_logo', $logo_id );
	if ( ! absint( get_option( 'site_icon' ) ) ) {
		update_option( 'site_icon', $logo_id );
	}
	update_option( 'docspress_default_site_logo_seeded', $logo_id );
}
add_action( 'init', 'docspress_maybe_seed_default_site_logo', 20 );

/**
 * Enqueue the shared theme runtime.
 */
function docspress_assets() {
	$theme = wp_get_theme();

	wp_enqueue_style( 'docspress-style', get_stylesheet_uri(), array(), $theme->get( 'Version' ) );
	wp_enqueue_script(
		'docspress-navigation',
		get_theme_file_uri( 'assets/js/docs.js' ),
		array(),
		$theme->get( 'Version' ),
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'wp_enqueue_scripts', 'docspress_assets' );

/**
 * Label the Header, Comments, and Footer template parts in the editor's content navigator.
 */
function docspress_template_part_labels() {
	$theme       = wp_get_theme();
	$script_path = get_theme_file_path( 'assets/js/template-part-labels.js' );
	$version     = is_readable( $script_path ) ? (string) filemtime( $script_path ) : $theme->get( 'Version' );

	wp_enqueue_script(
		'docspress-template-part-labels',
		get_theme_file_uri( 'assets/js/template-part-labels.js' ),
		array( 'wp-data', 'wp-i18n' ),
		$version,
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'docspress_template_part_labels' );

/**
 * Register the core block style variations that style.css provides.
 */
function docspress_register_block_styles() {
	register_block_style( 'core/navigation', array( 'name' => 'underline', 'label' => __( 'Underline', 'docspress' ) ) );
	register_block_style( 'core/navigation', array( 'name' => 'framed', 'label' => __( 'Framed', 'docspress' ) ) );
	register_block_style( 'core/button', array( 'name' => 'text-arrow', 'label' => __( 'Text with arrow', 'docspress' ) ) );
	register_block_style( 'core/post-template', array( 'name' => 'doc-cards', 'label' => __( 'Documentation cards', 'docspress' ) ) );
}
add_action( 'init', 'docspress_register_block_styles' );

/**
 * Tell administrators when the documentation shell is unavailable.
 *
 * DocsPress Blocks registers the shell blocks this theme's templates compose. Without it, or
 * with a release older than the move, Pages render without navigation, search, breadcrumbs,
 * or a table of contents.
 */
function docspress_missing_shell_notice() {
	if ( function_exists( 'docspress_get_docs_pages' ) || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p>%s</p></div>',
		esc_html__( 'The DocsPress theme needs the DocsPress Blocks plugin for documentation navigation, search, breadcrumbs, and the table of contents. Install, activate, or update DocsPress Blocks.', 'docspress' )
	);
}
add_action( 'admin_notices', 'docspress_missing_shell_notice' );

/**
 * Keep the Site Editor Design and Styles canvases focused on the complete
 * documentation template instead of the homepage or an individual Page.
 */
function docspress_site_editor_preview_context() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'site-editor' !== $screen->id ) {
		return;
	}

	$theme       = wp_get_theme();
	$script_path = get_theme_file_path( 'assets/js/site-editor-preview.js' );
	$version     = is_readable( $script_path ) ? (string) filemtime( $script_path ) : $theme->get( 'Version' );

	wp_enqueue_script(
		'docspress-site-editor-preview',
		get_theme_file_uri( 'assets/js/site-editor-preview.js' ),
		array( 'wp-compose', 'wp-element', 'wp-hooks' ),
		$version,
		true
	);
	wp_add_inline_script(
		'docspress-site-editor-preview',
		'window.docspressSiteEditorPreview = ' . wp_json_encode(
			array(
				'archivePostId' => get_stylesheet() . '//archive',
				'postId'        => get_stylesheet() . '//page',
				'postType'      => 'wp_template',
			)
		) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'docspress_site_editor_preview_context' );

/**
 * Give a direct visit to the bare Site Editor URL a deterministic Design
 * preview before WordPress can restore another previously visited section.
 */
function docspress_redirect_site_editor_design_preview() {
	global $pagenow;

	if (
		'site-editor.php' !== $pagenow ||
		! current_user_can( 'edit_theme_options' ) ||
		isset( $_GET['p'] ) ||
		isset( $_GET['postType'] ) ||
		isset( $_GET['postId'] )
	) {
		return;
	}

	$url = add_query_arg(
		array(
			'p'        => '/',
			'postType' => 'wp_template',
			'postId'   => get_stylesheet() . '//page',
		),
		admin_url( 'site-editor.php' )
	);

	wp_safe_redirect( $url );
	exit;
}
add_action( 'admin_init', 'docspress_redirect_site_editor_design_preview' );

require get_theme_file_path( 'inc/performance.php' );
