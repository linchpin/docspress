<?php
/**
 * Admin list screen for the Pages List module.
 *
 * @package DocsPressBlocks\Modules\Pages_List
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules\Pages_List;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class List_Screen
 *
 * @since 1.0.1
 */
class List_Screen {

	/**
	 * Admin page slug.
	 *
	 * @since 1.0.1
	 *
	 * @var string
	 */
	const PAGE_SLUG = 'docspress-pages';

	/**
	 * Query argument that restores the classic Pages table.
	 *
	 * @since 1.0.1
	 *
	 * @var string
	 */
	const CLASSIC = 'classic';

	/**
	 * Module instance.
	 *
	 * @since 1.0.1
	 *
	 * @var Pages_List_Module
	 */
	private $module;

	/**
	 * Hook suffix from add_submenu_page().
	 *
	 * @since 1.0.1
	 *
	 * @var string
	 */
	private $page_hook = '';

	/**
	 * Missing script handles, if any.
	 *
	 * @since 1.0.1
	 *
	 * @var string[]
	 */
	private $missing_dependencies = array();

	/**
	 * Register list screen hooks.
	 *
	 * @since 1.0.1
	 *
	 * @param Pages_List_Module $module Module.
	 * @return void
	 */
	public static function register( Pages_List_Module $module ) {
		$screen = new self( $module );
		$screen->hooks();
	}

	/**
	 * Constructor.
	 *
	 * @since 1.0.1
	 *
	 * @param Pages_List_Module $module Module.
	 */
	private function __construct( Pages_List_Module $module ) {
		$this->module = $module;
	}

	/**
	 * DataViews list URL.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public static function url() {
		return add_query_arg(
			array(
				'post_type' => 'page',
				'page'      => self::PAGE_SLUG,
			),
			admin_url( 'edit.php' )
		);
	}

	/**
	 * Classic Pages table URL.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public static function classic_url() {
		return add_query_arg(
			array(
				'post_type'   => 'page',
				self::CLASSIC => '1',
			),
			admin_url( 'edit.php' )
		);
	}

	/**
	 * Hook admin menu, redirect, and assets.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	private function hooks() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ), 15 );
		add_action( 'load-edit.php', array( $this, 'redirect_list' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Register the submenu and retire core's All Pages item.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function add_admin_menu() {
		$this->page_hook = (string) add_submenu_page(
			'edit.php?post_type=page',
			__( 'Pages', 'docspress-blocks' ),
			__( 'All Pages', 'docspress-blocks' ),
			'edit_pages',
			self::PAGE_SLUG,
			array( $this, 'render' ),
			0
		);

		remove_submenu_page( 'edit.php?post_type=page', 'edit.php?post_type=page' );
	}

	/**
	 * Redirect edit.php?post_type=page to the DataViews screen.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function redirect_list() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only routing.
		$query = wp_unslash( $_GET );

		$post_type = isset( $query['post_type'] ) ? sanitize_key( $query['post_type'] ) : 'post';
		if ( 'page' !== $post_type ) {
			return;
		}

		$page    = isset( $query['page'] ) && is_scalar( $query['page'] ) ? (string) $query['page'] : '';
		$classic = isset( $query[ self::CLASSIC ] ) && is_scalar( $query[ self::CLASSIC ] )
			? (string) $query[ self::CLASSIC ]
			: '';

		if ( '' !== $page || '' !== $classic ) {
			return;
		}

		wp_safe_redirect( self::url() );
		exit;
	}

	/**
	 * Mount point for the React app.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function render() {
		if ( ! current_user_can( 'edit_pages' ) ) {
			wp_die( esc_html__( 'You do not have permission to edit Pages.', 'docspress-blocks' ) );
		}
		?>
		<div class="wrap docspress-pages-list-notices">
			<hr class="wp-header-end" />
		</div>
		<div id="docspress-pages-list" class="docspress-pages-list-root">
			<p><?php esc_html_e( 'Loading pages…', 'docspress-blocks' ); ?></p>
		</div>
		<?php
	}

	/**
	 * Enqueue the module's DataViews bundle on its screen only.
	 *
	 * @since 1.0.1
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function enqueue( $hook ) {
		if ( '' === $this->page_hook || $hook !== $this->page_hook ) {
			return;
		}

		$asset_path = DOCSPRESS_BLOCKS_PATH . 'build/pages-list.asset.php';
		if ( ! file_exists( $asset_path ) ) {
			add_action( 'admin_notices', array( $this, 'missing_build_notice' ) );
			return;
		}

		$asset = require $asset_path;
		$deps  = isset( $asset['dependencies'] ) && is_array( $asset['dependencies'] ) ? $asset['dependencies'] : array();

		foreach ( array( 'wp-theme', 'wp-private-apis', 'wp-warning' ) as $optional ) {
			if ( in_array( $optional, $deps, true ) && ! wp_script_is( $optional, 'registered' ) ) {
				wp_register_script( $optional, false, array(), DOCSPRESS_BLOCKS_VERSION );
			}
		}

		$this->missing_dependencies = array_values(
			array_filter(
				$deps,
				static function ( $handle ) {
					return ! wp_script_is( $handle, 'registered' );
				}
			)
		);

		if ( array() !== $this->missing_dependencies ) {
			add_action( 'admin_notices', array( $this, 'missing_deps_notice' ) );
			return;
		}

		$version = isset( $asset['version'] ) ? $asset['version'] : DOCSPRESS_BLOCKS_VERSION;

		wp_enqueue_style(
			'docspress-pages-list',
			DOCSPRESS_BLOCKS_URL . 'build/style-pages-list.css',
			array( 'wp-components' ),
			$version
		);

		wp_enqueue_script(
			'docspress-pages-list',
			DOCSPRESS_BLOCKS_URL . 'build/pages-list.js',
			$deps,
			$version,
			true
		);

		$version_terms = array();
		foreach ( docspress_blocks_versions_terms( false ) as $term ) {
			$version_terms[] = array(
				'value'  => $term->slug,
				'label'  => $term->name,
				'latest' => $term->slug === docspress_blocks_versions_effective_slug(),
				'active' => rest_sanitize_boolean( get_term_meta( $term->term_id, 'docspress_version_active', true ) ),
			);
		}

		wp_add_inline_script(
			'docspress-pages-list',
			'window.docspressPagesList = ' . wp_json_encode(
				array(
					'restPath'       => '/docspress/v1/admin/pages',
					'newUrl'         => admin_url( 'post-new.php?post_type=page' ),
					'classicUrl'     => self::classic_url(),
					'settingsUrl'    => admin_url( 'options-general.php?page=docspress-versions' ),
					'hasGithubPaths' => docspress_blocks_versions_has_github_paths(),
					'versions'       => $version_terms,
					'statuses'       => REST_Controller::status_elements(),
					'module'         => $this->module->get_id(),
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Notice when the built asset is missing.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function missing_build_notice() {
		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html__( 'The Modern Pages list cannot load: build/pages-list.js is missing. Run npm run build inside plugins/docspress-blocks.', 'docspress-blocks' )
		);
	}

	/**
	 * Notice when a script dependency is not registered.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function missing_deps_notice() {
		if ( array() === $this->missing_dependencies ) {
			return;
		}

		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html(
				sprintf(
					/* translators: %s: comma-separated script handles. */
					__( 'The Modern Pages list cannot load: WordPress has no script registered for %s. Open the classic Pages table, or update WordPress / Gutenberg.', 'docspress-blocks' ),
					implode( ', ', $this->missing_dependencies )
				)
			)
		);
	}
}
