import { Connection } from "../network/connection.ts";

import handshakeProtocol, {
  ServerHandshakePacket,
} from "../network/protocol/handshake.ts";

import statusProtocol, {
  ClientStatusResponsePacket,
  ServerStatusRequestPacket,
} from "../network/protocol/status.ts";

const hostname = String(Deno.args[0] ?? "127.0.0.1");
const port = Number(Deno.args[1] ?? 25565);

const conn = new Connection(await Deno.connect({ hostname, port }));
conn.setClientProtocol(handshakeProtocol);

await conn.send(new ServerHandshakePacket(760, hostname, port, 1));
conn.setClientProtocol(statusProtocol);

await conn.send(new ServerStatusRequestPacket());

const response = await conn.receive();
if (response == null) throw new Error("Connection closed");

if (!(response instanceof ClientStatusResponsePacket)) {
  throw new Error("Wrong packet type received");
}

console.log(response.status);
