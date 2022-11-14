/**
 * Network primitives for building clients and servers.
 *
 * The {@linkcode Connection} handles most of the network-related things,
 * such as compression and framing of packets. Additionally, packets can be
 * automatically decoded and encoded by specifying a {@linkcode Protocol}.
 *
 * ### Server list ping example
 *
 * ```ts
 * import { Connection } from "https://deno.land/x/minecraft_lib/network/mod.ts";
 *
 * import handshakeProtocol, {
 *   ServerHandshakePacket,
 * } from "https://deno.land/x/minecraft_lib/network/protocol/handshake.ts";
 *
 * import statusProtocol, {
 *   ClientStatusResponsePacket,
 *   ServerStatusRequestPacket,
 * } from "https://deno.land/x/minecraft_lib/network/protocol/status.ts";
 *
 * const hostname = "127.0.0.1";
 * const port = 25565;
 *
 * const denoConn = await Deno.connect({ hostname, port });
 * const conn = new Connection(denoConn);
 *
 * conn.setClientProtocol(handshakeProtocol);
 * await conn.send(new ServerHandshakePacket(760, hostname, port, 1));
 *
 * conn.setClientProtocol(statusProtocol);
 * await conn.send(new ServerStatusRequestPacket());
 *
 * const response = await conn.receive();
 * if (response == null) {
 *   throw new Error("Connection closed");
 * } else if (!(response instanceof ClientStatusResponsePacket)) {
 *   throw new Error("Wrong packet received");
 * }
 *
 * console.log(response.status);
 * ```
 *
 * ### Handshake packet handler example
 *
 * ```ts
 * import { Writer } from "https://deno.land/x/minecraft_lib/io/mod.ts";
 * import { Connection } from "https://deno.land/x/minecraft_lib/network/mod.ts";
 * import handshakeProtocol from "https://deno.land/x/minecraft_lib/network/protocol/handshake.ts";
 *
 * for await (const denoConn of Deno.listen({ port: 25565 })) {
 *   const conn = new Connection(denoConn);
 *
 *   conn.setServerProtocol(handshakeProtocol, {
 *     async handleHandshake(packet) {
 *       if (packet.nextState == 1) {
 *         // return conn.setServerProtocol(statusProtocol, statusHandler);
 *       } else if (packet.nextState == 2) {
 *         await conn.sendRaw(
 *           new Writer().writeVarInt(0x00).writeJson("Login not implemented!")
 *             .bytes(),
 *         );
 *       }
 *       conn.close();
 *     },
 *   });
 *
 *   (async () => {
 *     while (true) {
 *       const packet = await conn.receive();
 *       if (packet == null) break;
 *     }
 *   })().catch((e) => {
 *     console.log("error in receive loop:", e);
 *   }).finally(() => {
 *     conn.close();
 *   });
 * }
 * ```
 *
 * @module
 */

export * from "./address.ts";
export * from "./packet.ts";
export * from "./protocol.ts";
export * from "./connection.ts";
