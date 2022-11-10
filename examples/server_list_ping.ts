import * as flags from "https://deno.land/std@0.161.0/flags/mod.ts";

import {
  Connection,
  parseServerAddress,
  resolveServerAddress,
} from "../network/mod.ts";

import handshakeProtocol, {
  ServerHandshakePacket,
} from "../network/protocol/handshake.ts";

import statusProtocol, {
  ClientStatusResponsePacket,
  ServerStatusRequestPacket,
} from "../network/protocol/status.ts";

const args = flags.parse(Deno.args, {
  string: ["protocol"],
  default: { protocol: 760 },
});

const protocol = Number(args.protocol ?? 760);
const address = args._[0]?.toString();
if (!address) throw new Error("No address specified");

const { hostname, port } = parseServerAddress(args._.join(" "));
const addr = await resolveServerAddress(hostname, port);

const denoConn = await Deno.connect(addr);
const conn = new Connection(denoConn);

conn.setClientProtocol(handshakeProtocol);
await conn.send(new ServerHandshakePacket(protocol, hostname, addr.port, 1));

conn.setClientProtocol(statusProtocol);
await conn.send(new ServerStatusRequestPacket());

const response = await conn.receive();
if (response == null) {
  throw new Error("Connection closed");
} else if (!(response instanceof ClientStatusResponsePacket)) {
  throw new Error("Wrong packet received");
}

console.log(response.status);
