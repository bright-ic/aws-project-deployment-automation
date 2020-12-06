const fs = require("fs");
const nodegit = require("nodegit");
const path = require("path");

const generateRandomCodes = (amount, min_length = 10, max_length = 16, characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") => {
    let str = [];
          for (let j = 0; j < amount; j++) {
        let first_string = '';
        let min = Math.ceil(min_length);
        let max = Math.floor(max_length);
              let random_string_length = Math.floor(Math.random() * (max - min + 1)) + min;
              for (let i = 0; i < random_string_length; i++) {
                  first_string += characters[(Math.floor(Math.random() * ((characters.length - 1) - 0 + 1))+0)];
              }
              str[j] = typeof str[j] !== "undefined" ? str[j]+first_string : first_string;
          }
          return str;
  }
  exports.generateRandomCodes = generateRandomCodes;
/** 
* function that creates new directory
* @param {string} path - path and name of the new directory
*/
  const create_dir = (path) => {
    fs.mkdirSync(path, {recursive: true}, (error) => {
        if(error) console.log("An error occured while creating your directory: ", error);
        else {
            console.log("Directory was created successfully");
        }
    })
}
exports.create_dir = create_dir;


/** 
* function that clones a git repository to a specified path
* @param {string} repo_url - git repository url to clone
* @param {string} local_dir - path to clone the repository into
* @param {object} cloneOpts - repository authentication credentials
*/
const clone_repository = async (repo_url, local_dir, cloneOpts = {}) => {
    try {
        const repo = await nodegit.Clone.clone(repo_url, local_dir, cloneOpts);
        console.log("Cloned "+path.basename(repo_url)+" to "+repo.workdir());
        return true;
    } catch(err) {
        console.log("failed to clone repo")
        console.log(err);
        return err.message;
    }
}
exports.clone_repository = clone_repository;

const file_exists = (path="") => {
    if(path !== "") {
        try {
            if (fs.existsSync(path)) {
              return true;
            }
          } catch(err) {
            return false;
          }
    }
    return "invalid path";
}
exports.file_exists = file_exists


const addOrReplaceFile = (filename="", content="", cb) => {
    
    fs.writeFile(filename, content, function (err) {
        if (err) return cb && cb(err, false);
        
        return cb && cb(null, true);
    });
}
exports.addOrReplaceFile = addOrReplaceFile;

/* Json file reader */
const jsonReader = (filePath, cb) => {
    try {
        fs.readFile(filePath, (err, fileData) => {
            if (err) {
              return cb && cb(err);
            }
            try {
              const object = JSON.parse(fileData);
              return cb && cb(null, object);
            } catch (err) {
              return cb && cb(err);
            }
          });
    } catch (err) {
        return cb && cb(err);
    }
}
exports.jsonReader = jsonReader;
