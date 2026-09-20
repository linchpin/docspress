/**
 * Modern Pages list — DataViews with collapsible hierarchy.
 *
 * Mounted by includes/Modules/Pages_List/List_Screen.php when the module is
 * enabled from Settings → DocsPress.
 */

import { createRoot } from '@wordpress/element';
import { App } from './app';
import './style.scss';

const root = document.getElementById( 'docspress-pages-list' );
if ( root ) {
	createRoot( root ).render( <App /> );
}
