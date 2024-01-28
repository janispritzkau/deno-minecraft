# Deno Minecraft

[![Package link](https://deno.land/badge/minecraft_lib/version)](https://deno.land/x/minecraft_lib)

A collection of modules that can be used to build Minecraft servers, clients, utilities and other tools. This library focuses solely on Minecraft Java Edition.

The emphasis is on usability, ease of use and on being well tested to improve reliability and correctness.

It will probably never be as complete as I envisioned it to be, but still contains some useful modules that you can use as is or as a reference for your own projects. In the future, there may be this core library and implementations of version-specific types and protocols which build on this core library.

## Modules

### [`auth/`](https://deno.land/x/minecraft_lib/auth/)

Helper functions for authentication with Microsoft accounts and retrieval of access tokens.

### [`chat/`](https://deno.land/x/minecraft_lib/chat/)

> Incomplete and untested.

Types for working with Minecraft chat components.

### [`core/`](https://deno.land/x/minecraft_lib/core/)

Miscellaneous types, which are used in a lot of places.

### [`crypto/`](https://deno.land/x/minecraft_lib/crypto/)

Cryptographic primitives used for protocol encryption, signing, and signature verification.

### [`io/`](https://deno.land/x/minecraft_lib/io/)

Utilites for reading and writing binary data.

### [`locale/`](https://deno.land/x/minecraft_lib/locale/)

> Incomplete and untested.

Types used for specifying languages and getting translation strings.

### [`nbt/`](https://deno.land/x/minecraft_lib/nbt/)

An implementation of Minecraft's named binary tag (NBT) format.

### [`network/`](https://deno.land/x/minecraft_lib/network/)

Network primitives used for building clients and servers.

### [`world/`](https://deno.land/x/minecraft_lib/world/)

> Experimental, incomplete and untested.

Types and abstractions for defining blocks and items.
