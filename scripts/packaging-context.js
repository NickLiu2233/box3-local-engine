'use strict';

function versionForChannel(version, channel) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error('Invalid packaging version');
    }
    if (channel === 'production') {
        if (/(?:-|\.)(dev|staging)$/.test(version)) {
            throw new Error('Development and staging versions cannot enter production');
        }
        return version;
    }
    const base = version.replace(/(?:-|\.)(dev|staging)$/, '');
    return `${base}${base.includes('-') ? '.' : '-'}${channel}`;
}

/** Local packaging always uses dev, independently of the checked-out branch. */
function packagingContext(env, packageVersion, channelVariable = 'BOX_BUILD_CHANNEL') {
    const channel =
        env.GITHUB_ACTIONS === 'true'
            ? env[channelVariable] ||
              (env.GITHUB_REF === 'refs/heads/staging' ? 'staging' : 'production')
            : 'dev';
    if (!['dev', 'staging', 'production'].includes(channel)) {
        throw new Error('Unknown packaging channel');
    }
    return { channel, version: versionForChannel(packageVersion, channel) };
}

module.exports = { packagingContext, versionForChannel };
