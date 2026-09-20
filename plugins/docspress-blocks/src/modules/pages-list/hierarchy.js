/**
 * Hierarchy helpers for the Modern Pages list.
 *
 * Collapse is data-driven: a collapsed parent omits its descendants from the
 * array handed to DataViews. Indentation uses showLevels + getItemLevel.
 */

/**
 * Whether every ancestor of a page is expanded.
 *
 * @param {Object}   page     Page row.
 * @param {Object[]} allPages Full hierarchy-ordered list.
 * @param {Set}      expanded Expanded parent IDs.
 * @return {boolean} True when the row should render.
 */
export function isVisible( page, allPages, expanded ) {
	if ( 0 === page.level ) {
		return true;
	}

	let parentId = page.parent;
	const byId = new Map( allPages.map( ( item ) => [ item.id, item ] ) );

	while ( parentId > 0 ) {
		if ( ! expanded.has( parentId ) ) {
			return false;
		}
		const parent = byId.get( parentId );
		if ( ! parent ) {
			return false;
		}
		parentId = parent.parent;
	}

	return true;
}

/**
 * Visible rows for the current expansion state.
 *
 * @param {Object[]} pages    Full hierarchy-ordered list.
 * @param {Set}      expanded Expanded parent IDs.
 * @return {Object[]} Visible rows.
 */
export function visiblePages( pages, expanded ) {
	return pages.filter( ( page ) => isVisible( page, pages, expanded ) );
}

/**
 * Toggle a parent in the expanded set.
 *
 * @param {Set}    expanded Current set.
 * @param {number} id       Parent page ID.
 * @return {Set} Next set.
 */
export function toggleExpanded( expanded, id ) {
	const next = new Set( expanded );
	if ( next.has( id ) ) {
		next.delete( id );
	} else {
		next.add( id );
	}
	return next;
}
