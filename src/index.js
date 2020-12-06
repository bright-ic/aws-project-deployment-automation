const {spawn} = require("child_process");
const fse = require("fs-extra");
require('dotenv').config();
const {
    generateRandomCodes, 
    create_dir,
    clone_repository,
    addOrReplaceFile,
    jsonReader
} = require("./util/helpers");
const {URL} = require("url");
const nodegit = require("nodegit");
const path = require("path");


const backend_repo = process.env.APP_REPO || "";
const codeCommit_user = process.env.CODE_COMMIT_USERNAME || "";
const codeCommit_pass = process.env.CODE_COMMIT_PASSWORD || "";
const eventName = "eventnameEnvlor"+generateRandomCodes(1,6,6);
const event_dir = process.cwd()+"../../events/"+eventName;

const backend_path = event_dir+"/cdk-backend";
const backend_event_config_path = backend_path+"/config";
const backend_event_config_file =backend_event_config_path+"/eventConfig.json";
const event_data = {id: "EV1236"};

const nodeGitCredential = (url, username) => {
    if (url.startsWith('https://') && url.includes('@')) {
        url = new URL(url)
        return nodegit.Cred.userpassPlaintextNew(url.username, url.password);
    } else if (url.startsWith('https://git-codecommit')) {
        url = new URL(url);
        return nodegit.Cred.userpassPlaintextNew(codeCommit_user, codeCommit_pass);
    } else {
        return nodegit.Cred.sshKeyFromAgent(username)
    }
}

const cred_options = {
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 1,
        credentials: nodeGitCredential
      },
    },
  }

let npm = (process.platform.indexOf("win") != -1 ? "npm.cmd" : "npm");
//   run cdk backend npm install
const runCDKBackEndNPMInstall = async  (dir="") =>{
    
    console.log("running npm install on CDK backend on : "+dir);

    try {
        const npmInstall = spawn(npm, ['install'], { cwd: dir, shell: /^win/.test(process.platform) });

        npmInstall.stdout.on('data', function(data) {
            console.log("output: "+data);
        });

        npmInstall.stderr.on('data', data => {
            console.log('output (msg): '+data)
        });

        npmInstall.on('error', error => {
            console.log('error: '+error.message)
        });

        npmInstall.on('close', code => {
            if(code === 0) {
                runCDKNPMBuild(dir);
            } else {
                console.log('child process exited with code : '+code);
            }
        });
    } catch(err) {
        console.log("err: ", err);
    }
}

//   run cdk build
const runCDKNPMBuild= (dir="") => {
    console.log("Running npm run build cdk backend");

    const npmInstall = spawn(npm ,['run', "build"],  { cwd: dir, shell: /^win/.test(process.platform) });

    npmInstall.stdout.on('data', function(data) {
        console.log("output: "+data);
    });

    npmInstall.stderr.on('data', data => {
        console.log('output (msg): '+data)
    });

    npmInstall.on('error', error => {
        console.log('error: '+error.message)
    });

    npmInstall.on('close', code => {
        if(code === 0) {
            runCDKDeploy(dir);
        } else {
            console.log('child process exited with code : '+code);
        }
    });
}

//   run cdk deploy
const runCDKDeploy = (dir="") => {
    console.log("Running cdk deploy on the backend");

    const cli = spawn('cdk',['deploy', "-O", "../src/cdk-exports.json"],  { cwd: dir, shell: /^win/.test(process.platform) });

    let current = "";
    cli.stdout.on('data', function(data) {
        console.log("output: "+data);
        current += data;
        if(current[current.length -1] == '\n') {
            if(current.toLowerCase().startsWith("do you wish to deploy these changes (y/n)?")) {
                cli.stdin.write("y \n");
            }
        }
    });

    cli.stderr.on('data', data => {
        console.log('output (msg): '+data);
    });

    cli.on('error', error => {
        console.log('error: '+error.message)
    });

    cli.on('close', code => {
        if(code === 0) {
            (async () => {
                await initFrontendDeployment();
            })();
        } else {
            console.log('child process exited with code : '+code);
        }
    });
}

/* Frontend processing and deployment */
const initFrontendDeployment = async () => {
    const frontendSrcDir = path.join(event_dir,"src");
    const repoDir = path.resolve(event_dir);
    const frontendEventConfig = path.join(path.resolve(frontendSrcDir),"eventConfig.json");
    const frontendCDKExports = path.join(path.resolve(frontendSrcDir),"cdk-exports.json");

    let eventConfigName = path.join("src", "eventConfig.json");
    let eventConfigContent = JSON.stringify(event_data);

    let repository;

   try {
        // read cdk exports file to get the exported data from cdk deployed backend
        // console.log("reading cdk exports from: " + frontendCDKExports);
        jsonReader(frontendCDKExports, (err, data) => {
            if(err) console.log("Error while reading cdk-export file",err);
            else {
                // console.log("cdk export: ",data);
                const cdkExports = data[event_data.id];
                const codeCommitHTTPSCloneUrl = cdkExports["repositoryHTTPUrl"] ? cdkExports["repositoryHTTPUrl"] : null;
                // console.log(codeCommitHTTPSCloneUrl);
                if(codeCommitHTTPSCloneUrl) {
                    (async () => {
                        try {
                            const repo = await nodegit.Repository.open(repoDir);
                            fse.writeFileSync(path.join(repo.workdir(), eventConfigName), eventConfigContent); // add event config to frontend app
                            const index = await repo.refreshIndex(); // read latest
                            const files = await repo.getStatus(); // get status of all files
                            files.forEach(file => index.addByPath(file.path())); // stage each file
                            await index.write(); // flush changes to index
                            const changes = await index.writeTree(); // get reference to a set of changes
                            const head = await nodegit.Reference.nameToId(repo, "HEAD"); // get reference to the current state
                            const parent = await repo.getCommit(head); // get the commit for current state
                            const author = nodegit.Signature.now("Bright Onwukwe", "onwukweb@gmail.com"); // build auth/committer
                            const committer = nodegit.Signature.now("Bright Onwukwe", "onwukweb@github.com");
                            // combine all info into commit and return hash
                            const commitId = await repo.createCommit("HEAD", author, committer, "Added event config", changes, [parent]);
                            
                            const remoteResult = await nodegit.Remote.create(repo, "codecommit", codeCommitHTTPSCloneUrl);
                            remote = remoteResult;
                            // Create the push object for this remote
                            remote.push(["refs/heads/master:refs/heads/master"],
                                {
                                    callbacks: {
                                        credentials: nodeGitCredential
                                    }
                                }
                            );
                            console.log("Done.");
                        } catch (err) {
                            console.log("Repo error: ", err);
                        }
                    })();
                   
                }
            }
        });
   } catch (err) {
       console.log(err);
   }
}

const init = async () => {
   try {
        console.log("Creating project directory...");
        create_dir(event_dir);
        console.log("Cloning project frontend and backend to local directory...");
        const resp = await clone_repository(backend_repo, event_dir, cred_options);
        if(resp === true) { // successfully cloned the repo
            console.log("Adding backend event config...");
            addOrReplaceFile(backend_event_config_file, JSON.stringify(event_data), (err, result) => {
                    if(err) {
                        console.log("backend config creation error: ", err);
                    } else {
                            runCDKBackEndNPMInstall(path.resolve(event_dir+'/cdk-backend'));
                    }
                    
             });
        } else {
            throw new Error(resp);
        }
        
   }
   catch (err) {
       console.log("err: ", err);
   }
}

init();