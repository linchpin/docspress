/**
 * Commit linting for the DocsPress fork.
 *
 * release-please derives every version and CHANGELOG entry from these messages, so a
 * malformed subject is not a style problem — it is a release that silently does not
 * happen. The rules live in @linchpinagency/commitlint-config so every Linchpin project
 * lints commits the same way and a convention change ships from one place.
 *
 * Format example
 *
 *   feat(LINCHPIN-5563): Link code excerpts to source
 *
 * or, with no task, NO-TASK or a GitHub issue number such as #42.
 */
module.exports = {
	extends: [ '@linchpinagency/commitlint-config' ],
};
