# syntax = docker/dockerfile:1

# Run with:
# docker build -t tinyluma/px .
# docker run -p 3000:3000 --env-file .env tinyluma/px


# Adjust NODE_VERSION as desired
ARG NODE_VERSION=lts
# ALPINE: FROM node:${NODE_VERSION}-alpine as base
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /build

ARG PNPM_VERSION=8.6.7
RUN npm install -g pnpm@$PNPM_VERSION
RUN pnpm config set update-notifier false


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
# ALPINE: RUN apk add --no-cache make gcc g++ python3
RUN apt-get update -qq && \
    apt-get install -y python-is-python3 pkg-config build-essential

# Install node modules
COPY --link package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
# Prevent breaking cache by only copying what's needed
COPY --link ./src ./src
COPY --link ./tsconfig.json .

# Build application
RUN pnpm run build

# Remove development dependencies
RUN pnpm prune --prod

# ALPINE: FROM golang:alpine as tls-client-build
FROM golang:1.18 as tls-client-build

WORKDIR /build

# Git version tag
ARG TLS_VERSION=1.5.0
ARG TLS_ARCH=amd64

# Install build requirements
# ALPINE: RUN apk add --no-cache curl zip gcc g++
RUN apt-get update -qq && \
    apt-get install -y curl zip build-essential

# Download and unpack latest code.
# Use curl instead of "git clone" since there's tons of binaries in the commit history which take forever to clone.
RUN curl -sSLo output.zip https://github.com/bogdanfinn/tls-client/archive/refs/tags/v${TLS_VERSION}.zip
RUN unzip output.zip -d ./ && cd tls-client*

# Build
# https://stackoverflow.com/questions/53048942/is-it-possible-to-get-the-architecture-of-the-docker-engine-in-a-dockerfile
# ALPINE: RUN cd /build/tls-client*/cffi_dist && GOOS=linux CGO_ENABLED=1 GOARCH=${TLS_ARCH} go build -buildmode=c-shared -o /build/dist/tls-client-linux-alpine-${TLS_ARCH}-${TLS_VERSION}.so
RUN cd /build/tls-client*/cffi_dist && GOOS=linux CGO_ENABLED=1 GOARCH=${TLS_ARCH} go build -buildmode=c-shared -o /build/dist/tls-client-linux-ubuntu-${TLS_ARCH}-${TLS_VERSION}.so

# Final stage for app image
FROM base

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built application
COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --link ./package.json ./
COPY --link ./drizzle.config.ts ./
#COPY --link ./drizzle ./drizzle
COPY --link ./resources ./resources
#COPY --from=build /app /app
#COPY --from=build /build/package.json ./
#COPY --from=build /build/drizzle.config.ts ./
#COPY --from=build /build/node_modules ./node_modules
#COPY --from=build /build/dist ./build
#COPY --from=build /build/drizzle ./drizzle
#COPY --from=build /build/resources ./resources
#COPY --from=build /build/lib ./lib
COPY --from=tls-client-build /build/dist ./lib

# Setup cron job
RUN echo "0 0 * * * cd /app && pnpm run cron >> /var/log/cron.log" >> /etc/cron.d/main
RUN ln -sf /dev/stdout /var/log/cron.log

# Certifcate pinning breaks without this
RUN apt-get update -qq && \
    apt-get install -y ca-certificates

# Start the server by default, this can be overwritten at runtime
ENV PORT=3000
EXPOSE ${PORT}
ENTRYPOINT ["pnpm", "run", "start"]