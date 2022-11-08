# Deno Minecraft

[![Package link](https://deno.land/badge/minecraft_lib/version)](https://deno.land/x/minecraft_lib)

A collection of modules that can be used to build Minecraft servers, clients, utilities and other tools.

Emphasis is on usability, ease of use, and having well-written tests to improve reliability and correctness. This library is focused solely on Minecraft Java Edition.

## Modules

### [`auth/`](https://deno.land/x/minecraft_lib/auth/)

Helper functions for authentication via Microsoft accounts and obtaining access tokens.

### [`chat/`](https://deno.land/x/minecraft_lib/chat/)

Functions and types for working with chat components. **Mostly incomplete**.

### [`io/`](https://deno.land/x/minecraft_lib/io/)

Helper classes and functions for writing and reading binary data. Includes a `Writer` and `Reader` class.

### [`nbt/`](https://deno.land/x/minecraft_lib/nbt/)

An implementation of Minecraft's named binary tag (NBT) format. Including:

- An encoder / decoder
- A parser for the SNBT, short for stringified NBT
- Ergonomic types for tags

Implementation of NBT-Path is also planned.

### [`network/`](https://deno.land/x/minecraft_lib/network/)

Primitives for building clients and servers. This includes a `Connection` class which handles the framing of packets, and can be used in combination with a `Protocol` definition for the automatic encoding/decoding of packets.

Only handshake and status protocols are included out-of-the-box.
