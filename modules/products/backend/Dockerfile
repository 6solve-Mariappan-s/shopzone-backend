FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm ci --workspace=@shopzone/products-api --include-workspace-root --omit=dev

EXPOSE 5002

CMD ["npm", "start", "--workspace=@shopzone/products-api"]
