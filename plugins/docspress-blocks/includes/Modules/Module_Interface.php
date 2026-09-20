<?php
/**
 * Contract for DocsPress Blocks modules.
 *
 * Inspired by Mantle's module system, scaled to this plugin: each module is a
 * self-contained feature (settings, admin screens, REST, assets) that the
 * loader can enable or leave dormant.
 *
 * @package DocsPressBlocks\Modules
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interface Module_Interface
 *
 * @since 1.0.1
 */
interface Module_Interface {

	/**
	 * Unique module identifier (snake_case).
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public function get_id();

	/**
	 * Human-readable module name.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public function get_name();

	/**
	 * Whether the module should run on this site.
	 *
	 * @since 1.0.1
	 *
	 * @return bool
	 */
	public function is_enabled();

	/**
	 * Register settings schema / UI hooks that must exist even when disabled.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function register_settings();

	/**
	 * Boot the module when it is enabled.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function init();
}
