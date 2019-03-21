const express = require('express');
import * as path from 'path';
import { Job } from './job';
import { App } from './app';

class Server {
    public app: any;
    private port = 9090;

    public static bootstrap(): Server {
        return new Server();
    }
    files: string[] = [];
    constructor() {
        const UI_PATH = '../../frontend/dist/frontend/';
        const allowedExt = [
            '.js',
            '.ico',
            '.css',
            '.png',
            '.jpg',
            '.woff2',
            '.woff',
            '.ttf',
            '.svg',
        ];
        // Create expressjs application
        this.app = express();
        App.getInstance().scanDirectory().then(files => {
            this.files = files;
        });
        // Route our backend calls
        this.app.get('/api/storedJobs', (req: any, res: any) => {
            console.log('files,', this.files)
            res.json(this.files);
        });
        this.app.get('/api/runAllStoredJobs', (req: any, res: any) => {
            console.log('files,', this.files);
            App.getInstance().scanDirectory().then(files => {
                files.forEach(file => {
                    App.getInstance().runJob(file);
                })
            });
            res.json({ jobs: this.files, started: true });
        });
        this.app.get('/api/stats', (req: any, res: any) => {
            res.json(
                App.getInstance().jobs.map(job => {
                    return job.counterStore.json();
                })
            );
        });
           

        // Redirect all the other resquests
        this.app.get('*', (req: Request, res: Response) => {
            if (allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
                (<any>res).sendFile(path.resolve(`${UI_PATH}${req.url}`));
            } else {
                (<any>res).sendFile(path.resolve(`${UI_PATH}index.html`));
            }
        });

        // Depending on your own needs, this can be extended
        // this.app.use(bodyParser.json({ limit: '50mb' }));
        // this.app.use(bodyParser.raw({ limit: '50mb' }));
        // this.app.use(bodyParser.text({ limit: '50mb' }));
        // this.app.use(bodyParser.urlencoded({
        //   limit: '50mb',
        //   extended: true
        // }));

        // Start the server on the provided port
        this.app.listen(this.port, () => console.log(`http is started ${this.port}`));

        // Catch errors
        this.app.on('error', (error: any) => {
            console.error('ERROR', error);
        });

        process.on('uncaughtException', (error: any) => {
            console.log(error);
        });
    }
}

//Bootstrap the server, so it is actualy started
const server = Server.bootstrap();
export default server.app;