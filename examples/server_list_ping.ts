import { parseArgs } from "https://deno.land/std@0.210.0/cli/mod.ts";
import { Connection, parseServerAddress, resolveServerAddress } from "../network/mod.ts";
import {
  ClientboundStatusResponsePacket,
  ClientIntentionPacket,
  handshakeProtocol,
  ServerboundStatusRequestPacket,
  statusProtocol,
} from "./_protocol.ts";

const args = parseArgs(Deno.args, {
  string: ["protocol"],
  default: { protocol: 760 },
});

const protocol = Number(args.protocol ?? 760);
const address = args._[0]?.toString();
if (!address) throw new Error("No address specified");

const serverAddress = parseServerAddress(args._.join(" "));
const connectAddress = await resolveServerAddress(serverAddress);

const denoConn = await Deno.connect(connectAddress);
const conn = new Connection(denoConn);

conn.setClientProtocol(handshakeProtocol);
await conn.send(
  new ClientIntentionPacket(protocol, serverAddress.hostname, connectAddress.port, 1),
);

conn.setClientProtocol(statusProtocol);
await conn.send(new ServerboundStatusRequestPacket());

const response = await conn.receive();
if (response == null) {
  throw new Error("Connection closed");
} else if (!(response instanceof ClientboundStatusResponsePacket)) {
  throw new Error("Wrong packet received");
}

console.log(response.status);
