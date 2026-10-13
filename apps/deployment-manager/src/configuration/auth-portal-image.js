import { version } from '../../package.json';
import { state } from '../core/state.js';

export function defaultAuthPortalImage() {
    return `box-local-engine-player-auth-portal:${state.about?.imageTag || version}`;
}

// Display the concrete default without pinning it in the owner's configuration.
// An empty override follows the official image when the engine is upgraded.
export function normalizeAuthPortalImage(value) {
    const image = String(value || '').trim();
    return image === defaultAuthPortalImage() ? '' : image;
}
