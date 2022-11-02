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

const listener = Deno.listen({ hostname: "127.0.0.1", port: 25565 });

for await (const denoConn of listener) {
  const addr = <Deno.NetAddr> denoConn.remoteAddr;
  console.log(`new connection ${addr.hostname}:${addr.port}`);

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
  }).finally(() => {
    conn.close();
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
        await conn.sendRaw(
          new Writer().writeVarInt(0x00).writeJSON("Login not implemented!")
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
