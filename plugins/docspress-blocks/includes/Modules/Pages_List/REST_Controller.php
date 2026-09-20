<?php
/**
 * REST feed for the Pages List module.
 *
 * @package DocsPressBlocks\Modules\Pages_List
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules\Pages_List;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_Post;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Class REST_Controller
 *
 * @since 1.0.1
 */
class REST_Controller {

	/**
	 * Register the list route.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public static function register() {
		$controller = new self();
		add_action( 'rest_api_init', array( $controller, 'register_routes' ) );
	}

	/**
	 * Register routes.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			'docspress/v1',
			'/admin/pages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_pages' ),
				'permission_callback' => static function () {
					return current_user_can( 'edit_pages' );
				},
			)
		);
	}

	/**
	 * Post statuses the documentation tree never shows.
	 *
	 * A trashed page keeps its post_parent, so including trash would thread
	 * deleted pages back into the hierarchy between live ones. Restoring one is
	 * a classic-table job, and the header links there.
	 *
	 * @since 1.0.1
	 *
	 * @return string[]
	 */
	private static function excluded_statuses() {
		return array( 'auto-draft', 'trash' );
	}

	/**
	 * Status filter elements for DataViews.
	 *
	 * @since 1.0.1
	 *
	 * @return array<int,array{value:string,label:string}>
	 */
	public static function status_elements() {
		$statuses = get_post_stati( array( 'show_in_admin_status_list' => true ), 'objects' );
		$elements = array();
		foreach ( $statuses as $name => $status ) {
			if ( in_array( $name, self::excluded_statuses(), true ) ) {
				continue;
			}
			$elements[] = array(
				'value' => (string) $name,
				'label' => isset( $status->label ) ? (string) $status->label : (string) $name,
			);
		}
		return $elements;
	}

	/**
	 * Build hierarchical page rows for DataViews.
	 *
	 * @since 1.0.1
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function get_pages( $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter
		$posts = get_posts(
			array(
				'post_type'              => 'page',
				'post_status'            => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page'         => -1,
				'orderby'                => array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				),
				'order'                  => 'ASC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$by_parent = array();
		foreach ( $posts as $post ) {
			$parent = (int) $post->post_parent;
			if ( ! isset( $by_parent[ $parent ] ) ) {
				$by_parent[ $parent ] = array();
			}
			$by_parent[ $parent ][] = $post;
		}

		$rows = array();
		$this->flatten( $by_parent, 0, 0, $rows );

		$child_counts = array();
		foreach ( $rows as $row ) {
			$parent_id = (int) $row['parent'];
			if ( $parent_id > 0 ) {
				if ( ! isset( $child_counts[ $parent_id ] ) ) {
					$child_counts[ $parent_id ] = 0;
				}
				++$child_counts[ $parent_id ];
			}
		}
		foreach ( $rows as &$row ) {
			$row['hasChildren'] = ! empty( $child_counts[ (int) $row['id'] ] );
			$row['childCount']  = isset( $child_counts[ (int) $row['id'] ] ) ? (int) $child_counts[ (int) $row['id'] ] : 0;
		}
		unset( $row );

		return rest_ensure_response(
			array(
				'pages' => $rows,
			)
		);
	}

	/**
	 * Depth-first flatten of the page tree.
	 *
	 * @since 1.0.1
	 *
	 * @param array<int,WP_Post[]>           $by_parent Children keyed by parent ID.
	 * @param int                            $parent_id Current parent.
	 * @param int                            $level     Hierarchy level.
	 * @param array<int,array<string,mixed>> $rows      Accumulator.
	 * @return void
	 */
	private function flatten( $by_parent, $parent_id, $level, &$rows ) {
		if ( empty( $by_parent[ $parent_id ] ) ) {
			return;
		}

		foreach ( $by_parent[ $parent_id ] as $post ) {
			$rows[] = $this->shape_row( $post, $level );
			$this->flatten( $by_parent, (int) $post->ID, $level + 1, $rows );
		}
	}

	/**
	 * Shape one page into a DataViews row.
	 *
	 * @since 1.0.1
	 *
	 * @param WP_Post $post  Page.
	 * @param int     $level Hierarchy level (0 = root).
	 * @return array<string,mixed>
	 */
	private function shape_row( $post, $level ) {
		$author        = get_userdata( (int) $post->post_author );
		$status_object = get_post_status_object( $post->post_status );

		$version_label     = '';
		$version_slug      = '';
		$version_latest    = false;
		$version_active    = true;
		$version_container = (bool) get_post_meta( $post->ID, '_docspress_version_container', true );

		$context = docspress_blocks_versions_page_context( $post->ID );
		if ( $context ) {
			$version_slug   = $context['version'];
			$version_label  = $context['label'];
			$version_latest = ! empty( $context['latest'] );
			$version_active = rest_sanitize_boolean( get_term_meta( $context['term']->term_id, 'docspress_version_active', true ) );
		} elseif ( $version_container ) {
			$version_label = __( 'All versions', 'docspress-blocks' );
			$version_slug  = '__all__';
		}

		$github_path = '';
		$github_url  = '';
		$source      = docspress_blocks_versions_github_source( $post->ID );
		if ( $source ) {
			$github_path = $source['path'];
			$github_url  = $source['url'];
		}

		return array(
			'id'               => (int) $post->ID,
			'parent'           => (int) $post->post_parent,
			'level'            => (int) $level,
			'title'            => html_entity_decode( get_the_title( $post ), ENT_QUOTES, get_bloginfo( 'charset' ) ),
			'status'           => $post->post_status,
			'statusLabel'      => $status_object ? $status_object->label : $post->post_status,
			'author'           => $author ? $author->display_name : '',
			'authorId'         => (int) $post->post_author,
			'date'             => get_post_datetime( $post ) ? get_post_datetime( $post )->format( 'c' ) : '',
			'dateFormatted'    => get_the_date( '', $post ) . ' ' . get_the_time( '', $post ),
			'editUrl'          => get_edit_post_link( $post->ID, 'raw' ),
			'viewUrl'          => get_permalink( $post ),
			'version'          => $version_slug,
			'versionLabel'     => $version_label,
			'versionLatest'    => $version_latest,
			'versionActive'    => $version_active,
			'versionContainer' => $version_container,
			'githubPath'       => $github_path,
			'githubUrl'        => $github_url,
			'menuOrder'        => (int) $post->menu_order,
		);
	}
}
