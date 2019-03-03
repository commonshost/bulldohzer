ARG ARCH=amd64

FROM alpine as qemu

RUN apk add --no-cache curl

ARG QEMU_VERSION=3.1.0-2
ARG QEMU_ARCHS="arm aarch64"

RUN for i in ${QEMU_ARCHS}; \
	do \
	curl -fsSL https://github.com/multiarch/qemu-user-static/releases/download/v${QEMU_VERSION}/qemu-${i}-static.tar.gz \
	| tar zxvf - -C /usr/bin; \
	done \
	&& chmod +x /usr/bin/qemu-*

# ----------------------------------------------------------------------------

FROM ${ARCH}/node:11-alpine

# install qemu binaries used for cross-compiling
COPY --from=qemu /usr/bin/qemu-* /usr/bin/

RUN apk add --no-cache \
	git \
	curl \
	net-tools \
	drill

WORKDIR /app

# copy source files
COPY package.json ./
COPY source/ ./source

# running as root user gets stuck @ node ./prebuilt-bindings install
# as a workaround run as node user just for installation
# https://github.com/nodejs/docker-node/issues/873
RUN chown -R node:node /app
USER node

RUN npm install --production --no-optional

# switch back to root
USER root

# create link in path
RUN ln -s /app/source/bin.js /usr/local/bin/bulldohzer
RUN chmod +x /app/source/bin.js

# remove qemu binaries used for cross-compiling
RUN rm /usr/bin/qemu-*

ARG BUILD_DATE
ARG BUILD_VERSION
ARG VCS_REF

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="commonshost/bulldohzer"
LABEL org.label-schema.description="Performance measurement and benchmarking for DNS over HTTPS and DNS over UDP resolvers"
LABEL org.label-schema.url="https://help.commons.host/bulldohzer/"
LABEL org.label-schema.vcs-url="https://github.com/commonshost/bulldohzer"
LABEL org.label-schema.docker.cmd="docker run commonshost/bulldohzer --doh commonshost"
LABEL org.label-schema.build-date="${BUILD_DATE}"
LABEL org.label-schema.version="${BUILD_VERSION}"
LABEL org.label-schema.vcs-ref="${VCS_REF}"

ENTRYPOINT [ "bulldohzer" ]
