FROM node:10

WORKDIR /var/tslink   

COPY ./release/tslink ./

COPY ./docker/config.json ./config.json

RUN npm init -y

RUN npm i event-stream

RUN chmod +x tslink

CMD ["./tslink"]

EXPOSE 9190