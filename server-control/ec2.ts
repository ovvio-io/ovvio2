import { kSecondMs } from '../base/date.ts';
import { retry, TryAgain } from '../base/time.ts';

export async function generateInstanceMetadataToken(
  ttlSec: number,
  timeoutMs: number
): Promise<string | undefined> {
  try {
    return await retry(async () => {
      const resp = await fetch('http://169.254.169.254/latest/api/token', {
        method: 'PUT',
        headers: {
          'X-aws-ec2-metadata-token-ttl-seconds': String(ttlSec),
        },
      });
      if (resp.status !== 200) {
        throw new TryAgain();
      }
      const token = await resp.text();
      if (token.length > 0) {
        return token;
      }
      throw new TryAgain();
    }, timeoutMs);
  } catch (_: unknown) {
    return undefined;
  }
}

export class EC2MetadataToken {
  private _value: string | undefined;

  constructor(ttlSec = 21600) {
    this.refreshToken(ttlSec);
  }

  get value(): string | undefined {
    return this._value;
  }

  private async refreshToken(ttlSec: number): Promise<void> {
    const token = await generateInstanceMetadataToken(
      ttlSec,
      ttlSec * 1000 * 0.1 // To milliseconds / 10
    );
    this._value = token;
    setTimeout(
      () => this.refreshToken(ttlSec),
      token === undefined ? 10 * kSecondMs : ttlSec * 1000 * 0.9 // To ms / 90
    );
  }
}

export async function getMetadata(
  token: EC2MetadataToken,
  path: string
): Promise<string | undefined> {
  const tokenValue = token.value;
  if (!tokenValue) {
    return undefined;
  }
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  const resp = await fetch('http://169.254.169.254/latest/meta-data/' + path, {
    headers: {
      'X-aws-ec2-metadata-token': tokenValue,
    },
  });
  if (resp.status !== 200) {
    return undefined;
  }
  return await resp.text();
}

export async function getTenantId(
  token: EC2MetadataToken
): Promise<string | undefined> {
  return await getMetadata(token, 'tags/instance/OvvioTenantId');
}
