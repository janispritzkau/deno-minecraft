# Deno Minecraft

[![Package link](https://deno.land/badge/minecraft_lib/version)](https://deno.land/x/minecraft_lib)

A collection of modules that can be used to build Minecraft servers, clients, utilities and other tools. This library focuses solely on Minecraft Java Edition.

The emphasis is on usability, ease of use and on being well tested to improve reliability and correctness.

## Modules

### [`crypto/`](https://deno.land/x/minecraft_lib/crypto/)

Cryptographic primitives used for protocol encryption, signing, and signature verification.

### [`auth/`](https://deno.land/x/minecraft_lib/auth/)

Helper functions for authentication with Microsoft accounts and retrieving access tokens.

The module includes an OAuth client preconfigured with the client ID and OAuth endpoints of the official Minecraft launcher, and helper functions for obtaining the Minecraft access token via Xbox Live services.

### [`chat/`](https://deno.land/x/minecraft_lib/chat/)

Utilities for working with chat components. **Work in progress**.

### [`io/`](https://deno.land/x/minecraft_lib/io/)

Helper classes and functions for writing and reading binary data used for network or file IO. These include the `Writer` and `Reader` classes.

### [`nbt/`](https://deno.land/x/minecraft_lib/nbt/)

An implementation of Minecraft's named binary tag (NBT) format. Including:

- An encoder / decoder
- A parser for the SNBT, short for stringified NBT
- Ergonomic types for tags

### [`network/`](https://deno.land/x/minecraft_lib/network/)

Primitives for building clients and servers. This includes a `Connection` class which handles the framing of packets, and can be used in combination with a `Protocol` definition for the automatic encoding/decoding of packets.

Only handshake and status protocols are included out-of-the-box.
