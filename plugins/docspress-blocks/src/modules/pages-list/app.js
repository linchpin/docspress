/**
 * Modern Pages list app shell.
 */

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { Button, Notice, Spinner } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';
import { applyFilters } from '@wordpress/hooks';

import { getActions, getFields } from './fields';
import { toggleExpanded, visiblePages } from './hierarchy';

const config = window.docspressPagesList || {};

const DEFAULT_VIEW = {
	type: 'table',
	page: 1,
	perPage: 50,
	search: '',
	filters: [],
	/*
	 * No default sort: the hierarchy arrives in tree order, and a sort
	 * indicator on a column the tree does not reorder reads as a broken
	 * control. Searching flattens the rows and enables sorting.
	 */
	titleField: 'title',
	/*
	 * Author is defined but hidden by default. Seven columns overflow the
	 * container at 1440px, and DataViews' Actions column is sticky, so the
	 * overflow hides Date behind it. Documentation rarely turns on author
	 * anyway — the column controls bring it back.
	 */
	fields: [ 'version', 'githubPath', 'status', 'date' ].filter(
		( field ) => config.hasGithubPaths || 'githubPath' !== field
	),
	showLevels: true,
	layout: {
		primaryField: 'title',
	},
};

/**
 * Load pages from the DocsPress admin REST route.
 *
 * @return {Promise<Object[]>} Page rows.
 */
async function fetchPages() {
	const path = config.restPath || '/docspress/v1/admin/pages';
	const response = await apiFetch( { path } );
	return Array.isArray( response?.pages ) ? response.pages : [];
}

/**
 * Root app.
 *
 * Other plugins extend the list through three filters, each applied with the
 * same `context`:
 *
 * - `docspress.pagesList.defaultView` — the view the screen opens with, once.
 *   Add a column's field ID to `fields` to show it by default.
 * - `docspress.pagesList.fields` — DataViews field definitions. Read the data
 *   a field needs from keys added to each row by the PHP
 *   `docspress_pages_list_row` filter.
 * - `docspress.pagesList.actions` — DataViews row and bulk actions.
 *
 * `context` is `{ config, searching, reload, getPages }`. `reload()` refetches
 * the rows without blanking the table, for an action that changed them;
 * `getPages()` returns every row, not only the visible ones. Both are stable,
 * so a field that holds them is not rebuilt, and its cells not remounted,
 * every time the rows change.
 *
 * @return {Element} App.
 */
export function App() {
	const [ pages, setPages ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ view, setView ] = useState( () =>
		applyFilters( 'docspress.pagesList.defaultView', DEFAULT_VIEW, {
			config,
		} )
	);
	const [ expanded, setExpanded ] = useState( () => new Set() );
	const pagesRef = useRef( pages );
	pagesRef.current = pages;

	const load = useCallback( async () => {
		setLoading( true );
		setError( null );
		try {
			const next = await fetchPages();
			setPages( next );
		} catch ( err ) {
			setError(
				err?.message ||
					__( 'Could not load pages.', 'docspress-blocks' )
			);
		} finally {
			setLoading( false );
		}
	}, [] );

	// No spinner: it would unmount the table and lose the reader's place.
	const reload = useCallback( async () => {
		setPages( await fetchPages() );
	}, [] );

	const getPages = useCallback( () => pagesRef.current, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	const onToggle = useCallback( ( id ) => {
		setExpanded( ( current ) => toggleExpanded( current, id ) );
	}, [] );

	const expandAll = useCallback( () => {
		setExpanded(
			new Set(
				pages
					.filter( ( page ) => page.hasChildren )
					.map( ( page ) => page.id )
			)
		);
	}, [ pages ] );

	const collapseAll = useCallback( () => {
		setExpanded( new Set() );
	}, [] );

	/*
	 * Two modes. Idle keeps the hierarchy: REST order, collapsible, unsorted.
	 * Searching or filtering flattens to matching rows so buried pages stay
	 * findable, and sorting becomes meaningful there.
	 */
	const searching = useMemo(
		() =>
			Boolean(
				( view.search && view.search.trim() ) ||
				( view.filters &&
					view.filters.some( ( filter ) => filter.value?.length ) )
			),
		[ view.search, view.filters ]
	);

	const fields = useMemo(
		() =>
			applyFilters(
				'docspress.pagesList.fields',
				getFields( { config, expanded, onToggle, searching } ),
				{ config, searching, reload, getPages }
			),
		[ expanded, onToggle, searching, reload, getPages ]
	);

	const actions = useMemo(
		() =>
			applyFilters( 'docspress.pagesList.actions', getActions(), {
				config,
				searching,
				reload,
				getPages,
			} ),
		[ searching, reload, getPages ]
	);

	const hierarchyVisible = useMemo(
		() => visiblePages( pages, expanded ),
		[ pages, expanded ]
	);

	const { data, paginationInfo } = useMemo( () => {
		if ( searching ) {
			return filterSortAndPaginate( pages, view, fields );
		}

		const perPage = view.perPage || 50;
		const page = view.page || 1;
		const start = ( page - 1 ) * perPage;
		const slice = hierarchyVisible.slice( start, start + perPage );

		return {
			data: slice,
			paginationInfo: {
				totalItems: hierarchyVisible.length,
				totalPages: Math.max(
					1,
					Math.ceil( hierarchyVisible.length / perPage )
				),
			},
		};
	}, [ pages, hierarchyVisible, view, fields, searching ] );

	if ( error ) {
		return (
			<div className="docspress-pages-list">
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
				<p>
					<a href={ config.classicUrl }>
						{ __( 'Open classic Pages table', 'docspress-blocks' ) }
					</a>
				</p>
			</div>
		);
	}

	return (
		<div className="docspress-pages-list">
			<div className="docspress-pages-list__header">
				<div>
					<h1 className="docspress-pages-list__heading">
						{ __( 'Pages', 'docspress-blocks' ) }
					</h1>
					<p className="docspress-pages-list__subtitle">
						{ sprintf(
							/* translators: %d: number of pages. */
							__(
								'%d pages in the documentation tree',
								'docspress-blocks'
							),
							pages.length
						) }
					</p>
				</div>
				<div className="docspress-pages-list__header-actions">
					<Button variant="secondary" onClick={ collapseAll }>
						{ __( 'Collapse all', 'docspress-blocks' ) }
					</Button>
					<Button variant="secondary" onClick={ expandAll }>
						{ __( 'Expand all', 'docspress-blocks' ) }
					</Button>
					<Button variant="secondary" href={ config.classicUrl }>
						{ __( 'Classic table', 'docspress-blocks' ) }
					</Button>
					<Button variant="primary" href={ config.newUrl }>
						{ __( 'Add New Page', 'docspress-blocks' ) }
					</Button>
				</div>
			</div>

			{ loading ? (
				<div className="docspress-pages-list__loading">
					<Spinner />
				</div>
			) : (
				<DataViews
					data={ data }
					fields={ fields }
					view={ view }
					onChangeView={ setView }
					actions={ actions }
					paginationInfo={ paginationInfo }
					defaultLayouts={ {
						table: {
							layout: {
								primaryField: 'title',
							},
						},
					} }
					getItemId={ ( item ) => String( item.id ) }
					getItemLevel={ ( item ) => item.level }
					isLoading={ loading }
					search
					searchLabel={ __( 'Search pages', 'docspress-blocks' ) }
					empty={
						<p>
							{ __(
								'No pages match this search.',
								'docspress-blocks'
							) }
						</p>
					}
				/>
			) }
		</div>
	);
}
