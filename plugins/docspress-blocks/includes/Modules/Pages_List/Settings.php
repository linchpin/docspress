<?php
/**
 * Settings UI for the Pages List module.
 *
 * @package DocsPressBlocks\Modules\Pages_List
 * @since 1.0.1
 */

namespace DocsPressBlocks\Modules\Pages_List;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Settings
 *
 * @since 1.0.1
 */
class Settings {

	/**
	 * Module under configuration.
	 *
	 * @since 1.0.1
	 *
	 * @var Pages_List_Module
	 */
	private $module;

	/**
	 * Register option + DocsPress settings field.
	 *
	 * @since 1.0.1
	 *
	 * @param Pages_List_Module $module Module.
	 * @return void
	 */
	public static function register( Pages_List_Module $module ) {
		$settings = new self( $module );
		$settings->hooks();
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
	 * Hook settings registration and the DocsPress form field.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	private function hooks() {
		add_action( 'init', array( $this, 'register_setting' ), 7 );
		add_action( 'docspress_versions_settings_fields', array( $this, 'render_field' ) );
	}

	/**
	 * Register the enable option with the DocsPress settings group.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function register_setting() {
		register_setting(
			'docspress_versions',
			$this->module->get_enabled_option(),
			array(
				'type'              => 'boolean',
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
				'show_in_rest'      => true,
			)
		);
	}

	/**
	 * Render the enable checkbox on Settings → DocsPress.
	 *
	 * @since 1.0.1
	 *
	 * @return void
	 */
	public function render_field() {
		$option  = $this->module->get_enabled_option();
		$enabled = $this->module->is_enabled();
		?>
		<tr>
			<th scope="row"><?php echo esc_html( $this->module->get_name() ); ?></th>
			<td>
				<input type="hidden" name="<?php echo esc_attr( $option ); ?>" value="0" />
				<label for="docspress-module-pages-list">
					<input
						type="checkbox"
						id="docspress-module-pages-list"
						name="<?php echo esc_attr( $option ); ?>"
						value="1"
						<?php checked( $enabled ); ?>
					/>
					<?php esc_html_e( 'Replace the classic Pages table with a collapsible DataViews hierarchy', 'docspress-blocks' ); ?>
				</label>
				<p class="description">
					<?php
					esc_html_e(
						'Built for deeply nested documentation trees. Open the classic table any time with ?classic=1 on the Pages URL.',
						'docspress-blocks'
					);
					?>
				</p>
				<?php if ( $enabled ) : ?>
					<p>
						<a href="<?php echo esc_url( List_Screen::url() ); ?>">
							<?php esc_html_e( 'Open Modern Pages list', 'docspress-blocks' ); ?>
						</a>
						|
						<a href="<?php echo esc_url( List_Screen::classic_url() ); ?>">
							<?php esc_html_e( 'Open classic Pages table', 'docspress-blocks' ); ?>
						</a>
					</p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}
}
