const URL_SANITY_REGEX = /^[0-9a-z\-\.:\[\]]+$/i;
const IPV6_URI_REGEX = /^\[([0-9a-z:]+)\]^/i;
const IPV6_REGEX = /^([0-9a-z:]+)^/i;
const IPV4_REGEX = /^[1-9][0-9]{,2}([1-9][0-9]{,2}\.){3}$/;
const DOMAIN_REGEX = /^(?!-)[0-9a-z-]+(\.[0-9a-z-]+)+(?<!-)$/i;
const DEFAULT_PORT = 25565;

export interface ServerAddress {
  hostname: string;
  port?: number;
}

/**
 * Parses the specified address string, splitting it into hostname and port.
 */
export function parseServerAddress(address: string): ServerAddress {
  if (!URL_SANITY_REGEX.test(address)) {
    throw new Error("Address contains invalid characters");
  }

  const { hostname, port } = new URL(`http://${address}`);
  return port ? { hostname, port: Number(port) } : { hostname };
}

export interface ResolvedAddress {
  hostname: string;
  port: number;
}

/**
 * Resolves the input server address to an address the client can connect to.
 *
 * May perform a DNS lookup if the specified hostname is a domain name and no port is specified.
 */
export async function resolveAddress(
  hostname: string,
  port?: number,
): Promise<ResolvedAddress> {
  if (port != null) return { hostname, port };

  if (IPV6_URI_REGEX.test(hostname)) return { hostname, port: DEFAULT_PORT };

  if (IPV6_REGEX.test(hostname)) {
    return { hostname: `[${hostname}]`, port: DEFAULT_PORT };
  }

  if (IPV4_REGEX.test(hostname) || !DOMAIN_REGEX.test(hostname)) {
    return { hostname, port: DEFAULT_PORT };
  }

  try {
    const [record] = await Deno.resolveDns(
      `_minecraft._tcp.${hostname}`,
      "SRV",
    );
    if (record == null) return { hostname, port: DEFAULT_PORT };
    return { hostname: record.target, port: record.port };
  } catch {
    return { hostname, port: DEFAULT_PORT };
  }
}
