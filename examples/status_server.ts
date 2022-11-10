import * as flags from "https://deno.land/std@0.161.0/flags/mod.ts";
import { Writer } from "../io/writer.ts";
import { Connection } from "../network/connection.ts";

import handshakeProtocol, {
  ServerHandshakeHandler,
} from "../network/protocol/handshake.ts";

import statusProtocol, {
  ClientStatusPongPacket,
  ClientStatusResponsePacket,
  ServerStatusHandler,
} from "../network/protocol/status.ts";

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
    async handleHandshake(packet) {
      if (packet.nextState == 1) {
        return conn.setServerProtocol(
          statusProtocol,
          createStatusHandler(conn),
        );
      } else if (packet.nextState == 2) {
        await conn.receiveRaw(); // wait for login start packet
        await conn.sendRaw(
          new Writer().writeVarInt(0)
            .writeJson({ text: "Login not implemented!" })
            .bytes(),
        );
      }
      conn.close();
    },
  };
}

function createStatusHandler(conn: Connection): ServerStatusHandler {
  return {
    async handleRequest() {
      await conn.send(
        new ClientStatusResponsePacket({
          version: { name: "1.19.2", protocol: 760 },
          players: { online: 0, max: 0 },
          description: "Fake status message",
        }),
      );
    },
    async handlePing(ping) {
      await conn.send(new ClientStatusPongPacket(ping.id));
    },
  };
}
