(function () {
	'use strict';

	function normalizedPathname(value) {
		try {
			const pathname = decodeURIComponent(new URL(value, window.location.href).pathname)
				.replace(/\/{2,}/g, '/')
				.replace(/\/+$/, '');
			return pathname || '/';
		} catch (error) {
			return '';
		}
	}

	function enhanceCurrentNavigation(navigation) {
		if (!navigation) return;
		const currentPath = normalizedPathname(window.location.href);
		if (!currentPath) return;

		Array.from(navigation.querySelectorAll('a[href]')).forEach(function (link) {
			let url;
			try {
				url = new URL(link.href, window.location.href);
			} catch (error) {
				return;
			}
			if (url.origin !== window.location.origin) return;

			const linkPath = normalizedPathname(url.href);
			const exact = linkPath === currentPath;
			const ancestor = !exact && linkPath !== '/' && currentPath.startsWith(linkPath + '/');
			const item = link.closest('li');

			link.classList.toggle('is-current-page', exact);
			link.classList.toggle('is-current-ancestor', ancestor);
			if (item) {
				item.classList.toggle('is-current-page', exact);
				item.classList.toggle('is-current-ancestor', ancestor);
			}
			if (exact) {
				link.setAttribute('aria-current', 'page');
			} else if (link.getAttribute('aria-current') === 'page') {
				link.removeAttribute('aria-current');
			}
		});
	}

	enhanceCurrentNavigation(document.querySelector('.primary-navigation'));

	document.querySelectorAll('.entry-content pre').forEach(function (pre) {
		if (pre.closest('[class*="wp-block-docspress-"]')) return;
		const button = document.createElement('button');
		button.className = 'copy-code';
		button.type = 'button';
		button.textContent = 'Copy';
		button.setAttribute('aria-label', 'Copy code to clipboard');
		button.addEventListener('click', async function () {
			const code = pre.querySelector('code');
			try {
				await navigator.clipboard.writeText((code || pre).innerText);
				button.textContent = 'Copied';
				window.setTimeout(function () { button.textContent = 'Copy'; }, 1600);
			} catch (error) {
				button.textContent = 'Select to copy';
			}
		});
		pre.appendChild(button);
	});

	const downloadSection = document.querySelector('.home-download-section');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let downloadScrollFrame = 0;

	function updateDownloadFiligree() {
		downloadScrollFrame = 0;
		if (!downloadSection) return;
		if (reducedMotion.matches) {
			downloadSection.style.setProperty('--home-download-wapuu-shift', '0px');
			downloadSection.style.setProperty('--home-download-octocat-shift', '0px');
			return;
		}

		const bounds = downloadSection.getBoundingClientRect();
		const travel = window.innerHeight + bounds.height;
		const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / travel));
		const shift = Math.round((progress - 0.5) * 15000) / 100;
		downloadSection.style.setProperty('--home-download-wapuu-shift', shift + 'px');
		downloadSection.style.setProperty('--home-download-octocat-shift', -shift + 'px');
	}

	function queueDownloadFiligreeUpdate() {
		if (!downloadSection || downloadScrollFrame) return;
		downloadScrollFrame = window.requestAnimationFrame(updateDownloadFiligree);
	}

	if (downloadSection) {
		updateDownloadFiligree();
		window.addEventListener('scroll', queueDownloadFiligreeUpdate, { passive: true });
		window.addEventListener('resize', queueDownloadFiligreeUpdate);
		if (typeof reducedMotion.addEventListener === 'function') {
			reducedMotion.addEventListener('change', queueDownloadFiligreeUpdate);
		}
	}
})();
