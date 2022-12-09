import * as flags from "https://deno.land/std@0.161.0/flags/mod.ts";
import { Writer } from "../io/writer.ts";
import { Connection } from "../network/connection.ts";
import {
  ClientboundPongResponsePacket,
  ClientboundStatusResponsePacket,
  handshakeProtocol,
  ServerHandshakeHandler,
  ServerStatusHandler,
  statusProtocol,
} from "./_protocol.ts";

const args = flags.parse(Deno.args, {
  string: ["hostname", "port"],
  default: { hostname: "127.0.0.1", port: 25565 },
});

const hostname = args.hostname;
const port = Number(args.port);
const listener = Deno.listen({ hostname, port });

console.log(`server listening on ${hostname}:${port}`);

for await (const denoConn of listener) {
  const conn = new Connection(denoConn);
  conn.setServerProtocol(handshakeProtocol, createHandshakeHandler(conn));

  (async () => {
    while (true) {
      const packet = await conn.receive();
      if (packet == null) break;
      console.log("received", packet);
    }
  })().catch((e) => {
    console.log("error in receive loop:", e);
    if (!conn.closed) conn.close();
  });
}

function createHandshakeHandler(conn: Connection): ServerHandshakeHandler {
  return {
    async handleIntention(packet) {
      if (packet.intention == 1) {
        return conn.setServerProtocol(
          statusProtocol,
          createStatusHandler(conn),
        );
      } else if (packet.intention == 2) {
        await conn.receiveRaw(); // wait for hello packet
        await conn.sendRaw(
          new Writer().writeVarInt(0)
            .writeString(JSON.stringify({ text: "Login not implemented!" }))
            .bytes(),
        );
      }
      conn.close();
    },
  };
}

function createStatusHandler(conn: Connection): ServerStatusHandler {
  return {
    async handleStatusRequest() {
      await conn.send(
        new ClientboundStatusResponsePacket({
          version: { name: "1.19.2", protocol: 760 },
          players: { online: 0, max: 0 },
          description: "Fake status message",
        }),
      );
    },
    async handlePingRequest(packet) {
      await conn.send(new ClientboundPongResponsePacket(packet.time));
    },
  };
}
