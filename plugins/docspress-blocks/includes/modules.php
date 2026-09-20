<?php
/**
 * Autoload DocsPress Blocks module classes and boot the loader.
 *
 * @package DocsPressBlocks
 * @since 1.0.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

spl_autoload_register(
	static function ( $class ) {
		$prefix = 'DocsPressBlocks\\';
		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$relative = substr( $class, strlen( $prefix ) );
		$path     = DOCSPRESS_BLOCKS_PATH . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
);

/**
 * Boot registered DocsPress Blocks modules.
 *
 * @since 1.0.1
 *
 * @return void
 */
function docspress_blocks_boot_modules() {
	\DocsPressBlocks\Modules\Module_Loader::instance()->boot();
}
add_action( 'plugins_loaded', 'docspress_blocks_boot_modules', 20 );
