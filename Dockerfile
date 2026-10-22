FROM node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=3000 DATA_DIR=/app/data NODE_ENV=production
# mount a Dokploy volume here so accounts survive redeploys
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server.js"]
