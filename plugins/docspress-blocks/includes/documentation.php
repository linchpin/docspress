<?php
/**
 * Documentation tree, managed metadata, and source-link helpers.
 *
 * The documentation shell blocks, the llms.txt and Markdown endpoints, and themes read the
 * synchronized Page tree through these helpers. They moved here from the DocsPress theme with
 * their names unchanged, so themes and companion plugins that call them keep working.
 *
 * @package DocsPressBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Return a small inline icon.
 *
 * @param string $name Icon name.
 * @return string
 */
function docspress_icon( $name ) {
	$icons = array(
		'book'     => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.8c2.6-.7 4.9-.2 7 1.4v13c-2.1-1.6-4.4-2.1-7-1.4v-13Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M19 4.8c-2.6-.7-4.9-.2-7 1.4v13c2.1-1.6 4.4-2.1 7-1.4v-13Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
		'copy'     => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M15.5 5.5v-.3a1.7 1.7 0 0 0-1.7-1.7H5.2a1.7 1.7 0 0 0-1.7 1.7v8.6a1.7 1.7 0 0 0 1.7 1.7h.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
		'github'   => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.72 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.92c.85 0 1.69.12 2.49.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg>',
		'history'  => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 4.8V9h4.2M12 8v4.2l2.8 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		'markdown' => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M6.5 15V9l2.5 3 2.5-3v6M16 9v6m-2.2-2.2L16 15l2.2-2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		'menu'     => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
		'moon'     => '<svg class="theme-icon-dark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
		'pencil'   => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.7 5.3 4 4M5 19l2.1-5.1L16.6 4.4a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L10.1 17 5 19Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		'search'   => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
		'sun'      => '<svg class="theme-icon-light" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3.7" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
		'thumbs-up' => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 10.2 12.1 3c.5-1 2-.6 2 .5v4.2h4.1c1.4 0 2.4 1.3 2 2.7l-1.6 6.5a2.5 2.5 0 0 1-2.4 1.9H8.5V10.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 10.2h4.5v8.6H4v-8.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
		'thumbs-down' => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8.5 13.8 3.6 7.2c.5 1 2 .6 2-.5v-4.2h4.1c1.4 0 2.4-1.3 2-2.7l-1.6-6.5a2.5 2.5 0 0 0-2.4-1.9H8.5v8.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 13.8h4.5V5.2H4v8.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
	);

	return isset( $icons[ $name ] ) ? $icons[ $name ] : '';
}

/**
 * Resolve a reusable documentation root slug to a Page ID.
 *
 * @param string $root_slug Page path or slug.
 * @return int
 */
function docspress_get_docs_root_id( $root_slug = 'docs' ) {
	$root_slug = trim( sanitize_text_field( (string) $root_slug ), '/' );
	$context   = docspress_blocks_versions_page_context();
	$version   = $context && ! empty( $context['version'] )
		? $context['version']
		: docspress_blocks_versions_effective_slug();
	$root      = $context && ! empty( $context['root'] ) ? $context['root'] : $root_slug;
	$page      = $version ? docspress_blocks_versions_find_page( $version, '', $root ) : null;
	if ( $page instanceof WP_Post ) {
		return (int) $page->ID;
	}

	if ( $root_slug ) {
		$page = get_page_by_path( $root_slug, OBJECT, 'page' );
		if ( $page instanceof WP_Post && 'publish' === $page->post_status ) {
			return (int) $page->ID;
		}
	}

	if ( is_page() ) {
		$current_id = get_queried_object_id();
		$ancestors  = get_post_ancestors( $current_id );
		return $ancestors ? (int) end( $ancestors ) : (int) $current_id;
	}

	return 0;
}

/**
 * Get published Pages within a documentation tree.
 *
 * @param string $root_slug Documentation root path.
 * @param string $sort      menu_order, title, newest, or oldest.
 * @return WP_Post[]
 */
function docspress_get_docs_pages( $root_slug = 'docs', $sort = 'menu_order' ) {
	static $page_cache = array();

	$root_id = docspress_get_docs_root_id( $root_slug );
	$sort    = in_array( $sort, array( 'menu_order', 'title', 'newest', 'oldest' ), true ) ? $sort : 'menu_order';
	$key     = $root_id . ':' . $sort;
	if ( isset( $page_cache[ $key ] ) ) {
		return $page_cache[ $key ];
	}

	$options = array(
		'menu_order' => array( 'menu_order,post_title', 'ASC' ),
		'title'      => array( 'post_title', 'ASC' ),
		'newest'     => array( 'post_date', 'DESC' ),
		'oldest'     => array( 'post_date', 'ASC' ),
	);
	$pages   = get_pages(
		array(
			'post_status' => 'publish',
			'sort_column' => $options[ $sort ][0],
			'sort_order'  => $options[ $sort ][1],
		)
	);

	$context = docspress_blocks_versions_page_context();
	$version = $context && ! empty( $context['version'] )
		? $context['version']
		: docspress_blocks_versions_effective_slug();
	if ( $version ) {
		$pages = array_values(
			array_filter(
				$pages,
				static function ( $page ) use ( $version ) {
					return $version === sanitize_key( (string) get_post_meta( $page->ID, '_docspress_version_id', true ) );
				}
			)
		);
	}

	if ( ! $root_id ) {
		$page_cache[ $key ] = $pages;
		return $page_cache[ $key ];
	}

	$parents = array();
	foreach ( $pages as $page ) {
		$parents[ (int) $page->ID ] = (int) $page->post_parent;
	}

	$page_cache[ $key ] = array_values(
		array_filter(
			$pages,
			static function ( $page ) use ( $root_id, $parents ) {
				$current = (int) $page->ID;
				while ( $current ) {
					if ( $current === $root_id ) {
						return true;
					}
					$current = isset( $parents[ $current ] ) ? $parents[ $current ] : 0;
				}
				return false;
			}
		)
	);

	return $page_cache[ $key ];
}

/**
 * Group Pages by parent for linear-time navigation rendering.
 *
 * @param WP_Post[] $pages Documentation Pages.
 * @return array<int,WP_Post[]>
 */
function docspress_group_pages_by_parent( $pages ) {
	$grouped = array();
	foreach ( $pages as $page ) {
		$parent = (int) $page->post_parent;
		if ( ! isset( $grouped[ $parent ] ) ) {
			$grouped[ $parent ] = array();
		}
		$grouped[ $parent ][] = $page;
	}
	return $grouped;
}

/**
 * Read DocsPress management metadata from a Page.
 *
 * @param int $post_id Page ID.
 * @return array<string,mixed>
 */
function docspress_get_managed_metadata( $post_id = 0 ) {
	static $cache = array();

	$post_id = $post_id ? absint( $post_id ) : get_queried_object_id();
	if ( ! $post_id ) {
		return array();
	}
	if ( isset( $cache[ $post_id ] ) ) {
		return $cache[ $post_id ];
	}

	$content = (string) get_post_field( 'post_content', $post_id, 'raw' );
	$cache[ $post_id ] = array();
	if ( $content && preg_match( '/<!--\s*docspress:(.*?)\s*-->/s', $content, $matches ) ) {
		$parsed = json_decode( trim( $matches[1] ), true );
		if ( is_array( $parsed ) && 1 === (int) ( isset( $parsed['version'] ) ? $parsed['version'] : 0 ) ) {
			$cache[ $post_id ] = $parsed;
		}
	}
	return $cache[ $post_id ];
}

/**
 * Return synchronization-owned sidebar metadata for a Page.
 *
 * Registered post meta is the fast path. The sentinel fallback keeps Pages
 * published before the sidebar metadata was registered usable.
 *
 * @param int $post_id Page ID.
 * @return array{id:string,root:bool}
 */
function docspress_get_sidebar_metadata( $post_id = 0 ) {
	static $cache = array();

	$post_id = $post_id ? absint( $post_id ) : get_queried_object_id();
	if ( ! $post_id ) {
		return array( 'id' => '', 'root' => false );
	}
	if ( isset( $cache[ $post_id ] ) ) {
		return $cache[ $post_id ];
	}

	$id = sanitize_key( (string) get_post_meta( $post_id, '_docspress_sidebar_id', true ) );
	$root = metadata_exists( 'post', $post_id, '_docspress_sidebar_root' )
		? rest_sanitize_boolean( get_post_meta( $post_id, '_docspress_sidebar_root', true ) )
		: false;
	if ( ! $id ) {
		$managed = docspress_get_managed_metadata( $post_id );
		$id      = isset( $managed['sidebarId'] ) ? sanitize_key( (string) $managed['sidebarId'] ) : '';
		$root    = $id && ! empty( $managed['sidebarRoot'] );
	}

	$cache[ $post_id ] = array( 'id' => $id, 'root' => (bool) $root );
	return $cache[ $post_id ];
}

/**
 * Resolve the current Page's contextual sidebar and its root Page.
 *
 * @param int $post_id Page ID.
 * @return array{id:string,root_id:int}|null
 */
function docspress_get_sidebar_context( $post_id = 0 ) {
	$post_id = $post_id ? absint( $post_id ) : get_queried_object_id();
	$current = docspress_get_sidebar_metadata( $post_id );
	if ( ! $post_id || ! $current['id'] ) {
		return null;
	}

	$candidates = array_merge( array( $post_id ), get_post_ancestors( $post_id ) );
	foreach ( $candidates as $candidate_id ) {
		$metadata = docspress_get_sidebar_metadata( $candidate_id );
		if ( $metadata['id'] === $current['id'] && $metadata['root'] ) {
			return array( 'id' => $current['id'], 'root_id' => (int) $candidate_id );
		}
	}

	return null;
}

/**
 * Keep only Pages assigned to one source-configured sidebar.
 *
 * @param WP_Post[] $pages      Documentation Pages.
 * @param string    $sidebar_id Sidebar ID.
 * @return WP_Post[]
 */
function docspress_filter_pages_by_sidebar( $pages, $sidebar_id ) {
	$sidebar_id = sanitize_key( (string) $sidebar_id );
	if ( ! $sidebar_id ) {
		return $pages;
	}

	return array_values(
		array_filter(
			$pages,
			static function ( $page ) use ( $sidebar_id ) {
				$metadata = docspress_get_sidebar_metadata( $page->ID );
				return $metadata['id'] === $sidebar_id;
			}
		)
	);
}

/**
 * Return a Page's requested initial sidebar state.
 *
 * @param int $post_id Page ID.
 * @return bool|null
 */
function docspress_get_sidebar_collapsed( $post_id = 0 ) {
	$metadata = docspress_get_managed_metadata( $post_id );
	return array_key_exists( 'sidebarCollapsed', $metadata ) && is_bool( $metadata['sidebarCollapsed'] )
		? $metadata['sidebarCollapsed']
		: null;
}

/**
 * Render a nested Page tree.
 *
 * @param WP_Post[] $pages      Documentation Pages.
 * @param int       $parent_id  Parent ID.
 * @param int       $root_id    Root ID.
 * @param int       $level      Current level.
 * @param int       $max_depth  Maximum level, zero for unlimited.
 * @param array     $grouped    Pages grouped by parent.
 */
function docspress_render_page_tree( $pages, $parent_id = 0, $root_id = 0, $level = 1, $max_depth = 0, $grouped = null ) {
	if ( $max_depth && $level > $max_depth ) {
		return;
	}

	$grouped = null === $grouped ? docspress_group_pages_by_parent( $pages ) : $grouped;
	$children = $root_id && 0 === $parent_id
		? array_values(
			array_filter(
				$pages,
				static function ( $page ) use ( $root_id ) {
					return (int) $page->ID === $root_id;
				}
			)
		)
		: ( isset( $grouped[ $parent_id ] ) ? $grouped[ $parent_id ] : array() );

	if ( ! $children ) {
		return;
	}

	echo '<ul>';
	foreach ( $children as $page ) {
		$current   = (int) get_queried_object_id() === (int) $page->ID;
		$collapsed = docspress_get_sidebar_collapsed( $page->ID );
		printf(
			'<li data-doc-title="%1$s"><a href="%2$s"%3$s%4$s><span class="nav-dot" aria-hidden="true"></span><span>%5$s</span></a>',
			esc_attr( wp_strip_all_tags( $page->post_title ) ),
			esc_url( get_permalink( $page ) ),
			$current ? ' aria-current="page"' : '',
			null === $collapsed ? '' : ' data-sidebar-collapsed="' . ( $collapsed ? 'true' : 'false' ) . '"',
			esc_html( $page->post_title )
		);
		docspress_render_page_tree( $pages, (int) $page->ID, 0, $level + 1, $max_depth, $grouped );
		echo '</li>';
	}
	echo '</ul>';
}

/**
 * Flatten the Page tree in the same order used by navigation.
 *
 * @param WP_Post[] $pages      Documentation Pages.
 * @param int       $root_id    Root ID.
 * @param int       $parent     Parent ID.
 * @param int       $level      Current level.
 * @param int       $max_depth  Maximum level, zero for unlimited.
 * @param array     $grouped    Pages grouped by parent.
 * @return WP_Post[]
 */
function docspress_flatten_page_tree( $pages, $root_id = 0, $parent = 0, $level = 1, $max_depth = 0, $grouped = null ) {
	if ( $max_depth && $level > $max_depth ) {
		return array();
	}

	$flat     = array();
	$grouped  = null === $grouped ? docspress_group_pages_by_parent( $pages ) : $grouped;
	$children = $root_id && 0 === $parent
		? array_values(
			array_filter(
				$pages,
				static function ( $page ) use ( $root_id ) {
					return (int) $page->ID === $root_id;
				}
			)
		)
		: ( isset( $grouped[ $parent ] ) ? $grouped[ $parent ] : array() );

	foreach ( $children as $page ) {
		$flat[] = $page;
		$flat   = array_merge( $flat, docspress_flatten_page_tree( $pages, 0, (int) $page->ID, $level + 1, $max_depth, $grouped ) );
	}
	return $flat;
}

/**
 * Add stable IDs to headings and build a table of contents.
 *
 * @param string $content   Rendered content.
 * @param int    $min_level Lowest heading level.
 * @param int    $max_level Highest heading level.
 * @return array{content:string,toc:array<int,array{level:int,id:string,title:string}>}
 */
function docspress_prepare_content( $content, $min_level = 2, $max_level = 3 ) {
	$toc       = array();
	$used      = array();
	$min_level = min( 6, max( 1, absint( $min_level ) ) );
	$max_level = min( 6, max( $min_level, absint( $max_level ) ) );

	$content = preg_replace_callback(
		'/<h([1-6])([^>]*)>(.*?)<\/h\1>/is',
		static function ( $matches ) use ( &$toc, &$used, $min_level, $max_level ) {
			$level = (int) $matches[1];
			if ( $level < $min_level || $level > $max_level ) {
				return $matches[0];
			}

			$attributes = $matches[2];
			$inner      = $matches[3];
			$title      = trim( wp_strip_all_tags( $inner ) );
			if ( '' === $title ) {
				return $matches[0];
			}

			$id = preg_match( '/\sid=(["\'])(.*?)\1/i', $attributes, $id_match )
				? sanitize_title( $id_match[2] )
				: sanitize_title( $title );
			$id = $id ? $id : 'section';
			$base = $id;
			$index = 2;
			while ( isset( $used[ $id ] ) ) {
				$id = $base . '-' . $index++;
			}
			$used[ $id ] = true;

			if ( ! preg_match( '/\sid=(["\'])(.*?)\1/i', $attributes ) ) {
				$attributes .= ' id="' . esc_attr( $id ) . '"';
			}
			$toc[] = array(
				'level' => $level,
				'id'    => $id,
				'title' => $title,
			);
			return '<h' . $level . $attributes . '>' . $inner . '</h' . $level . '>';
		},
		(string) $content
	);

	return array(
		'content' => $content,
		'toc'     => $toc,
	);
}

/**
 * Add heading anchors to the Post Content block used by documentation pages.
 *
 * @param string $block_content Rendered block.
 * @return string
 */
function docspress_post_content_anchors( $block_content ) {
	return is_page() ? docspress_prepare_content( $block_content, 2, 6 )['content'] : $block_content;
}
add_filter( 'render_block_core/post-content', 'docspress_post_content_anchors' );

/**
 * Return the documentation version terms and the current Page's version.
 *
 * @return array{terms:WP_Term[],current:int}
 */
function docspress_get_versions() {
	$terms   = docspress_blocks_versions_terms();
	$context = docspress_blocks_versions_page_context();
	$current = $context && ! empty( $context['term'] ) ? (int) $context['term']->term_id : 0;
	return array( 'terms' => $terms, 'current' => $current );
}

/**
 * Normalize a repository-relative Markdown source path.
 *
 * @param mixed $source Untrusted source path.
 * @return string
 */
function docspress_normalize_markdown_source_path( $source ) {
	if ( ! is_string( $source ) ) {
		return '';
	}

	$source = trim( str_replace( '\\', '/', wp_strip_all_tags( $source ) ) );
	if ( '' === $source || '/' === $source[0] || false !== strpos( $source, ':' ) || false !== strpos( $source, "\0" ) ) {
		return '';
	}
	foreach ( explode( '/', $source ) as $segment ) {
		if ( '' === $segment || '.' === $segment || '..' === $segment ) {
			return '';
		}
	}
	return preg_match( '/\.(?:md|markdown|mdx)$/i', $source ) ? $source : '';
}

/**
 * Read the exact synchronized Markdown source path.
 *
 * @param int $post_id Page ID.
 * @return string
 */
function docspress_get_markdown_source_path( $post_id = 0 ) {
	$post_id  = $post_id ? absint( $post_id ) : get_queried_object_id();
	$metadata = docspress_get_managed_metadata( $post_id );
	$source   = isset( $metadata['source'] ) ? $metadata['source'] : '';
	if ( ! $source && $post_id ) {
		$source = get_post_meta( $post_id, '_docspress_source_path', true );
	}
	$source = apply_filters( 'docspress_markdown_source_path', $source, $post_id, $metadata );
	return docspress_normalize_markdown_source_path( $source );
}

/**
 * Read the GitHub source metadata written by the synchronization Action.
 *
 * @param int $post_id Page ID.
 * @return array{path:string,repository:string,ref:string,server_url:string}
 */
function docspress_get_github_source( $post_id = 0 ) {
	$post_id = $post_id ? absint( $post_id ) : get_queried_object_id();
	$source  = array(
		'path'       => docspress_get_markdown_source_path( $post_id ),
		'repository' => $post_id ? (string) get_post_meta( $post_id, '_docspress_github_repository', true ) : '',
		'ref'        => $post_id ? (string) get_post_meta( $post_id, '_docspress_github_ref', true ) : '',
		'server_url' => $post_id ? (string) get_post_meta( $post_id, '_docspress_github_server_url', true ) : '',
	);
	if ( ! $source['path'] && $post_id ) {
		$source['path'] = docspress_normalize_markdown_source_path( get_post_meta( $post_id, '_docspress_github_path', true ) );
	}

	/**
	 * Filter the GitHub source metadata used to build source links.
	 *
	 * @param array{path:string,repository:string,ref:string,server_url:string} $source  Source metadata.
	 * @param int                                                              $post_id Page ID.
	 */
	$source = apply_filters( 'docspress_github_source', $source, $post_id );
	if ( ! is_array( $source ) ) {
		return array( 'path' => '', 'repository' => '', 'ref' => '', 'server_url' => '' );
	}
	return array(
		'path'       => isset( $source['path'] ) ? (string) $source['path'] : '',
		'repository' => isset( $source['repository'] ) ? (string) $source['repository'] : '',
		'ref'        => isset( $source['ref'] ) ? (string) $source['ref'] : '',
		'server_url' => isset( $source['server_url'] ) ? (string) $source['server_url'] : '',
	);
}

/**
 * Normalize a repository reference into a browsable repository URL.
 *
 * Accepts a full repository URL or an `owner/name` pair combined with a server URL.
 *
 * @param string $repository Repository URL or `owner/name` pair.
 * @param string $server_url GitHub server URL used with an `owner/name` pair.
 * @return string
 */
function docspress_normalize_repository_url( $repository, $server_url = '' ) {
	$repository = trim( (string) $repository );
	if ( '' === $repository ) {
		return '';
	}

	if ( ! preg_match( '#^[a-z][a-z0-9+.-]*://#i', $repository ) ) {
		if ( ! preg_match( '#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repository ) ) {
			return '';
		}
		$server_url = trim( (string) $server_url );
		$repository = untrailingslashit( '' !== $server_url ? $server_url : 'https://github.com' ) . '/' . $repository;
	}

	$repository = preg_replace( '/\.git$/i', '', untrailingslashit( esc_url_raw( $repository ) ) );
	$parts      = wp_parse_url( (string) $repository );
	if (
		! $repository ||
		! is_array( $parts ) ||
		empty( $parts['scheme'] ) ||
		empty( $parts['host'] ) ||
		! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ||
		isset( $parts['user'] ) ||
		isset( $parts['pass'] ) ||
		isset( $parts['query'] ) ||
		isset( $parts['fragment'] )
	) {
		return '';
	}
	return $repository;
}

/**
 * Build a GitHub editor URL for the current Markdown source.
 *
 * Each Page records the repository it was published from, so one WordPress install
 * can hold documentation synchronized from several repositories. The arguments only
 * supply a fallback for Pages that record no repository of their own; use the
 * `docspress_github_source` filter to reroute Pages that do record one.
 *
 * @param int    $post_id    Page ID.
 * @param string $repository Fallback repository URL or `owner/name` pair.
 * @param string $ref        Fallback branch or tag.
 * @return string
 */
function docspress_get_github_edit_url( $post_id = 0, $repository = '', $ref = '' ) {
	$post_id = $post_id ? absint( $post_id ) : get_queried_object_id();
	$source  = docspress_get_github_source( $post_id );
	$path    = docspress_normalize_markdown_source_path( $source['path'] );
	if ( ! $path ) {
		return '';
	}

	$resolved = docspress_normalize_repository_url( $source['repository'], $source['server_url'] );
	if ( $resolved ) {
		$ref = trim( $source['ref'] );
	} else {
		$resolved = docspress_normalize_repository_url( $repository );
		$ref      = trim( (string) $ref );
	}
	if ( ! $resolved ) {
		return '';
	}

	if ( '' === $ref || ! preg_match( '#^[A-Za-z0-9._/-]+$#', $ref ) || false !== strpos( $ref, '..' ) ) {
		$ref = 'main';
	}
	$encoded = implode( '/', array_map( 'rawurlencode', explode( '/', $path ) ) );
	$url     = $resolved . '/edit/' . rawurlencode( $ref ) . '/' . $encoded;

	/**
	 * Filter the GitHub editor URL for a managed Page.
	 *
	 * @param string $url     GitHub editor URL.
	 * @param string $path    Repository-relative source path.
	 * @param int    $post_id Page ID.
	 */
	return (string) apply_filters( 'docspress_github_edit_url', $url, $path, $post_id );
}
