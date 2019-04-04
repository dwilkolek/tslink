# TSlink
[![CodeFactor](https://www.codefactor.io/repository/github/dwilkolek/tslink/badge/master)](https://www.codefactor.io/repository/github/dwilkolek/tslink/overview/master) [![CircleCI](https://circleci.com/gh/dwilkolek/tslink.svg?style=svg&circle-token=9f6cf1a914d8c6d59fecd962b78f138fc6c38db7)](https://circleci.com/gh/dwilkolek/tslink)
## installing dependecies
`npm install`

## building release 
`npm run release`

## requirements
- redis
- mongodb

## config.json (should be in the same directory as executable)
```
{
    "db": {
        "name": "tslink",
        "url": "mongodb: //localhost:27017"
    },
    "forceSlowDownOnMemory": 1000,
    "inMemoryOffsetCaching": true,
    "jobsDirectory": "./jobs",
    "limitJobsPerWorker": 1,
    "redis": {
        "host": "127.0.0.1",
        "port": 6379
    },
    "slaveWorkerCount": 8,
    "tempZipDirectory": "./zips",
    "workspaceDirectory": "./workspace"
}
```

## starting local env
### start server
`npm start`
Server is listening at :9090

### start ui
1. `cd ui`
2. `npm start`

## running release
- linux `./tslink`
- windows `./tslink.exe`
Server is listening at :4200

## running from docker-compose
- Before running it go through 
    `npm install && npm run release`
- then:
    `npm run docker-build && npm run docker-run`
Enjoy :)
