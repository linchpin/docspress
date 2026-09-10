( function ( blockEditor, components, element, i18n ) {
	'use strict';

	const { InspectorControls, MediaUpload, MediaUploadCheck, PanelColorSettings, PlainText, RichText, useBlockProps } = blockEditor;
	const { Button, ButtonGroup, PanelBody, RangeControl, SelectControl, TextareaControl, TextControl, ToggleControl } = components;
	const { Fragment, createElement: el, useState } = element;
	const { __ } = i18n;
	const designPreset = window.docspressBlocksSettings && window.docspressBlocksSettings.preset
		? window.docspressBlocksSettings.preset.replace( /[^a-z0-9-]/g, '' )
		: 'custom';
	const presetClass = `docspress-blocks--preset-${ designPreset }`;
	const themeStyle = window.docspressBlocksSettings && window.docspressBlocksSettings.tokens
		? window.docspressBlocksSettings.tokens
		: {};
	const designSupports = {
		anchor: true,
		html: false,
		className: true,
		color: {
			background: true,
			gradients: true,
			link: true,
			text: true
		},
		spacing: {
			blockGap: true,
			margin: true,
			padding: true
		},
		typography: {
			fontFamily: true,
			fontSize: true,
			fontStyle: true,
			fontWeight: true,
			letterSpacing: true,
			lineHeight: true,
			textDecoration: true,
			textTransform: true
		},
		border: {
			color: true,
			radius: true,
			style: true,
			width: true
		},
		dimensions: {
			minHeight: true
		},
		position: {
			sticky: true
		},
		shadow: true
	};

	// Mirrors docspress_blocks_code_languages() in includes/code-surface.php. A value the
	// editor offers but PHP rejects renders as plaintext, so the two lists move together.
	const languages = [
		{ label: 'Bash', value: 'bash' },
		{ label: 'C++', value: 'cpp' },
		{ label: 'CSS', value: 'css' },
		{ label: 'Diff', value: 'diff' },
		{ label: 'HTML', value: 'html' },
		{ label: 'HTTP', value: 'http' },
		{ label: 'INI', value: 'ini' },
		{ label: 'JavaScript', value: 'javascript' },
		{ label: 'JSON', value: 'json' },
		{ label: 'JSX', value: 'jsx' },
		{ label: 'Markdown', value: 'markdown' },
		{ label: 'PHP', value: 'php' },
		{ label: __( 'Plain text', 'docspress-blocks' ), value: 'plaintext' },
		{ label: 'Python', value: 'python' },
		{ label: 'SCSS', value: 'scss' },
		{ label: 'Shell', value: 'shell' },
		{ label: 'SQL', value: 'sql' },
		{ label: 'TOML', value: 'toml' },
		{ label: 'TSX', value: 'tsx' },
		{ label: 'Twig', value: 'twig' },
		{ label: 'TypeScript', value: 'typescript' },
		{ label: 'XML', value: 'xml' },
		{ label: 'YAML', value: 'yaml' }
	];

	function CodeSettings( { attributes, setAttributes, includeHighlights = true } ) {
		return el(
			PanelBody,
			{ title: __( 'Code display', 'docspress-blocks' ), initialOpen: true },
			el( ToggleControl, {
				label: __( 'Show line numbers', 'docspress-blocks' ),
				checked: attributes.showLineNumbers,
				onChange: ( showLineNumbers ) => setAttributes( { showLineNumbers } )
			} ),
			includeHighlights && el( TextControl, {
				label: __( 'Highlighted lines', 'docspress-blocks' ),
				help: __( 'Use commas and ranges, for example 2,4-6.', 'docspress-blocks' ),
				value: attributes.highlightedLines,
				onChange: ( highlightedLines ) => setAttributes( { highlightedLines } )
			} ),
			el( TextControl, {
				label: __( 'Caption', 'docspress-blocks' ),
				value: attributes.caption,
				onChange: ( caption ) => setAttributes( { caption } )
			} )
		);
	}

	window.docspressBlocksEditor = {
		Button,
		ButtonGroup,
		CodeSettings,
		Fragment,
		InspectorControls,
		MediaUpload,
		MediaUploadCheck,
		PanelBody,
		PanelColorSettings,
		PlainText,
		RangeControl,
		RichText,
		SelectControl,
		TextareaControl,
		TextControl,
		ToggleControl,
		__,
		designSupports,
		el,
		languages,
		presetClass,
		themeStyle,
		useBlockProps,
		useState
	};
} )( window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n );
