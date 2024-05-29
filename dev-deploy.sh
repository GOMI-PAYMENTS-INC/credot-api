#!/bin/bash

BRANCH=main

cd /home/ec2-user/kr-gomi-settlement-api
git fetch --all
git reset origin/$BRANCH --hard

rm -rf node-modules

npm install
npm run build:client
npm run build:office
npm run build:consumer
npm run build:batch
npm run migrate:dev

# front-api
if [[ $(pm2 list | grep backend-client) ]]; then
  pm2 restart backend-client
else
  pm2 start --name "backend-client" node -- dist/apps/client/main.js
fi

# office-api
if [[ $(pm2 list | grep backend-office) ]]; then
  pm2 restart backend-office
else
  pm2 start --name "backend-office" node -- dist/apps/office/main.js
fi

# batch
if [[ $(pm2 list | grep backend-batch) ]]; then
  pm2 restart backend-batch
else
  pm2 start --name "backend-batch" node -- dist/apps/batch/main.js
fi

# consumer
if [[ $(pm2 list | grep backend-consumer) ]]; then
  pm2 restart backend-consumer
else
  pm2 start --name "backend-consumer" node -- dist/apps/consumer/main.js
fi

pm2 save