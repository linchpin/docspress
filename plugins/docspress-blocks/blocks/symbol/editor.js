( function ( blocks, shared ) {
	'use strict';

	const { registerBlockType } = blocks;
	const { Button, Fragment, InspectorControls, PanelBody, RichText, SelectControl, TextControl, TextareaControl, ToggleControl, __, designSupports, el, presetClass, themeStyle, useBlockProps } = shared;
	const defaults = window.docspressSymbolDefaults || [];
	const kinds = [ 'function', 'method', 'class', 'hook', 'filter', 'command', 'endpoint', 'constant' ]
		.map( ( kind ) => ( { label: kind, value: kind } ) );
	const icon = el(
		'svg',
		{ viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 },
		el( 'path', { d: 'M9 6 4 12l5 6M15 6l5 6-5 6M13 4l-2 16' } )
	);

	function updateParameter( attributes, setAttributes, index, patch ) {
		const parameters = attributes.parameters.slice();
		parameters[ index ] = { ...parameters[ index ], ...patch };
		setAttributes( { parameters } );
	}

	function updateRelation( attributes, setAttributes, index, patch ) {
		const relations = ( attributes.relations || [] ).slice();
		relations[ index ] = { ...relations[ index ], ...patch };
		setAttributes( { relations } );
	}

	const relationKinds = [ 'extends', 'implements', 'uses', 'see' ]
		.map( ( relation ) => ( { label: relation, value: relation } ) );

	registerBlockType( 'docspress/symbol', {
		apiVersion: 3,
		title: __( 'DocsPress: Symbol', 'docspress-blocks' ),
		description: __( 'Document one function, method, class, hook, command, endpoint, or constant with its signature, parameters, and source.', 'docspress-blocks' ),
		category: 'text',
		icon,
		keywords: [ __( 'api', 'docspress-blocks' ), __( 'signature', 'docspress-blocks' ), __( 'hook', 'docspress-blocks' ), __( 'reference', 'docspress-blocks' ) ],
		attributes: {
			kind: { type: 'string', default: 'function' },
			name: { type: 'string', default: 'mantle_register_module' },
			signature: { type: 'string', default: 'mantle_register_module( string $module_id, array $args = [] ): bool' },
			language: { type: 'string', default: 'php' },
			summary: { type: 'string', default: '<p>Register a module with the loader so its settings, capabilities and routes are known.</p>' },
			parameters: { type: 'array', default: defaults },
			relations: { type: 'array', default: [] },
			returns: { type: 'string', default: '<p><code>true</code> when the module was registered, <code>false</code> when the identifier was already taken.</p>' },
			throws: { type: 'string', default: '' },
			since: { type: 'string', default: '' },
			deprecated: { type: 'string', default: '' },
			sourcePath: { type: 'string', default: '' },
			sourceStartLine: { type: 'number', default: 0 },
			sourceEndLine: { type: 'number', default: 0 },
			sourceRef: { type: 'string', default: '' }
		},
		supports: designSupports,
		edit: function SymbolEdit( { attributes, setAttributes } ) {
			const blockProps = useBlockProps( {
				className: `docspress-symbol docspress-symbol--editor ${ attributes.deprecated ? 'is-deprecated ' : '' }${ presetClass }`,
				style: themeStyle
			} );

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Symbol', 'docspress-blocks' ), initialOpen: true },
						el( SelectControl, {
							label: __( 'Kind', 'docspress-blocks' ),
							value: attributes.kind,
							options: kinds,
							onChange: ( kind ) => setAttributes( { kind } )
						} ),
						el( TextControl, {
							label: __( 'Language', 'docspress-blocks' ),
							help: __( 'Highlighting used for the signature.', 'docspress-blocks' ),
							value: attributes.language,
							onChange: ( language ) => setAttributes( { language } )
						} ),
						el( TextControl, {
							label: __( 'Since', 'docspress-blocks' ),
							value: attributes.since,
							onChange: ( since ) => setAttributes( { since } )
						} ),
						el( TextControl, {
							label: __( 'Deprecated', 'docspress-blocks' ),
							help: __( 'Explain what to use instead. Leaving this empty marks the symbol current.', 'docspress-blocks' ),
							value: attributes.deprecated,
							onChange: ( deprecated ) => setAttributes( { deprecated } )
						} )
					),
					el(
						PanelBody,
						{ title: __( 'Source', 'docspress-blocks' ), initialOpen: false },
						el( TextControl, {
							label: __( 'Source path', 'docspress-blocks' ),
							help: __( 'Repository-relative path, for example includes/Core/Bootstrap.php.', 'docspress-blocks' ),
							value: attributes.sourcePath,
							onChange: ( sourcePath ) => setAttributes( { sourcePath } )
						} ),
						el( TextControl, {
							label: __( 'First line', 'docspress-blocks' ),
							type: 'number',
							value: attributes.sourceStartLine || '',
							onChange: ( value ) => setAttributes( { sourceStartLine: parseInt( value, 10 ) || 0 } )
						} ),
						el( TextControl, {
							label: __( 'Last line', 'docspress-blocks' ),
							type: 'number',
							value: attributes.sourceEndLine || '',
							onChange: ( value ) => setAttributes( { sourceEndLine: parseInt( value, 10 ) || 0 } )
						} ),
						el( TextControl, {
							label: __( 'Ref', 'docspress-blocks' ),
							help: __( 'Branch or tag. Defaults to the ref the page was synchronised from.', 'docspress-blocks' ),
							value: attributes.sourceRef,
							onChange: ( sourceRef ) => setAttributes( { sourceRef } )
						} )
					),
					el(
						PanelBody,
						{ title: __( 'Parameters', 'docspress-blocks' ), initialOpen: false },
						( attributes.parameters || [] ).map( ( parameter, index ) =>
							el(
								'div',
								{ key: index, className: 'docspress-symbol__editor-parameter' },
								el( TextControl, {
									label: __( 'Name', 'docspress-blocks' ),
									value: parameter.name,
									onChange: ( name ) => updateParameter( attributes, setAttributes, index, { name } )
								} ),
								el( TextControl, {
									label: __( 'Type', 'docspress-blocks' ),
									value: parameter.type,
									onChange: ( type ) => updateParameter( attributes, setAttributes, index, { type } )
								} ),
								el( TextControl, {
									label: __( 'Default', 'docspress-blocks' ),
									value: parameter.defaultValue,
									onChange: ( defaultValue ) => updateParameter( attributes, setAttributes, index, { defaultValue } )
								} ),
								el( ToggleControl, {
									label: __( 'Required', 'docspress-blocks' ),
									checked: !! parameter.required,
									onChange: ( required ) => updateParameter( attributes, setAttributes, index, { required } )
								} ),
								el( TextareaControl, {
									label: __( 'Description', 'docspress-blocks' ),
									value: parameter.description,
									onChange: ( description ) => updateParameter( attributes, setAttributes, index, { description } )
								} ),
								el(
									Button,
									{
										variant: 'tertiary',
										isDestructive: true,
										onClick: () => setAttributes( {
											parameters: attributes.parameters.filter( ( _item, itemIndex ) => itemIndex !== index )
										} )
									},
									__( 'Remove parameter', 'docspress-blocks' )
								)
							)
						),
						el(
							Button,
							{
								variant: 'secondary',
								onClick: () => setAttributes( {
									parameters: [ ...( attributes.parameters || [] ), { name: '', type: '', required: false, defaultValue: '', description: '' } ]
								} )
							},
							__( 'Add parameter', 'docspress-blocks' )
						)
					),
					el(
						PanelBody,
						{ title: __( 'Relations', 'docspress-blocks' ), initialOpen: false },
						el( 'p', { className: 'docspress-symbol__editor-help' },
							__( 'What a class extends, implements or uses, and anything worth linking beside it.', 'docspress-blocks' ) ),
						( attributes.relations || [] ).map( ( relation, index ) =>
							el(
								'div',
								{ key: index, className: 'docspress-symbol__editor-parameter' },
								el( SelectControl, {
									label: __( 'Relation', 'docspress-blocks' ),
									value: relation.relation || 'see',
									options: relationKinds,
									onChange: ( value ) => updateRelation( attributes, setAttributes, index, { relation: value } )
								} ),
								el( TextControl, {
									label: __( 'Name', 'docspress-blocks' ),
									value: relation.name,
									onChange: ( name ) => updateRelation( attributes, setAttributes, index, { name } )
								} ),
								el( TextControl, {
									label: __( 'Link', 'docspress-blocks' ),
									help: __( 'Optional. The page documenting it.', 'docspress-blocks' ),
									value: relation.url,
									onChange: ( url ) => updateRelation( attributes, setAttributes, index, { url } )
								} ),
								el(
									Button,
									{
										variant: 'tertiary',
										isDestructive: true,
										onClick: () => setAttributes( {
											relations: ( attributes.relations || [] ).filter( ( _item, itemIndex ) => itemIndex !== index )
										} )
									},
									__( 'Remove relation', 'docspress-blocks' )
								)
							)
						),
						el(
							Button,
							{
								variant: 'secondary',
								onClick: () => setAttributes( {
									relations: [ ...( attributes.relations || [] ), { relation: 'see', name: '', url: '' } ]
								} )
							},
							__( 'Add relation', 'docspress-blocks' )
						)
					)
				),
				el(
					'section',
					blockProps,
					el(
						'header',
						{ className: 'docspress-symbol__header' },
						el(
							'div',
							{ className: 'docspress-symbol__identity' },
							el( 'span', { className: 'docspress-symbol__kind', 'data-kind': attributes.kind }, attributes.kind ),
							el( RichText, {
								tagName: 'h3',
								className: 'docspress-symbol__name',
								value: attributes.name,
								allowedFormats: [],
								placeholder: __( 'Symbol name', 'docspress-blocks' ),
								onChange: ( name ) => setAttributes( { name } )
							} )
						)
					),
					el( TextareaControl, {
						label: __( 'Signature', 'docspress-blocks' ),
						value: attributes.signature,
						onChange: ( signature ) => setAttributes( { signature } )
					} ),
					el( RichText, {
						tagName: 'div',
						className: 'docspress-symbol__summary',
						value: attributes.summary,
						placeholder: __( 'What it does, in one or two sentences.', 'docspress-blocks' ),
						onChange: ( summary ) => setAttributes( { summary } )
					} ),
					el( RichText, {
						tagName: 'div',
						className: 'docspress-symbol__copy',
						value: attributes.returns,
						placeholder: __( 'What it returns.', 'docspress-blocks' ),
						onChange: ( returns ) => setAttributes( { returns } )
					} )
				)
			);
		},
		save: function SymbolSave() {
			return null;
		}
	} );
}( window.wp.blocks, window.docspressBlocksEditor ) );
