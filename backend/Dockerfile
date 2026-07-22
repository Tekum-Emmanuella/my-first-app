# Stage 1: Build Phase
FROM rust:latest AS builder
WORKDIR /app

# Copy Cargo configs
COPY Cargo.toml Cargo.lock ./

# Fetch dependencies and cache layers
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy source and compile release binary
COPY src ./src
RUN cargo build --release

# Stage 2: Production Execution Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/sylvora-backend /app/sylvora-backend

EXPOSE 5000
ENV RUST_LOG=info

CMD ["/app/sylvora-backend"]