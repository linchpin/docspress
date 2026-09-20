<?php
/**
 * Discovers and boots DocsPress Blocks modules.
 *
 * Mirrors Mantle's Module_Loader at a smaller scale: modules always register
 * their settings (so toggles stay visible), and only enabled modules call init().
 *
 * @package DocsPressBlocks\Modules
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use DocsPressBlocks\Modules\Pages_List\Pages_List_Module;

/**
 * Class Module_Loader
 *
 * @since 1.0.1
 */
class Module_Loader {

	/**
	 * Registered module instances keyed by id.
	 *
	 * @since 1.0.1
	 *
	 * @var array<string,Module_Interface>
	 */
	private $modules = array();

	/**
	 * Singleton.
	 *
	 * @since 1.0.1
	 *
	 * @var Module_Loader|null
	 */
	private static $instance = null;

	/**
	 * Return the shared loader.
	 *
	 * @since 1.0.1
	 *
	 * @return Module_Loader
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register built-in modules and boot them.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function boot() {
		$this->register( Pages_List_Module::instance() );

		/**
		 * Register additional DocsPress Blocks modules.
		 *
		 * @since 1.0.1
		 *
		 * @param Module_Loader $loader Module loader.
		 */
		do_action( 'docspress_blocks_register_modules', $this );

		foreach ( $this->modules as $module ) {
			$module->register_settings();
			if ( $module->is_enabled() ) {
				$module->init();
			}
		}

		/**
		 * Fires after DocsPress Blocks modules have been initialized.
		 *
		 * @since 1.0.1
		 *
		 * @param array<string,Module_Interface> $modules Enabled and disabled modules.
		 */
		do_action( 'docspress_blocks_modules_initialized', $this->modules );
	}

	/**
	 * Add a module to the registry.
	 *
	 * @since 1.0.1
	 *
	 * @param Module_Interface $module Module instance.
	 * @return void
	 */
	public function register( Module_Interface $module ) {
		$this->modules[ $module->get_id() ] = $module;
	}

	/**
	 * Return a module by id, or null.
	 *
	 * @since 1.0.1
	 *
	 * @param string $id Module id.
	 * @return Module_Interface|null
	 */
	public function get( $id ) {
		return isset( $this->modules[ $id ] ) ? $this->modules[ $id ] : null;
	}

	/**
	 * All registered modules.
	 *
	 * @since 1.0.1
	 *
	 * @return array<string,Module_Interface>
	 */
	public function all() {
		return $this->modules;
	}
}
