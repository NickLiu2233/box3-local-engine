# Deprecated Linux AMD64 package template

This legacy template is retained only for historical compatibility. New headless packages are generated from `distribution/server/` and include the shared graphical Web manager backed by Rust. Do not distribute this directory directly.

This package is for Intel/AMD 64-bit Linux servers (`x86_64`, `linux/amd64`).
It contains Creator, Play, Player Service, Player Auth Portal and VOXA images.
It does not include any deployment computer credentials, maps, models, player data or `.env`.

## First startup

1. Install Docker Engine with Docker Compose v2.
2. Extract the ZIP and enter the extracted directory.
3. Run `chmod +x *.sh`.
4. Run `./install.sh`.
5. Review `.env` before exposing the server publicly. PostgreSQL and Redis are optional remote services.

`install.sh` verifies the package, creates an `.env` with random secrets when OpenSSL is available, imports all five local images and starts the enabled services. It never installs PostgreSQL or Redis.

Use `./status.sh`, `./logs.sh [service]` and `./stop.sh` for routine operation. Stopping services preserves projects, maps, VOXA data and Docker volumes.

## External access

For a reverse proxy or LAN server, set `BOX_BIND_IP=0.0.0.0` and replace the five `*_PUBLIC_URL` values with the actual host name and ports. Keep Creator private or protected by a trusted reverse proxy. Open only the ports that are required in the server firewall.

## Data services

Leave `BOX_DATABASE_URL` empty to run maps without data storage and player services. With PostgreSQL configured, player identity and map storage are enabled. Redis is optional and only provides caching/runtime coordination.
