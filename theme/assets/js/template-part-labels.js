( function ( data, i18n ) {
	'use strict';

	const { __ } = i18n;

	/*
	 * WordPress's content-only template navigator currently renders the base
	 * "Template Part" block title for every instance, even though the Header,
	 * Comments, and Footer entities have titles in theme.json. Keep the native
	 * blocks and replace only those generic quick-navigation labels.
	 */
	function templatePartBlocks( blockList ) {
		return blockList.reduce( ( found, block ) => {
			if ( block.name === 'core/template-part' ) {
				found.push( block );
			}
			return found.concat( templatePartBlocks( block.innerBlocks || [] ) );
		}, [] );
	}

	function templatePartLabel( slug ) {
		const labels = {
			header: __( 'Header', 'docspress' ),
			comments: __( 'Comments', 'docspress' ),
			footer: __( 'Footer', 'docspress' )
		};
		if ( labels[ slug ] ) {
			return labels[ slug ];
		}
		return String( slug || __( 'Template part', 'docspress' ) )
			.replace( /[-_]+/g, ' ' )
			.replace( /\b\w/g, ( character ) => character.toUpperCase() );
	}

	function updateTemplatePartNavigatorLabels() {
		const editor = data && data.select( 'core/block-editor' );
		if ( ! editor || ! editor.getBlocks ) {
			return;
		}

		const parts = templatePartBlocks( editor.getBlocks() );
		const buttons = Array.from(
			document.querySelectorAll( '.block-editor-block-quick-navigation__item' )
		).filter( ( button ) => button.querySelector( '.components-truncate' )?.textContent === 'Template Part' );
		if ( ! parts.length || buttons.length !== parts.length ) {
			return;
		}

		buttons.forEach( ( button, index ) => {
			const label = templatePartLabel( parts[ index ].attributes.slug );
			const text = button.querySelector( '.components-truncate' );
			if ( text && text.textContent !== label ) {
				text.textContent = label;
				button.setAttribute( 'aria-label', label );
			}
		} );
	}

	let editorNavigatorFrame = 0;
	function queueEditorNavigatorUpdate() {
		if ( editorNavigatorFrame ) {
			return;
		}
		editorNavigatorFrame = window.requestAnimationFrame( () => {
			editorNavigatorFrame = 0;
			updateTemplatePartNavigatorLabels();
		} );
	}

	if ( data ) {
		data.subscribe( queueEditorNavigatorUpdate );
		new MutationObserver( queueEditorNavigatorUpdate ).observe( document.documentElement, {
			childList: true,
			subtree: true
		} );
		queueEditorNavigatorUpdate();
	}
} )( window.wp.data, window.wp.i18n );
