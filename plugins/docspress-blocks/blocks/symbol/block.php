<?php
/**
 * Symbol block registration and rendering.
 *
 * One entry in an API reference: a function, method, class, hook, filter, CLI command, HTTP
 * endpoint, or constant. Before this block existed the Fields block was doing the job, which
 * is why generated references carry rows whose type, default and constraint columns are all
 * empty strings — a hook is not a field, and it has a signature, a return, and a source.
 *
 * @package DocsPressBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Symbol kinds and the label shown on the badge.
 *
 * @return array
 */
function docspress_blocks_symbol_kinds() {
	return array(
		'function' => __( 'function', 'docspress-blocks' ),
		'method'   => __( 'method', 'docspress-blocks' ),
		'class'    => __( 'class', 'docspress-blocks' ),
		'hook'     => __( 'action', 'docspress-blocks' ),
		'filter'   => __( 'filter', 'docspress-blocks' ),
		'command'  => __( 'command', 'docspress-blocks' ),
		'endpoint' => __( 'endpoint', 'docspress-blocks' ),
		'constant' => __( 'constant', 'docspress-blocks' ),
	);
}

/**
 * Default parameters, used for the editor placeholder.
 *
 * @return array
 */
function docspress_blocks_symbol_defaults() {
	return array(
		array(
			'name'         => '$module_id',
			'type'         => 'string',
			'required'     => true,
			'defaultValue' => '',
			'description'  => 'Identifier of the module being registered.',
		),
		array(
			'name'         => '$args',
			'type'         => 'array',
			'required'     => false,
			'defaultValue' => '[]',
			'description'  => 'Optional overrides merged over the module defaults.',
		),
	);
}

/**
 * Normalize one parameter definition.
 *
 * @param array $parameter Raw parameter.
 * @return array
 */
function docspress_blocks_normalize_symbol_parameter( $parameter ) {
	if ( ! is_array( $parameter ) ) {
		return null;
	}

	$name = isset( $parameter['name'] ) ? sanitize_text_field( $parameter['name'] ) : '';
	if ( '' === $name ) {
		return null;
	}

	return array(
		'name'         => $name,
		'type'         => isset( $parameter['type'] ) ? sanitize_text_field( $parameter['type'] ) : '',
		'required'     => ! empty( $parameter['required'] ),
		'defaultValue' => isset( $parameter['defaultValue'] ) ? sanitize_text_field( $parameter['defaultValue'] ) : '',
		'description'  => isset( $parameter['description'] ) ? wp_kses_post( $parameter['description'] ) : '',
	);
}

/**
 * Render the Symbol block.
 *
 * @param array $attributes Block attributes.
 * @return string
 */
function docspress_blocks_render_symbol( $attributes ) {
	$kinds = docspress_blocks_symbol_kinds();
	// Call the map directly rather than through $kinds: scripts/generate-block-catalog.mjs
	// reads these allow-lists out of the source, and it cannot follow a variable.
	$kind  = docspress_blocks_allowed_value(
		isset( $attributes['kind'] ) ? $attributes['kind'] : '',
		array_keys( docspress_blocks_symbol_kinds() ),
		'function'
	);

	$name = isset( $attributes['name'] ) ? sanitize_text_field( $attributes['name'] ) : '';
	if ( '' === $name ) {
		return '';
	}

	$signature   = isset( $attributes['signature'] ) ? docspress_blocks_decode_source( $attributes['signature'] ) : '';
	$summary     = isset( $attributes['summary'] ) ? wp_kses_post( $attributes['summary'] ) : '';
	$returns     = isset( $attributes['returns'] ) ? wp_kses_post( $attributes['returns'] ) : '';
	$throws      = isset( $attributes['throws'] ) ? wp_kses_post( $attributes['throws'] ) : '';
	$since       = isset( $attributes['since'] ) ? sanitize_text_field( $attributes['since'] ) : '';
	$deprecated  = isset( $attributes['deprecated'] ) ? sanitize_text_field( $attributes['deprecated'] ) : '';
	$language    = docspress_blocks_code_language( isset( $attributes['language'] ) ? $attributes['language'] : 'php' );
	$raw_params  = isset( $attributes['parameters'] ) && is_array( $attributes['parameters'] ) ? array_slice( $attributes['parameters'], 0, 30 ) : array();
	$parameters  = array_values( array_filter( array_map( 'docspress_blocks_normalize_symbol_parameter', $raw_params ) ) );
	$reference   = docspress_blocks_source_reference( $attributes );
	$is_deprecated = '' !== $deprecated;

	$wrapper = get_block_wrapper_attributes(
		array(
			'class' => 'docspress-symbol' . ( $is_deprecated ? ' is-deprecated' : '' ),
		)
	);

	ob_start();
	?>
	<section <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<header class="docspress-symbol__header">
			<div class="docspress-symbol__identity">
				<span class="docspress-symbol__kind" data-kind="<?php echo esc_attr( $kind ); ?>"><?php echo esc_html( $kinds[ $kind ] ); ?></span>
				<h3 class="docspress-symbol__name"><code><?php echo esc_html( $name ); ?></code></h3>
			</div>
			<div class="docspress-symbol__badges">
				<?php if ( $since ) : ?>
					<span class="docspress-symbol__badge"><?php echo esc_html( sprintf( __( 'since %s', 'docspress-blocks' ), $since ) ); ?></span>
				<?php endif; ?>
				<?php if ( $is_deprecated ) : ?>
					<span class="docspress-symbol__badge is-deprecated"><?php esc_html_e( 'deprecated', 'docspress-blocks' ); ?></span>
				<?php endif; ?>
				<?php if ( $reference['label'] ) : ?>
					<?php if ( $reference['url'] ) : ?>
						<a class="docspress-symbol__source docspress-code__source" href="<?php echo esc_url( $reference['url'] ); ?>" rel="noreferrer noopener"><?php echo esc_html( $reference['label'] ); ?></a>
					<?php else : ?>
						<span class="docspress-symbol__source"><?php echo esc_html( $reference['label'] ); ?></span>
					<?php endif; ?>
				<?php endif; ?>
			</div>
		</header>

		<?php if ( $is_deprecated ) : ?>
			<p class="docspress-symbol__deprecation"><?php echo esc_html( $deprecated ); ?></p>
		<?php endif; ?>

		<?php if ( $summary ) : ?>
			<div class="docspress-symbol__summary"><?php echo $summary; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
		<?php endif; ?>

		<?php if ( '' !== trim( $signature ) ) : ?>
			<div class="docspress-symbol__signature">
				<?php
				echo docspress_blocks_code_surface( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					array(
						'language'        => $language,
						'code'            => $signature,
						'showLineNumbers' => false,
					),
					false
				);
				?>
			</div>
		<?php endif; ?>

		<?php if ( $parameters ) : ?>
			<div class="docspress-symbol__section">
				<h4 class="docspress-symbol__section-title"><?php esc_html_e( 'Parameters', 'docspress-blocks' ); ?></h4>
				<dl class="docspress-symbol__parameters">
					<?php foreach ( $parameters as $parameter ) : ?>
						<div class="docspress-symbol__parameter">
							<dt>
								<code><?php echo esc_html( $parameter['name'] ); ?></code>
								<?php if ( $parameter['type'] ) : ?>
									<span class="docspress-symbol__type"><?php echo esc_html( $parameter['type'] ); ?></span>
								<?php endif; ?>
								<?php if ( $parameter['required'] ) : ?>
									<span class="docspress-symbol__badge is-required"><?php esc_html_e( 'required', 'docspress-blocks' ); ?></span>
								<?php endif; ?>
							</dt>
							<dd>
								<?php if ( $parameter['description'] ) : ?>
									<div class="docspress-symbol__copy"><?php echo $parameter['description']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
								<?php endif; ?>
								<?php if ( '' !== $parameter['defaultValue'] ) : ?>
									<span class="docspress-symbol__metadata"><b><?php esc_html_e( 'Default', 'docspress-blocks' ); ?></b><code><?php echo esc_html( $parameter['defaultValue'] ); ?></code></span>
								<?php endif; ?>
							</dd>
						</div>
					<?php endforeach; ?>
				</dl>
			</div>
		<?php endif; ?>

		<?php if ( $returns ) : ?>
			<div class="docspress-symbol__section">
				<h4 class="docspress-symbol__section-title"><?php esc_html_e( 'Returns', 'docspress-blocks' ); ?></h4>
				<div class="docspress-symbol__copy"><?php echo $returns; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
			</div>
		<?php endif; ?>

		<?php if ( $throws ) : ?>
			<div class="docspress-symbol__section">
				<h4 class="docspress-symbol__section-title"><?php esc_html_e( 'Throws', 'docspress-blocks' ); ?></h4>
				<div class="docspress-symbol__copy"><?php echo $throws; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
			</div>
		<?php endif; ?>
	</section>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Register the Symbol block.
 */
function docspress_blocks_register_symbol() {
	$block_url = DOCSPRESS_BLOCKS_URL . 'blocks/symbol/';
	$defaults  = docspress_blocks_symbol_defaults();

	wp_register_script( 'docspress-symbol-editor', $block_url . 'editor.js', array( 'wp-blocks', 'docspress-blocks-editor-shared' ), DOCSPRESS_BLOCKS_VERSION, true );
	wp_register_style( 'docspress-symbol', $block_url . 'style.css', array( 'docspress-blocks-code' ), DOCSPRESS_BLOCKS_VERSION );
	wp_register_style( 'docspress-symbol-editor-style', $block_url . 'editor.css', array( 'wp-edit-blocks', 'docspress-symbol' ), DOCSPRESS_BLOCKS_VERSION );

	wp_add_inline_script( 'docspress-symbol-editor', 'window.docspressSymbolDefaults = ' . wp_json_encode( $defaults ) . ';', 'before' );

	register_block_type(
		'docspress/symbol',
		array(
			'api_version'     => 3,
			'editor_script'   => 'docspress-symbol-editor',
			'style'           => 'docspress-symbol',
			'editor_style'    => 'docspress-symbol-editor-style',
			'render_callback' => 'docspress_blocks_render_symbol',
			'attributes'      => array(
				'kind'            => array( 'type' => 'string', 'default' => 'function' ),
				'name'            => array( 'type' => 'string', 'default' => 'mantle_register_module' ),
				'signature'       => array( 'type' => 'string', 'default' => "mantle_register_module( string \$module_id, array \$args = [] ): bool" ),
				'language'        => array( 'type' => 'string', 'default' => 'php' ),
				'summary'         => array( 'type' => 'string', 'default' => '<p>Register a module with the loader so its settings, capabilities and routes are known.</p>' ),
				'parameters'      => array( 'type' => 'array', 'default' => $defaults ),
				'returns'         => array( 'type' => 'string', 'default' => '<p><code>true</code> when the module was registered, <code>false</code> when the identifier was already taken.</p>' ),
				'throws'          => array( 'type' => 'string', 'default' => '' ),
				'since'           => array( 'type' => 'string', 'default' => '' ),
				'deprecated'      => array( 'type' => 'string', 'default' => '' ),
				'sourcePath'      => array( 'type' => 'string', 'default' => '' ),
				'sourceStartLine' => array( 'type' => 'number', 'default' => 0 ),
				'sourceEndLine'   => array( 'type' => 'number', 'default' => 0 ),
				'sourceRef'       => array( 'type' => 'string', 'default' => '' ),
			),
			'supports'        => docspress_blocks_design_supports(),
		)
	);
}
add_action( 'init', 'docspress_blocks_register_symbol', 10 );
