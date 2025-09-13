export const currentPlatform = process.platform === 'win32' ? 'windows' :
                 process.platform === 'darwin' ? 'macos' :
                 process.platform === 'linux' ? 'linux' :
                 'unknown';