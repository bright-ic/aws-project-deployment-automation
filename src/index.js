const {spawn} = require("child_process");
const {
    generateRandomCodes, 
    create_dir,
    clone_repository
} = require("./util/helpers");
const {URL} = require("url");
const simpleGit = require("simple-git");
const git = simpleGit();

const eventName = "eventnameEnvlor"+generateRandomCodes(1,6,6);
const event_dir = process.cwd()+"../../events/"+eventName;
const backend_repo = "https://github.com/bright-ic/aws-cloudformation-config-with-cdk.git";



const init = async () => {
    create_dir(event_dir);
    git.clone(backend_repo, event_dir);
}

init();
// const create_event_folder = spawn(`sudo mkdir ${base}eventnameEnvlor`);
// create_event_folder.stdout.setEncoding('utf-8');

// create_event_folder.stdout.on('data', function(data) {
//     console.log("stdout: "+data);
// });

// create_event_folder.stderr.on('data', data => {
//     console.log('stderr: '+data)
// });

// create_event_folder.on('error', error => {
//     console.log('error: '+error.message)
// });

// create_event_folder.on('close', code => {
//     console.log('child process exited with code : '+code)
// });
