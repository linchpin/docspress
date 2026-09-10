<?php
/**
 * Shared code rendering helpers.
 *
 * @package DocsPressBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Return a value only when it is in the allow-list.
 *
 * @param string $value    Candidate value.
 * @param array  $allowed  Allowed values.
 * @param string $fallback Fallback value.
 * @return string
 */
function docspress_blocks_allowed_value( $value, $allowed, $fallback ) {
	$value = sanitize_key( (string) $value );
	return in_array( $value, $allowed, true ) ? $value : $fallback;
}

/**
 * Resolve a fence language onto the set the highlighter knows.
 *
 * One list, used by every block that renders code. It used to be written out twice — here
 * and in the Code Tabs block — so extending one silently left the other behind.
 *
 * Aliases are resolved rather than rejected. `ts`, `js` and `console` are what authors
 * actually type, and falling back to plaintext turned a highlighted sample into a grey one
 * with nothing to say why.
 *
 * @param string $value Candidate language.
 * @return string
 */
function docspress_blocks_code_language( $value ) {
	$aliases = array(
		'c++'            => 'cpp',
		'console'        => 'bash',
		'js'             => 'javascript',
		'md'             => 'markdown',
		'node'           => 'javascript',
		'sh'             => 'bash',
		'shell-session'  => 'bash',
		'text'           => 'plaintext',
		'ts'             => 'typescript',
		'txt'            => 'plaintext',
		'yml'            => 'yaml',
		'zsh'            => 'bash',
	);

	$value = strtolower( trim( (string) $value ) );
	if ( isset( $aliases[ $value ] ) ) {
		$value = $aliases[ $value ];
	}

	return docspress_blocks_allowed_value( $value, docspress_blocks_code_languages(), 'plaintext' );
}

/**
 * Languages the code surface can highlight.
 *
 * @return array
 */
function docspress_blocks_code_languages() {
	return array(
		'bash',
		'cpp',
		'css',
		'diff',
		'html',
		'http',
		'ini',
		'javascript',
		'json',
		'jsx',
		'markdown',
		'php',
		'plaintext',
		'python',
		'scss',
		'shell',
		'sql',
		'toml',
		'tsx',
		'twig',
		'typescript',
		'xml',
		'yaml',
	);
}

/**
 * Restore HTML-sensitive source characters after Gutenberg-safe serialization.
 *
 * DocsPress escapes these characters inside block-comment JSON so Markdown and
 * HTML parsers cannot terminate the comment early. Some WordPress parser paths
 * retain the entity or Unicode escape at the dynamic-render boundary.
 *
 * @param mixed $value Serialized source value.
 * @return string
 */
function docspress_blocks_decode_source( $value ) {
	$value = html_entity_decode( (string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	return str_ireplace(
		array( '\\u0026', '\\u003c', '\\u003e' ),
		array( '&', '<', '>' ),
		$value
	);
}

/**
 * Resolve where a code excerpt came from, as a label and a permalink.
 *
 * The synchronization Action already records the repository, ref and server URL on every
 * page it writes, so a block only has to name a path and a line range to become a link into
 * the real source. Nothing new is required of the workflow.
 *
 * Prefers the theme's resolver when the DocsPress theme is active, so the
 * `docspress_github_source` filter still applies; otherwise reads the same meta directly.
 *
 * @param array $attributes Block attributes.
 * @return array{label:string,url:string}
 */
function docspress_blocks_source_reference( $attributes ) {
	$empty = array(
		'label' => '',
		'url'   => '',
	);

	$path = isset( $attributes['sourcePath'] ) ? (string) $attributes['sourcePath'] : '';
	if ( '' === $path ) {
		// A fence written as ```php title="src/Foo.php" carries the path as the filename.
		$path = isset( $attributes['filename'] ) ? (string) $attributes['filename'] : '';
	}
	$path = ltrim( trim( $path ), '/' );
	if ( '' === $path || false !== strpos( $path, '..' ) ) {
		return $empty;
	}

	$start = isset( $attributes['sourceStartLine'] ) ? absint( $attributes['sourceStartLine'] ) : 0;
	$end   = isset( $attributes['sourceEndLine'] ) ? absint( $attributes['sourceEndLine'] ) : 0;
	$range = '';
	if ( $start > 0 ) {
		$range = $end > $start ? $start . '-' . $end : (string) $start;
	}

	$label = $range ? $path . ':' . $range : $path;

	$source = function_exists( 'docspress_get_github_source' )
		? docspress_get_github_source()
		: docspress_blocks_github_source_meta();

	$repository = isset( $source['repository'] ) ? (string) $source['repository'] : '';
	$server_url = isset( $source['server_url'] ) ? (string) $source['server_url'] : '';
	$ref        = isset( $attributes['sourceRef'] ) && '' !== $attributes['sourceRef']
		? (string) $attributes['sourceRef']
		: ( isset( $source['ref'] ) ? (string) $source['ref'] : '' );

	if ( '' === $repository ) {
		// Without a repository there is nowhere to point. Still show the path, so the reader
		// knows which file the excerpt is from even when the link cannot be built.
		return array(
			'label' => $label,
			'url'   => '',
		);
	}

	$base = function_exists( 'docspress_normalize_repository_url' )
		? docspress_normalize_repository_url( $repository, $server_url )
		: docspress_blocks_repository_url( $repository, $server_url );

	if ( '' === $base ) {
		return array(
			'label' => $label,
			'url'   => '',
		);
	}

	$ref      = '' !== $ref ? $ref : 'main';
	$segments = implode( '/', array_map( 'rawurlencode', explode( '/', $path ) ) );
	$fragment = '';
	if ( $start > 0 ) {
		$fragment = $end > $start ? '#L' . $start . '-L' . $end : '#L' . $start;
	}

	return array(
		'label' => $label,
		'url'   => $base . '/blob/' . rawurlencode( $ref ) . '/' . $segments . $fragment,
	);
}

/**
 * Read the Action-written GitHub metadata when the DocsPress theme is not active.
 *
 * @return array{repository:string,ref:string,server_url:string}
 */
function docspress_blocks_github_source_meta() {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return array(
			'repository' => '',
			'ref'        => '',
			'server_url' => '',
		);
	}

	return array(
		'repository' => (string) get_post_meta( $post_id, '_docspress_github_repository', true ),
		'ref'        => (string) get_post_meta( $post_id, '_docspress_github_ref', true ),
		'server_url' => (string) get_post_meta( $post_id, '_docspress_github_server_url', true ),
	);
}

/**
 * Build a browsable repository URL from an `owner/name` pair or a full URL.
 *
 * Fallback for when the DocsPress theme is not providing its own.
 *
 * @param string $repository Repository URL or `owner/name` pair.
 * @param string $server_url Server URL used with an `owner/name` pair.
 * @return string
 */
function docspress_blocks_repository_url( $repository, $server_url = '' ) {
	$repository = trim( (string) $repository );
	if ( '' === $repository ) {
		return '';
	}

	if ( preg_match( '#^https?://#i', $repository ) ) {
		return untrailingslashit( esc_url_raw( $repository ) );
	}

	if ( ! preg_match( '#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repository ) ) {
		return '';
	}

	$server_url = untrailingslashit( trim( (string) $server_url ) );
	if ( '' === $server_url ) {
		$server_url = 'https://github.com';
	}

	return esc_url_raw( $server_url . '/' . $repository );
}

/**
 * Parse a human-friendly list such as 2,4-6 into line numbers.
 *
 * @param string $value Line expression.
 * @return array
 */
function docspress_blocks_highlighted_lines( $value ) {
	$lines = array();
	foreach ( explode( ',', (string) $value ) as $part ) {
		$part = trim( $part );
		if ( preg_match( '/^(\d{1,4})$/', $part, $match ) ) {
			$lines[ (int) $match[1] ] = true;
			continue;
		}

		if ( preg_match( '/^(\d{1,4})-(\d{1,4})$/', $part, $match ) ) {
			$start = min( (int) $match[1], (int) $match[2] );
			$end   = max( (int) $match[1], (int) $match[2] );
			$end   = min( $end, $start + 100 );
			for ( $line = $start; $line <= $end; $line++ ) {
				$lines[ $line ] = true;
			}
		}
	}

	return $lines;
}

/**
 * Build the reusable code surface used by code and code-tab blocks.
 *
 * @param array $attributes Block attributes.
 * @param bool  $show_header Whether to render the filename/language bar.
 * @return string
 */
function docspress_blocks_code_surface( $attributes, $show_header = true ) {
	$language          = docspress_blocks_code_language( isset( $attributes['language'] ) ? $attributes['language'] : '' );
	$filename          = isset( $attributes['filename'] ) ? sanitize_text_field( $attributes['filename'] ) : '';
	$code              = isset( $attributes['code'] ) ? docspress_blocks_decode_source( $attributes['code'] ) : '';
	$highlighted       = docspress_blocks_highlighted_lines( isset( $attributes['highlightedLines'] ) ? $attributes['highlightedLines'] : '' );
	$show_line_numbers = ! isset( $attributes['showLineNumbers'] ) || (bool) $attributes['showLineNumbers'];
	$diff_mode         = docspress_blocks_allowed_value(
		isset( $attributes['diffMode'] ) ? $attributes['diffMode'] : '',
		array( 'none', 'unified' ),
		'none'
	);
	$copy_mode         = docspress_blocks_allowed_value(
		isset( $attributes['copyMode'] ) ? $attributes['copyMode'] : '',
		array( 'all', 'final' ),
		'all'
	);
	$raw_annotations   = isset( $attributes['annotations'] ) && is_array( $attributes['annotations'] ) ? array_slice( $attributes['annotations'], 0, 20 ) : array();
	$annotations       = array();
	foreach ( $raw_annotations as $annotation_index => $annotation ) {
		$line_number = isset( $annotation['line'] ) ? max( 1, min( 9999, (int) $annotation['line'] ) ) : 1;
		$content     = isset( $annotation['content'] ) ? wp_kses_post( (string) $annotation['content'] ) : '';
		if ( '' === trim( wp_strip_all_tags( $content ) ) ) {
			continue;
		}
		$annotations[ $line_number ][] = array(
			'index'   => $annotation_index + 1,
			'content' => $content,
		);
	}
	$source_reference  = docspress_blocks_source_reference( $attributes );
	// An excerpt lifted from line 88 numbers from 88. Without this the gutter says the file
	// starts here, which is wrong in a way the reader cannot see.
	$start_line        = isset( $attributes['sourceStartLine'] ) ? max( 1, absint( $attributes['sourceStartLine'] ) ) : 1;
	$lines             = preg_split( '/\r\n|\r|\n/', $code );
	$classes           = 'docspress-code__surface';

	if ( $show_line_numbers ) {
		$classes .= ' has-line-numbers';
	}
	if ( 'unified' === $diff_mode ) {
		$classes .= ' is-diff';
	}
	$surface_id = wp_unique_id( 'docspress-code-surface-' );

	ob_start();
	?>
	<div id="<?php echo esc_attr( $surface_id ); ?>" class="<?php echo esc_attr( $classes ); ?>" data-language="<?php echo esc_attr( $language ); ?>" data-copy-mode="<?php echo esc_attr( $copy_mode ); ?>">
		<?php if ( $show_header ) : ?>
			<div class="docspress-code__bar">
				<span class="docspress-code__language"><?php echo esc_html( $language ); ?></span>
				<?php if ( $source_reference['url'] ) : ?>
					<a class="docspress-code__filename docspress-code__source" href="<?php echo esc_url( $source_reference['url'] ); ?>" rel="noreferrer noopener"><?php echo esc_html( $source_reference['label'] ); ?></a>
				<?php else : ?>
					<span class="docspress-code__filename"><?php echo esc_html( $source_reference['label'] ? $source_reference['label'] : ( $filename ? $filename : $language ) ); ?></span>
				<?php endif; ?>
				<button class="docspress-code__copy" type="button" data-docspress-copy aria-label="<?php esc_attr_e( 'Copy code', 'docspress-blocks' ); ?>">
					<span aria-hidden="true">⧉</span><b><?php esc_html_e( 'Copy', 'docspress-blocks' ); ?></b>
				</button>
			</div>
		<?php endif; ?>
		<pre class="docspress-code__pre" tabindex="0"><code><?php
		foreach ( $lines as $index => $line ) :
			$number       = $index + $start_line;
			$line_classes = 'docspress-code__line';
			if ( isset( $highlighted[ $number ] ) ) {
				$line_classes .= ' is-highlighted';
			}
			if ( 'unified' === $diff_mode ) {
				if ( 0 === strpos( $line, '+' ) && 0 !== strpos( $line, '+++' ) ) {
					$line_classes .= ' is-diff-added';
				} elseif ( 0 === strpos( $line, '-' ) && 0 !== strpos( $line, '---' ) ) {
					$line_classes .= ' is-diff-removed';
				} elseif ( 0 === strpos( $line, '@@' ) ) {
					$line_classes .= ' is-diff-meta';
				}
			}
			?><span class="<?php echo esc_attr( $line_classes ); ?>" data-line="<?php echo esc_attr( (string) $number ); ?>"><span class="docspress-code__line-content"><?php echo esc_html( $line ); ?></span><?php
			if ( isset( $annotations[ $number ] ) ) :
				foreach ( $annotations[ $number ] as $annotation ) :
					$annotation_id = $surface_id . '-annotation-' . $annotation['index'];
					?><button class="docspress-code__annotation-marker" type="button" data-docspress-code-annotation aria-expanded="false" aria-controls="<?php echo esc_attr( $annotation_id ); ?>"><span class="screen-reader-text"><?php echo esc_html( sprintf( __( 'Show annotation for line %d', 'docspress-blocks' ), $number ) ); ?></span><?php echo esc_html( (string) $annotation['index'] ); ?></button><?php
				endforeach;
			endif;
			?></span><?php
		endforeach;
		?></code></pre>
		<?php if ( $annotations ) : ?>
			<ol class="docspress-code__annotations" aria-label="<?php esc_attr_e( 'Code annotations', 'docspress-blocks' ); ?>">
				<?php foreach ( $annotations as $line_number => $line_annotations ) : ?>
					<?php foreach ( $line_annotations as $annotation ) : ?>
						<li id="<?php echo esc_attr( $surface_id . '-annotation-' . $annotation['index'] ); ?>" class="docspress-code__annotation" data-docspress-code-annotation-panel hidden>
							<span class="docspress-code__annotation-number" aria-hidden="true"><?php echo esc_html( (string) $annotation['index'] ); ?></span>
							<div>
								<strong><?php echo esc_html( sprintf( __( 'Line %d', 'docspress-blocks' ), $line_number ) ); ?></strong>
								<div class="docspress-code__annotation-content"><?php echo $annotation['content']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
							</div>
						</li>
					<?php endforeach; ?>
				<?php endforeach; ?>
			</ol>
		<?php endif; ?>
	</div>
	<?php
	return trim( ob_get_clean() );
}
