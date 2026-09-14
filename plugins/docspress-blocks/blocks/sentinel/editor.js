( function ( blocks, blockEditor, components, element, i18n ) {
	'use strict';

	const el = element.createElement;
	const Fragment = element.Fragment;
	const useState = element.useState;
	const useBlockProps = blockEditor.useBlockProps;
	const Button = components.Button;
	const Modal = components.Modal;
	const __ = i18n.__;

	// The record carries the Markdown the Page was built from as base64. Reading it back through
	// atob() alone mangles anything outside Latin-1 — an em dash, a smart quote, an emoji in a
	// heading — so decode the bytes rather than the characters.
	function decodeBase64( value ) {
		try {
			const bytes = Uint8Array.from( window.atob( value ), ( character ) => character.charCodeAt( 0 ) );
			return new TextDecoder().decode( bytes );
		} catch {
			return '';
		}
	}

	function CopyButton( { text } ) {
		const [ copied, setCopied ] = useState( false );

		return el( Button, {
			variant: 'secondary',
			size: 'compact',
			disabled: ! text,
			onClick: function () {
				window.navigator.clipboard.writeText( text ).then( function () {
					setCopied( true );
					window.setTimeout( function () { setCopied( false ); }, 2000 );
				} );
			},
		}, copied ? __( 'Copied', 'docspress-blocks' ) : __( 'Copy', 'docspress-blocks' ) );
	}

	function Panel( { title, body, language } ) {
		return el( 'div', { className: 'docspress-sentinel-modal__panel' },
			el( 'div', { className: 'docspress-sentinel-modal__panel-header' },
				el( 'h3', null, title ),
				el( CopyButton, { text: body } )
			),
			el( 'pre', { className: 'docspress-sentinel-modal__code', lang: language }, body )
		);
	}

	function summaryRows( record ) {
		return [
			[ __( 'Page key', 'docspress-blocks' ), record.key ],
			[ __( 'Markdown source', 'docspress-blocks' ), record.source ],
			[ __( 'Content hash', 'docspress-blocks' ), record.hash ],
			[ __( 'Documentation version', 'docspress-blocks' ), record.docsVersion ],
			[ __( 'Logical route', 'docspress-blocks' ), record.logicalRoute ],
			[ __( 'Sidebar', 'docspress-blocks' ), record.sidebarId ],
		].filter( function ( row ) { return row[ 1 ]; } );
	}

	blocks.registerBlockType( 'docspress/sentinel', {
		title: __( 'DocsPress Sentinel', 'docspress-blocks' ),
		description: __( 'The record that ties this Page to the Markdown file it is published from. It has no front-end output.', 'docspress-blocks' ),
		category: 'theme',
		icon: 'admin-links',
		edit: function ( props ) {
			const [ isOpen, setOpen ] = useState( false );
			const record = props.attributes.sentinel || {};
			const source = record.source || __( 'an unrecorded source file', 'docspress-blocks' );
			const markdown = record.sourceContentBase64 ? decodeBase64( record.sourceContentBase64 ) : '';
			// The base64 copy of the Markdown is most of the record's bytes and none of its
			// meaning. Show it decoded in its own panel instead of as a wall of base64 here.
			const readable = Object.fromEntries(
				Object.entries( record ).filter( function ( entry ) { return entry[ 0 ] !== 'sourceContentBase64'; } )
			);
			const blockProps = useBlockProps( { className: 'docspress-sentinel' } );

			return el( Fragment, null,
				el( 'div', blockProps,
					el( 'span', { className: 'docspress-sentinel__icon', 'aria-hidden': true },
						el( 'svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
							el( 'path', { d: 'M4 6h16M4 12h10M4 18h7' } )
						)
					),
					el( 'span', { className: 'docspress-sentinel__label' },
						__( 'Synchronized by DocsPress from', 'docspress-blocks' ),
						' ',
						el( 'code', null, source )
					),
					el( Button, {
						variant: 'link',
						className: 'docspress-sentinel__view',
						onClick: function () { setOpen( true ); },
					}, __( 'View record', 'docspress-blocks' ) )
				),
				isOpen && el( Modal, {
					title: __( 'DocsPress synchronization record', 'docspress-blocks' ),
					className: 'docspress-sentinel-modal',
					onRequestClose: function () { setOpen( false ); },
				},
					el( 'p', { className: 'docspress-sentinel-modal__intro' },
						__( 'DocsPress writes this record when it publishes the Page. It is what a later run matches the Page against, so editing or deleting it disconnects the Page from its Markdown source.', 'docspress-blocks' )
					),
					el( 'dl', { className: 'docspress-sentinel-modal__summary' },
						summaryRows( record ).map( function ( row ) {
							return el( Fragment, { key: row[ 0 ] },
								el( 'dt', null, row[ 0 ] ),
								el( 'dd', null, el( 'code', null, String( row[ 1 ] ) ) )
							);
						} )
					),
					el( Panel, {
						title: __( 'Record', 'docspress-blocks' ),
						body: JSON.stringify( readable, null, 2 ),
						language: 'json',
					} ),
					markdown && el( Panel, {
						title: __( 'Markdown source at the last synchronization', 'docspress-blocks' ),
						body: markdown,
						language: 'markdown',
					} )
				)
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n );
