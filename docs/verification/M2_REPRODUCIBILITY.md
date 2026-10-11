# Milestone 2 Wasm reproducibility

Starting source: b87cbe86e5b07641621b7db358ddcba9caa1cdc9. Rust contract source and lockfile unchanged in Run2.

A fresh `git archive` was extracted into `/tmp/zigoals-m2-repro` with no target directory. `CARGO_NET_OFFLINE=true`, locked dependency cache, Rust1.85.1, Binaryen123.0.0 and cosmwasm-check2.2.2 were used. The checked-in build script compiled from scratch in that isolated directory, normalized with Binaryen `-Oz --signext-lowering`, then validated the result. Release compilation finished in 16.20s; validator reported all contracts (1) passed.

SHA256 for both M1 artifact and clean Run2 artifact:

`090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25`

Both are 258540 bytes. This proves byte-for-byte repeatability across clean source/target directories on the same host with the same pinned cached toolchain. It does **not** prove a container build, an independent host build, or hosted CI.

Docker engine remains unavailable: `failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory`. No Docker optimizer ran. No contract semantics changed to obtain the hash.
