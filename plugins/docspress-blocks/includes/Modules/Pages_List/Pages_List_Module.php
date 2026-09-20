<?php
/**
 * Pages List module — hierarchical DataViews admin list for documentation Pages.
 *
 * Opt-in from Settings → DocsPress. When enabled, replaces the classic Pages
 * table so deeply nested synced docs can be collapsed. Escape hatch: ?classic=1.
 *
 * @package DocsPressBlocks\Modules\Pages_List
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules\Pages_List;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use DocsPressBlocks\Modules\Abstract_Module;

/**
 * Class Pages_List_Module
 *
 * @since 1.0.1
 */
class Pages_List_Module extends Abstract_Module {

	/**
	 * Option that enables this module.
	 *
	 * @since 1.0.1
	 *
	 * @var string
	 */
	protected $enabled_option = 'docspress_modern_pages_list';

	/**
	 * Off until an editor turns it on.
	 *
	 * @since 1.0.1
	 *
	 * @var bool
	 */
	protected $default_enabled = false;

	/**
	 * Module id.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public function get_id() {
		return 'pages_list';
	}

	/**
	 * Module name.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public function get_name() {
		return __( 'Modern Pages list', 'docspress-blocks' );
	}

	/**
	 * Register the enable toggle on the DocsPress settings screen.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function register_settings() {
		Settings::register( $this );
	}

	/**
	 * Boot list screen + REST when enabled.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function init() {
		List_Screen::register( $this );
		REST_Controller::register();
	}

	/**
	 * Option key for the enable toggle.
	 *
	 * @since 1.0.1
	 *
	 * @return string
	 */
	public function get_enabled_option() {
		return $this->enabled_option;
	}
}
