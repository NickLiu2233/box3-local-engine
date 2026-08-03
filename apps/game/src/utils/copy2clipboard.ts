export function copyToClipboard (text:string, err?:(err:any) => void) : boolean {
    const w = window as any;
    if (w.clipboardData && w.clipboardData.setData) {
        // IE specific code path to prevent textarea being shown while dialog is visible.
        w.clipboardData.setData('Text', text);
        return true;
    } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        const textarea = document.createElement('textarea');
        textarea.textContent = text;
        textarea.style.position = 'fixed';  // Prevent scrolling to bottom of page in MS Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');  // Security exception may be thrown by some browsers.
            return true;
        } catch (ex) {
            err && err(ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
    return false;
}