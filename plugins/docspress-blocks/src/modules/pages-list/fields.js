/**
 * DataViews field definitions for the Modern Pages list.
 */

import { Button, Notice, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { chevronDown, chevronRight, external } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

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
		{
			id: 'menuOrder',
			label: __( 'Order', 'docspress-blocks' ),
			type: 'integer',
			enableSorting: searching,
			getValue: ( { item } ) => item.menuOrder,
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
 * Order modal: sets one page's menu_order, which orders it among its siblings.
 *
 * When the page's Markdown sets sidebar_position, the sync owns menu_order and
 * puts it back on every run, so the modal points at the source file instead of
 * offering a value that would not last. Otherwise it lists the page's siblings
 * with their numbers, which the table does not show by default, so a value can
 * be chosen without opening each sibling in turn.
 *
 * @param {Object}              props
 * @param {Object[]}            props.items      The page, as a one-item array.
 * @param {() => void}          props.closeModal Closes the modal.
 * @param {() => Promise<void>} props.reload     Refetches the rows.
 * @param {() => Object[]}      props.getPages   Returns every row, in tree order.
 * @return {Element} Modal body.
 */
function OrderModal( { items, closeModal, reload, getPages } ) {
	const [ item ] = items;
	const [ value, setValue ] = useState( String( item.menuOrder ?? 0 ) );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	if ( item.menuOrderManaged ) {
		const path = item.githubPath || item.sourcePath;
		return (
			<div className="docspress-pages-list__order">
				<p>
					{ __(
						'This page’s order comes from sidebar_position in its Markdown file. Change it there: the next sync resets any order set here.',
						'docspress-blocks'
					) }
				</p>
				{ path ? (
					<p>
						{ item.githubUrl ? (
							<a
								href={ item.githubUrl }
								target="_blank"
								rel="noopener noreferrer"
							>
								<code>{ path }</code>
								<span className="screen-reader-text">
									{ __(
										'(opens in a new tab)',
										'docspress-blocks'
									) }
								</span>
							</a>
						) : (
							<code>{ path }</code>
						) }
					</p>
				) : null }
				<div className="docspress-pages-list__order-buttons">
					<Button variant="primary" onClick={ closeModal }>
						{ __( 'Close', 'docspress-blocks' ) }
					</Button>
				</div>
			</div>
		);
	}

	const order = Number( value );
	const isValid = '' !== value.trim() && Number.isInteger( order );
	const siblings = getPages().filter(
		( page ) => page.parent === item.parent
	);

	const onSubmit = async ( event ) => {
		event.preventDefault();
		if ( ! isValid || isSaving ) {
			return;
		}
		setIsSaving( true );
		setError( null );
		try {
			await apiFetch( {
				path: `/wp/v2/pages/${ item.id }`,
				method: 'POST',
				data: { menu_order: order },
			} );
			await reload();
			closeModal();
		} catch ( err ) {
			setError(
				err?.message ||
					__( 'Could not save the order.', 'docspress-blocks' )
			);
			setIsSaving( false );
		}
	};

	return (
		<form className="docspress-pages-list__order" onSubmit={ onSubmit }>
			{ error ? (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) : null }
			<TextControl
				type="number"
				step={ 1 }
				label={ __( 'Order', 'docspress-blocks' ) }
				help={ __(
					'Pages are ordered by this number among their siblings, lowest first. Pages with the same number are sorted by title. Negative numbers are allowed.',
					'docspress-blocks'
				) }
				value={ value }
				onChange={ setValue }
			/>
			{ siblings.length > 1 ? (
				<div>
					<p className="docspress-pages-list__order-heading">
						{ __( 'Pages at this level', 'docspress-blocks' ) }
					</p>
					<ol className="docspress-pages-list__order-siblings">
						{ siblings.map( ( page ) => (
							<li key={ page.id }>
								<span className="docspress-pages-list__order-value">
									{ page.menuOrder }
								</span>
								<span>{ page.title }</span>
								{ page.id === item.id ? (
									<span className="docspress-pages-list__state">
										{ __(
											'This page',
											'docspress-blocks'
										) }
									</span>
								) : null }
								{ page.menuOrderManaged ? (
									<span className="docspress-pages-list__state">
										{ __(
											'Set in Markdown',
											'docspress-blocks'
										) }
									</span>
								) : null }
							</li>
						) ) }
					</ol>
				</div>
			) : null }
			<div className="docspress-pages-list__order-buttons">
				<Button
					variant="tertiary"
					onClick={ closeModal }
					disabled={ isSaving }
				>
					{ __( 'Cancel', 'docspress-blocks' ) }
				</Button>
				<Button
					variant="primary"
					type="submit"
					isBusy={ isSaving }
					disabled={ ! isValid || isSaving }
					accessibleWhenDisabled
				>
					{ __( 'Save', 'docspress-blocks' ) }
				</Button>
			</div>
		</form>
	);
}

/**
 * Row actions.
 *
 * @param {Object}              options
 * @param {() => Promise<void>} options.reload   Refetches the rows after an action changed them.
 * @param {() => Object[]}      options.getPages Returns every row, in tree order.
 * @return {Object[]} Actions.
 */
export function getActions( { reload, getPages } ) {
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
		{
			id: 'order',
			label: __( 'Order', 'docspress-blocks' ),
			modalHeader: __( 'Page order', 'docspress-blocks' ),
			modalFocusOnMount: 'firstContentElement',
			RenderModal: ( props ) => (
				<OrderModal
					{ ...props }
					reload={ reload }
					getPages={ getPages }
				/>
			),
		},
	];
}
