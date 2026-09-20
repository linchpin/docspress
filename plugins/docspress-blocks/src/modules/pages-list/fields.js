/**
 * DataViews field definitions for the Modern Pages list.
 */

import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { chevronDown, chevronRight, external } from '@wordpress/icons';

/**
 * @typedef {Object} PagesListConfig
 * @property {boolean}  hasGithubPaths Whether any page has a GitHub path.
 * @property {Object[]} versions       Version filter elements.
 * @property {Object[]} statuses       Status filter elements.
 */

/**
 * Build DataViews fields.
 *
 * Sorting is only offered while searching or filtering. In hierarchy mode the
 * rows come back in tree order, so a sort the table cannot honour would just
 * be a control that does nothing.
 *
 * @param {Object}          options
 * @param {PagesListConfig} options.config    Boot config.
 * @param {Set}             options.expanded  Expanded parent IDs.
 * @param {Function}        options.onToggle  Collapse toggle.
 * @param {boolean}         options.searching Whether the view is flattened.
 * @return {Object[]} Fields.
 */
export function getFields( { config, expanded, onToggle, searching } ) {
	const fields = [
		{
			id: 'title',
			label: __( 'Title', 'docspress-blocks' ),
			type: 'text',
			enableHiding: false,
			enableSorting: searching,
			enableGlobalSearch: true,
			getValue: ( { item } ) => item.title,
			render: ( { item } ) => {
				const isOpen = expanded.has( item.id );
				return (
					<span className="docspress-pages-list__title">
						{ item.hasChildren ? (
							<Button
								size="small"
								icon={ isOpen ? chevronDown : chevronRight }
								aria-expanded={ isOpen }
								label={
									isOpen
										? sprintf(
												/* translators: %s: page title. */
												__(
													'Collapse children of %s',
													'docspress-blocks'
												),
												item.title
											)
										: sprintf(
												/* translators: %s: page title. */
												__(
													'Expand children of %s',
													'docspress-blocks'
												),
												item.title
											)
								}
								onClick={ ( event ) => {
									event.preventDefault();
									event.stopPropagation();
									onToggle( item.id );
								} }
							/>
						) : (
							<span
								className="docspress-pages-list__chevron-spacer"
								aria-hidden="true"
							/>
						) }
						<a href={ item.editUrl }>{ item.title }</a>
						{ item.hasChildren && ! isOpen ? (
							<span className="docspress-pages-list__child-count">
								{ sprintf(
									/* translators: %d: number of direct child pages. */
									__( '%d nested', 'docspress-blocks' ),
									item.childCount
								) }
							</span>
						) : null }
						{ 'publish' !== item.status ? (
							<span className="docspress-pages-list__status-badge">
								{ item.statusLabel }
							</span>
						) : null }
					</span>
				);
			},
		},
		{
			id: 'author',
			label: __( 'Author', 'docspress-blocks' ),
			type: 'text',
			enableSorting: searching,
			enableGlobalSearch: true,
			getValue: ( { item } ) => item.author,
		},
		{
			id: 'version',
			label: __( 'Docs version', 'docspress-blocks' ),
			type: 'text',
			elements: [
				...( config.versions || [] ),
				{
					value: '__all__',
					label: __( 'All versions', 'docspress-blocks' ),
				},
			],
			enableSorting: searching,
			enableGlobalSearch: false,
			filterBy: {
				operators: [ 'isAny', 'isNone' ],
			},
			getValue: ( { item } ) => item.version || '',
			render: ( { item } ) => {
				if ( ! item.versionLabel ) {
					return <span aria-hidden="true">—</span>;
				}
				return (
					<span className="docspress-pages-list__version">
						<strong>{ item.versionLabel }</strong>
						{ item.versionLatest ? (
							<span className="docspress-pages-list__state">
								{ __( 'Latest', 'docspress-blocks' ) }
							</span>
						) : null }
						{ item.version && ! item.versionActive ? (
							<span className="docspress-pages-list__state">
								{ __( 'Inactive', 'docspress-blocks' ) }
							</span>
						) : null }
					</span>
				);
			},
		},
		{
			id: 'status',
			label: __( 'Status', 'docspress-blocks' ),
			type: 'text',
			elements: config.statuses || [],
			enableSorting: searching,
			filterBy: {
				operators: [ 'isAny', 'isNone' ],
			},
			getValue: ( { item } ) => item.status,
			render: ( { item } ) => item.statusLabel,
		},
		{
			id: 'date',
			label: __( 'Date', 'docspress-blocks' ),
			type: 'datetime',
			enableSorting: searching,
			getValue: ( { item } ) => item.date,
			render: ( { item } ) => item.dateFormatted,
		},
	];

	if ( config.hasGithubPaths ) {
		fields.splice( 3, 0, {
			id: 'githubPath',
			label: __( 'GitHub path', 'docspress-blocks' ),
			type: 'text',
			enableSorting: searching,
			enableGlobalSearch: true,
			getValue: ( { item } ) => item.githubPath || '',
			render: ( { item } ) => {
				if ( ! item.githubPath ) {
					return <span aria-hidden="true">—</span>;
				}
				if ( ! item.githubUrl ) {
					return (
						<code
							className="docspress-pages-list__path"
							title={ item.githubPath }
						>
							{ item.githubPath }
						</code>
					);
				}
				return (
					<a
						href={ item.githubUrl }
						target="_blank"
						rel="noopener noreferrer"
						className="docspress-pages-list__github"
						title={ item.githubPath }
						aria-label={ sprintf(
							/* translators: %s: repository-relative path. */
							__(
								'Open %s on GitHub in a new tab',
								'docspress-blocks'
							),
							item.githubPath
						) }
					>
						<code>{ item.githubPath }</code>
						<span className="screen-reader-text">
							{ __( '(opens in a new tab)', 'docspress-blocks' ) }
						</span>
					</a>
				);
			},
		} );
	}

	return fields;
}

/**
 * Row actions.
 *
 * @return {Object[]} Actions.
 */
export function getActions() {
	return [
		{
			id: 'edit',
			label: __( 'Edit', 'docspress-blocks' ),
			isPrimary: true,
			callback: ( items ) => {
				if ( items[ 0 ]?.editUrl ) {
					window.location.href = items[ 0 ].editUrl;
				}
			},
		},
		{
			id: 'view',
			label: __( 'View', 'docspress-blocks' ),
			icon: external,
			callback: ( items ) => {
				if ( items[ 0 ]?.viewUrl ) {
					window.open( items[ 0 ].viewUrl, '_blank', 'noopener' );
				}
			},
		},
	];
}
