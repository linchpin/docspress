/**
 * Modern Pages list — DataViews with collapsible hierarchy.
 *
 * Mounted by includes/Modules/Pages_List/List_Screen.php when the module is
 * enabled from Settings → DocsPress.
 *
 * Mounting waits for DOM ready so that every script enqueued on the
 * `docspress_pages_list_enqueue_scripts` action has registered its
 * `docspress.pagesList.*` filters first, wherever WordPress printed it.
 */

import { createRoot } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';
import { App } from './app';
import './style.scss';

domReady( () => {
	const root = document.getElementById( 'docspress-pages-list' );
	if ( root ) {
		createRoot( root ).render( <App /> );
	}
} );
