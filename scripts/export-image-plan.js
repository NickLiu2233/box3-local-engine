'use strict'

/**
 * Images built by package-images use a release tag derived from the repository
 * version and target architecture. Runtime BOX_IMAGE_TAG values belong to
 * Compose deployments and must not redirect the export command to stale tags.
 */
function defaultExportImageTag(version, architecture) {
  return `v${version}-linux-${architecture}`
}

module.exports = { defaultExportImageTag }
