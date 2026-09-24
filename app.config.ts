import { ExpoConfig } from '@expo/config-types'
import { ConfigContext } from '@expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...(config as ExpoConfig),
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://nvidia-desktop.tail11800a.ts.net/manifest',
      "codeSigningMetadata": (process.env.DISABLE_CODE_SIGNING ? undefined : { keyid: 'main', alg: 'rsa-v1_5-sha256' }),
      "codeSigningCertificate": (process.env.DISABLE_CODE_SIGNING ? undefined : './certs/certificate.pem'),
      "enabled": true,
      "enableBsdiffPatchSupport": !process.env.DISABLE_BSDIFF,
      "requestHeaders": {
        "expo-channel-name": "production",
        "expo-app-id": "2ab82ee4-d6bb-47ce-b0c2-4a0914dc12fc",
        "xprem-branch": ""
      },
    },
  };
}
