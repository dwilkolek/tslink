import { ConfigProvider } from "./config-provider";
import { resolve } from "url";
import { Db } from "./db";

const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

export class EpDbWorker {
    public db: Db = new Db();
    constructor() {
      
    }
}