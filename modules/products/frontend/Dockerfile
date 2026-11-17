FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm ci --workspace=@shopzone/products-mfe --include-workspace-root

RUN npm run build --workspace=@shopzone/products-mfe

EXPOSE 3002

CMD ["npm", "run", "preview", "--workspace=@shopzone/products-mfe", "--", "--port", "3002"]
