export type DataRequest = {
  data: Uint8Array | null;
  loaded: boolean;
  error: boolean;
  abort?: () => void;
};

let retrieve:
  | ((out: DataRequest, url: string, timeout: number) => Promise<void>)
  | undefined;

export async function retrieveData(
  out: DataRequest,
  url: string,
  retryCount: number = 0,
  timeout: number = 0,
): Promise<void> {
  const count = Math.max(retryCount + 1, 1);

  if (!retrieve) {
    if (typeof XMLHttpRequest !== 'undefined') {
      retrieve = retrieveWithXHR;
    } else if (typeof fetch !== 'undefined') {
      retrieve = retrieveWithFetch;
    } else {
      return Promise.reject('Cannot request with xhr or fetch.');
    }
  }

  let adjustedTimeout = timeout;

  for (let i = 0; i < count; i++) {
    try {
      return await retrieve(out, url, adjustedTimeout);
    } catch (err) {
      if (i === count - 1) {
        return Promise.reject(err);
      }
    }

    adjustedTimeout = timeout << i;
  }
}

async function retrieveWithXHR(
  out: DataRequest,
  url: string,
  timeout: number,
): Promise<void> {
  const xhr = new XMLHttpRequest();

  xhr.open('get', url, true);

  xhr.responseType = 'arraybuffer';

  xhr.timeout = timeout;

  out.abort = () => xhr.abort();

  const promise = new Promise<Uint8Array>((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 && xhr.response) {
          resolve(new Uint8Array(xhr.response));
          return;
        }

        reject(
          `failed to retrieve resources: ${url}. with code ${xhr.status}.  ${xhr.statusText}`,
        );
      }
    };

    xhr.ontimeout = () => {
      reject(`failed to retrieve resources: ${url}.  timeout`);
    };

    xhr.onerror = () => {
      reject(`failed to retrieve resources: ${url}.  unspecified error`);
    };

    xhr.send();
  });

  try {
    const data = await promise;

    out.data = data;
    out.loaded = true;
  } catch (err) {
    out.error = true;

    return Promise.reject(err);
  }
}

async function retrieveWithFetch(
  out: DataRequest,
  url: string,
  timeout: number,
): Promise<void> {
  let signal: AbortSignal | undefined;

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();

    signal = controller.signal;

    if (timeout > 0) {
      setTimeout(() => {
        controller.abort(`Abort by timeout: ${timeout}`);
      }, timeout);
    }

    out.abort = () => {
      controller.abort('Abort manually.');
    };
  }

  try {
    const response = await fetch(url, { signal });

    const buffer = await response.arrayBuffer();

    out.data = new Uint8Array(buffer);

    out.loaded = true;
  } catch (err) {
    out.error = true;

    return Promise.reject(err);
  }
}
