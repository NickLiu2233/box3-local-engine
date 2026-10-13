import { hasWebManagerToken, invoke, setWebManagerToken } from '../infrastructure/transport.js';
import { refreshStatus } from './status.js';
import { render } from '../core/render-request.js';
import { state } from '../core/state.js';
import { checkForUpdates } from './updates.js';

export async function submitWebManagerToken(event) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get('token') || '').trim();
    const error = document.querySelector('#web-login-error');
    if (error) {
        error.textContent = '';
    }
    setWebManagerToken(token);
    try {
        await invoke('get_system_status');
        // Leave the gate before refreshing; otherwise render() keeps drawing the
        // login panel even though the console is already authenticated.
        state.page = 'overview';
        await refreshStatus();
        checkForUpdates();
    } catch (failure) {
        setWebManagerToken('');
        if (error) {
            error.textContent = String(failure.message || failure);
        }
    }
}

export function startWebManager() {
    if (!hasWebManagerToken()) {
        state.page = 'web-login';
        render();
        return;
    }
    // A rotated or expired token must return to the gate. Without this check the
    // console renders as if Docker were unreachable, which hides the real cause.
    invoke('get_system_status')
        .then(async () => {
            await refreshStatus();
            checkForUpdates();
        })
        .catch(() => {
            setWebManagerToken('');
            state.page = 'web-login';
            render();
        });
}
