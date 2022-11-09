# Deno Minecraft

[![Package link](https://deno.land/badge/minecraft_lib/version)](https://deno.land/x/minecraft_lib)

A collection of modules that can be used to build Minecraft servers, clients, utilities and other tools. This library focuses solely on Minecraft Java Edition.

The emphasis is on usability, ease of use and on being well tested to improve reliability and correctness.

## Modules

### [`auth/`](https://deno.land/x/minecraft_lib/auth/)

This module provides a preconfigured OAuth client that supports the authorization code and device code flow, as well as refreshing of access tokens, used for Microsoft account authentication. The module also includes a helper function to obtain the Minecraft access token via Xbox Live services.

### [`chat/`](https://deno.land/x/minecraft_lib/chat/)

Utilities for working with chat components. **Mostly incomplete**.

### [`io/`](https://deno.land/x/minecraft_lib/io/)

Helper classes and functions for writing and reading binary data used for network or file IO. These include the `Writer` and `Reader` classes.

### [`nbt/`](https://deno.land/x/minecraft_lib/nbt/)

An implementation of Minecraft's named binary tag (NBT) format. Including:

- An encoder / decoder
- A parser for the SNBT, short for stringified NBT
- Ergonomic types for tags

Implementation of NBT-Path is also planned.

### [`network/`](https://deno.land/x/minecraft_lib/network/)

Primitives for building clients and servers. This includes a `Connection` class which handles the framing of packets, and can be used in combination with a `Protocol` definition for the automatic encoding/decoding of packets.

Only handshake and status protocols are included out-of-the-box.
