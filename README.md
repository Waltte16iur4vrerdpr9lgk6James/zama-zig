# Zama FHE Zig Bindings

A foundational toolkit that brings Fully Homomorphic Encryption (FHE) to the Zig programming language. This project enables developers building in Zig to seamlessly integrate privacy-preserving computation without sacrificing performance or developer ergonomics. By leveraging the existing power of TFHE-rs (a Rust-based FHE library), this project exposes a clean Zig-style API through a C ABI layer.

## Overview

Zig is gaining popularity for its emphasis on performance, safety, and low-level control. However, advanced cryptographic tools, particularly in the area of homomorphic encryption, are not widely available for the Zig ecosystem. This project aims to fill that gap by offering bindings to a proven FHE implementation.

With these bindings, developers can write Zig applications that operate directly on encrypted data. Sensitive values remain encrypted throughout their lifecycle, allowing applications to perform computations without ever exposing plaintext to memory or disk.

## Why FHE Matters Here

Traditional encryption methods protect data at rest and in transit, but once decrypted for processing, the data becomes vulnerable. FHE changes this paradigm by enabling computations directly on ciphertexts. The Zig bindings make this capability accessible to a new class of systems software, embedded tools, and performance-critical applications.

Practical examples include:

- Secure data processing in high-performance services written in Zig  
- Privacy-preserving analytics in systems where latency and efficiency matter  
- Encrypted communication protocols that never expose sensitive state  
- Embedded devices that can process user data securely without increasing attack surface  

## Key Features

- **C ABI Layer**: Functions exported from TFHE-rs are exposed to Zig via a clean, stable C interface.  
- **Zig-native Wrappers**: Provides idiomatic Zig wrappers around the raw C ABI functions for a natural developer experience.  
- **Performance-Oriented**: Minimal overhead in crossing the Zig/Rust boundary.  
- **Extensive Testing**: Includes integration tests to ensure correctness of encryption, computation, and decryption workflows.  
- **Sample Applications**: Example projects demonstrating typical use cases, from encrypted search to private counters.  

## Architecture

The project is composed of three main layers:

1. **TFHE-rs Core** (Rust): Implements the underlying cryptographic operations and maintains security guarantees.  
2. **C ABI Layer** (Rust → C): Exposes a minimal surface of functions usable from foreign languages.  
3. **Zig Bindings** (Zig): Provides Zig-style APIs wrapping the C ABI, with error handling and type safety aligned with Zig’s philosophy.  

This layered architecture ensures separation of concerns while maximizing usability in Zig projects.

## Usage Example

```zig
const std = @import("std");
const fhe = @import("fhe");

pub fn main() void {
    var gpa = std.heap.page_allocator;

    // Initialize encryption keys
    var ctx = try fhe.Context.init(gpa);

    // Encrypt a value
    const ciphertext = try ctx.encryptInt(42);

    // Perform encrypted computation
    const doubled = try ctx.add(ciphertext, ciphertext);

    // Decrypt result
    const result = try ctx.decryptInt(doubled);
    std.debug.print("Decrypted result: {d}
", .{ result });
}
```

This demonstrates how Zig developers can handle encrypted values as if they were ordinary integers, without ever exposing the plaintext.

## Security Considerations

- **End-to-End Encryption**: Data remains encrypted throughout the workflow.  
- **Minimal Attack Surface**: Zig bindings expose only necessary cryptographic operations.  
- **Memory Safety**: Leveraging Zig’s memory management model to prevent accidental leaks or unsafe handling.  
- **Auditable Layers**: Clear separation between cryptographic core, ABI, and bindings allows for focused audits.  

## Roadmap

- **Expanded API Coverage**: Extend Zig wrappers to cover more advanced FHE operations, such as bootstrapping and programmable bootstraps.  
- **Performance Benchmarks**: Systematic benchmarking of Zig vs. Rust overhead in FHE computations.  
- **Embedded Targets**: Optimize for lightweight systems where Zig is often deployed.  
- **Developer Tools**: Add Zig build system integration, documentation, and utility scripts.  
- **Long-term Vision**: Establish Zig as a first-class language for building FHE-powered applications.  

## Contributing

Contributions are welcome! Developers can help by:  

- Writing tests for new cryptographic operations  
- Extending the Zig API surface  
- Providing feedback on ergonomics and performance  
- Experimenting with novel use cases of FHE in Zig projects  

## License

This project is open source and available under a permissive license suitable for cryptographic software.

---

Bringing FHE to Zig marks a step forward in making privacy-preserving computation available to more systems programmers, embedded developers, and security-conscious engineers worldwide.
