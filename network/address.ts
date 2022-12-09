const URL_SANITY_REGEX = /^[0-9a-z\-\.:\[\]]+$/i;
const IPV6_URI_REGEX = /^\[([0-9a-z:]+)\]^/i;
const IPV6_REGEX = /^([0-9a-z:]+)^/i;
const IPV4_REGEX = /^[1-9][0-9]{,2}([1-9][0-9]{,2}\.){3}$/;
const DOMAIN_REGEX = /^(?!-)[0-9a-z-]+(\.[0-9a-z-]+)+(?<!-)$/i;
const DEFAULT_PORT = 25565;

/** Represents a user specified server address. */
export interface ServerAddress {
  hostname: string;
  port?: number;
}

/** Parses the address string, splitting it into hostname and port. */
export function parseServerAddress(input: string): ServerAddress {
  if (!URL_SANITY_REGEX.test(input)) {
    throw new Error("Address contains invalid characters");
  }

  const { hostname, port } = new URL(`http://${input}`);
  return port ? { hostname, port: Number(port) } : { hostname };
}

/** A resolved address which may be used to connect to the server. */
export interface ConnectAddress {
  hostname: string;
  port: number;
}

/** Resolves the server address to an address the client can connect to. */
export async function resolveServerAddress(address: ServerAddress): Promise<ConnectAddress> {
  const { hostname, port } = address;
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
    return { hostname: record.target.replace(/\.$/, ""), port: record.port };
  } catch {
    return { hostname, port: DEFAULT_PORT };
  }
}
