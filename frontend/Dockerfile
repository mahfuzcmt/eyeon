# --- Build stage ----------------------------------------------------------
# NEXT_PUBLIC_* vars are baked into the bundle at build time, so they must be
# present here (passed as --build-arg from docker compose).
FROM node:22-alpine AS build
WORKDIR /workspace

ARG NEXT_PUBLIC_API_BASE=/api/proxy
ARG NEXT_PUBLIC_WS_BASE
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE \
    NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Runtime stage --------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nextjs \
 && adduser --system --uid 1001 --ingroup nextjs nextjs

COPY --from=build --chown=nextjs:nextjs /workspace/public ./public
COPY --from=build --chown=nextjs:nextjs /workspace/.next ./.next
COPY --from=build --chown=nextjs:nextjs /workspace/node_modules ./node_modules
COPY --from=build --chown=nextjs:nextjs /workspace/package.json ./package.json

USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
