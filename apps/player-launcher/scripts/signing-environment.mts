/** GitHub exposes unset optional secrets as ''. electron-builder treats '' as a path. */
export function builderEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source }
  for (const key of ['CSC_LINK', 'WIN_CSC_LINK', 'CSC_INSTALLER_LINK', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']) {
    if (env[key] !== undefined && !env[key]!.trim()) delete env[key]
  }
  if (!env.CSC_LINK && !env.WIN_CSC_LINK) {
    delete env.CSC_KEY_PASSWORD
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  }
  return env
}
