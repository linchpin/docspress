<?php
/**
 * Shared base for DocsPress Blocks modules.
 *
 * @package DocsPressBlocks\Modules
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Abstract_Module
 *
 * @since 1.0.1
 */
abstract class Abstract_Module implements Module_Interface {

	/**
	 * Option key that stores whether this module is enabled.
	 *
	 * Empty string means the module is always on (no toggle).
	 *
	 * @since 1.0.1
	 *
	 * @var string
	 */
	protected $enabled_option = '';

	/**
	 * Default enabled state when the option has never been saved.
	 *
	 * @since 1.0.1
	 *
	 * @var bool
	 */
	protected $default_enabled = false;

	/**
	 * Cached module instances.
	 *
	 * @since 1.0.1
	 *
	 * @var array<string,static>
	 */
	private static $instances = array();

	/**
	 * Return the shared instance for this module class.
	 *
	 * @since 1.0.1
	 *
	 * @return static
	 */
	public static function instance() {
		$class = static::class;
		if ( ! isset( self::$instances[ $class ] ) ) {
			self::$instances[ $class ] = new static();
		}
		return self::$instances[ $class ];
	}

	/**
	 * Whether the module should run on this site.
	 *
	 * @since 1.0.1
	 *
	 * @return bool
	 */
	public function is_enabled() {
		if ( '' === $this->enabled_option ) {
			return true;
		}

		$stored = get_option( $this->enabled_option, null );
		if ( null === $stored ) {
			return (bool) $this->default_enabled;
		}

		return (bool) $stored;
	}

	/**
	 * Default settings registration — override in modules that expose options.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function register_settings() {}

	/**
	 * Default init — override in modules that register runtime hooks.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function init() {}
}
