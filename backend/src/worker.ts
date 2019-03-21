import { ConfigProvider } from "./config-provider";
import { resolve } from "url";

const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

export class EpDbWorker {
    private _db: any;
    constructor() {
      
    }


    get db():Promise<any> {        
        return new Promise(resolve => {
            if (!this._db) {
                MongoClient.connect(ConfigProvider.get().db.url, (err: any, client: any) => {
                    console.log("Connected successfully to server");
                    this._db = client.db(ConfigProvider.get().db.name);
                    
                    resolve(this._db);
                });
            } else {
                resolve(this._db);
            }
           
        })
       
    }


}