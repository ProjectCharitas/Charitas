const fs = require('fs-extra');
const min = require('node-minify');
const packager = require('electron-packager');
const path = require('path');
const {
   exec,
   execSync
} = require('child_process');

const GUISOURCEDIR = path.join(__dirname, `sourceFiles\\gui`),
   MINERSOURCEDIR = path.join(__dirname, `sourceFiles\\miner`),
   SOURCEDIR = path.join(__dirname, `sourceFiles`);
TESTDIR = path.join(__dirname, `testApp`),
   PRODDIR = path.join(__dirname, `prodApp`),
   X32DIR = path.join(__dirname, `x32Compiled`),
   X64DIR = path.join(__dirname, `x64Compiled`),
   RELEASEDIR = path.join(__dirname, `releases`)

fs.ensureDirSync(SOURCEDIR);
fs.ensureDirSync(GUISOURCEDIR);
fs.ensureDirSync(MINERSOURCEDIR);
fs.ensureDirSync(TESTDIR);
fs.ensureDirSync(PRODDIR);
fs.ensureDirSync(X32DIR);
fs.ensureDirSync(X64DIR);
fs.ensureDirSync(RELEASEDIR);

/*
===ARGS===
-t -> test 
-b -> final build
*/
const args = process.argv.slice(2).map(e => e.replace(/-/g, ''));
const VERBOSE = !args.includes("q");

let SKIP32 = false,
   SKIP64 = false;
if (args.includes("32") && !args.includes("64")) SKIP64 = true;
else if (args.includes("64") && !args.includes("32")) SKIP32 = true;

const isF = (n) => {
   return n.indexOf('.') > -1; //quick and dirty way to check if an entry is a file, there has got to be a better way
}
const replaceTemplates = (sourceCode) => {
   const toReplace = {
      "<!--HEADER-->": fs.readFileSync(`${GUISOURCEDIR}\\replace\\header.html`, "utf8")
   }
   let returnCode = sourceCode;
   for (let token in toReplace) {
      returnCode = returnCode.replace(token, toReplace[token]);
   }
   return returnCode;
}

/*
===WORKFLOW===
1) Make changes to GUI or miner in sourceFiles/ 

*npm test -> copy to testApp

*npm start:

2) Files are copied to prodApp/

3) electron-packager compiles a x32 and x64 release of prodApp/, writing to x32Compiled/ and x64Compiled/

4) Inno Setup Compiler creates installers for the x32 and x64 releases, writing to releases/

*/

const deleteOldTestDir = () => {
   return new Promise((resolve, reject) => {
      fs.rmdirSync(`${TESTDIR}\\gui`, {
         recursive: true
      });
      fs.rmdirSync(`${TESTDIR}\\miner`, {
         recursive: true
      });
      fs.readdir(`${TESTDIR}`, (err, files) => { //check and make sure it worked
         if (files.length > 3) { // should only be package.json, and the two icons
            reject(`Not all test files were deleted: ${files}`)
         } else {
            resolve("Wiped test dir");
         }
      })
   });
}

const copyToTestDir = () => {
   return new Promise((resolve, reject) => {
      fs.ensureDirSync(`${TESTDIR}\\gui`);
      fs.ensureDirSync(`${TESTDIR}\\miner`);
      fs.copySync(`${SOURCEDIR}\\package.json`, `${TESTDIR}\\package.json`);
      fs.copySync(`${SOURCEDIR}\\favicon.ico`, `${TESTDIR}\\favicon.ico`);
      fs.copySync(`${SOURCEDIR}\\grayicon.ico`, `${TESTDIR}\\grayicon.ico`);
      const sourceFiles = fs.readdirSync(GUISOURCEDIR);
      //read source directory, write a templated version of each file to test directory
      for (let file of sourceFiles) {
         if (isF(file)) {
            fs.writeFileSync(`${TESTDIR}\\gui\\${file}`, replaceTemplates(fs.readFileSync(`${GUISOURCEDIR}\\${file}`, "utf8")))
         }
      }
      fs.copySync(`${SOURCEDIR}\\common`, `${TESTDIR}\\gui\\common`);
      fs.copySync(`${SOURCEDIR}\\miner`, `${TESTDIR}\\miner`)
      resolve("Copied source to test");
   });
}

const makeProdVersion = () => {
   return new Promise((resolve, reject) => {
      //first, delete old prod version
      fs.rmdirSync(PRODDIR, {
         recursive: true
      });
      fs.ensureDirSync(PRODDIR);
      fs.copySync(MINERSOURCEDIR, `${PRODDIR}\\miner`);
      if (VERBOSE) console.log("Copied Miner files");
      fs.ensureDirSync(`${PRODDIR}\\gui`);
      fs.copySync(`${SOURCEDIR}\\common`, `${PRODDIR}\\gui\\common`);
      if (VERBOSE) console.log("Copied fonts");
      fs.copySync(`${SOURCEDIR}\\favicon.ico`, `${PRODDIR}\\favicon.ico`);
      fs.copySync(`${SOURCEDIR}\\grayicon.ico`, `${PRODDIR}\\grayicon.ico`);
      if (VERBOSE) console.log("Copied icons");
      fs.copySync(`${SOURCEDIR}\\node_modules`, `${PRODDIR}\\node_modules`);
      if (VERBOSE) console.log("Copied node_modules");
      fs.copySync(`${SOURCEDIR}\\package.json`, `${PRODDIR}\\package.json`);
      for (let file of fs.readdirSync(GUISOURCEDIR)) {
         if (isF(file)) {
            //template and minify source files
            let fileCode = fs.readFileSync(`${GUISOURCEDIR}/${file}`, "utf8");
            fileCode = replaceTemplates(fileCode);

            fs.writeFileSync(`${PRODDIR}\\gui\\${file}`, fileCode, {
               flag: "w"
            });
            let compiler;
            if (file.endsWith(".js")) compiler = 'babel-minify';
            if (file.endsWith(".css")) compiler = 'csso';
            if (file.endsWith(".html")) compiler = 'html-minifier';
            min.minify({
               compressor: compiler,
               content: fileCode,
               input: `${PRODDIR}\\gui\\${file}`,
               output: `${PRODDIR}\\gui\\${file}`
            })
         }
      }
      if (VERBOSE) console.log("Minified source files")
      if (fs.existsSync(`${PRODDIR}\\gui`) && fs.existsSync(`${PRODDIR}\\miner`)) {
         resolve("Created prod directory");
      } else {
         reject("Could not create prod directory");
      }
   });
}

const compileVersion = () => {
   return new Promise((resolve, reject) => {
      //delete old versions
      fs.rmdirSync(X32DIR, {
         recursive: true
      });
      fs.rmdirSync(X64DIR, {
         recursive: true
      })
      packager({
         arch: "ia32",
         dir: PRODDIR,
         name: "Charitas",
         icon: `${SOURCEDIR}\\favicon.ico`,
         overwrite: true,
         platform: "win32",
      }).then(x32compiled => {
         //clean up compiled version - delete node_modules, delete package-lock.json, rename output dir
         x32compiled = x32compiled[0];
         fs.renameSync(x32compiled, X32DIR);
         fs.rmdirSync(`${X32DIR}\\resources\\app\\node_modules`, {
            recursive: true
         });
         // fs.unlinkSync(`${X32DIR}\\resources\\app\\package-lock.json`);
         packager({
            arch: "x64",
            dir: PRODDIR,
            name: "Charitas",
            icon: `${SOURCEDIR}\\favicon.ico`,
            overwrite: true,
            platform: "win32",
         }).then(x64compiled => {
            x64compiled = x64compiled[0];
            fs.renameSync(x64compiled, X64DIR);
            fs.rmdirSync(`${X64DIR}\\resources\\app\\node_modules`, {
               recursive: true
            });
            // fs.unlinkSync(`${X64DIR}\\resources\\app\\package-lock.json`);
            fs.readdir(__dirname, (err, files) => {
               if (files.includes("x32Compiled") && files.includes("x64Compiled")) {
                  resolve("Created x32 and x64 electron apps");
               } else {
                  reject("Could not bundle prod into electron apps")
               }
            })
         })
      })
   });
}

const compileInstallers = () => {
   return new Promise((resolve, reject) => {
      if (fs.existsSync(`${RELEASEDIR}\\Charitas-INSTALLER-x64.exe`)) {
         fs.unlinkSync(`${RELEASEDIR}\\Charitas-INSTALLER-x64.exe`);
      }
      if (fs.existsSync(`${RELEASEDIR}\\Charitas-INSTALLER-x32.exe`)) {
         fs.unlinkSync(`${RELEASEDIR}\\Charitas-INSTALLER-x32.exe`);
      }
      if (VERBOSE) console.log("Deleted old installers");
      if (!SKIP64) {
         if (VERBOSE) {
            console.log("Compiling x64 installer");
            execSync(`compil32 /cc "${SOURCEDIR}\\Installerx64.iss"`);
         } else {
            execSync(`iscc "${SOURCEDIR}\\Installerx64.iss"`);
         }
      }
      if (!SKIP32) {
         if (VERBOSE) {
            console.log("Compiling x32 installer");
            execSync(`compil32 /cc "${SOURCEDIR}\\Installerx32.iss"`);
         } else {
            execSync(`iscc "${SOURCEDIR}\\Installerx32.iss"`);
         }
      }
      fs.readdir(RELEASEDIR, (err, files) => {
         if (files.length !== 2 && (!SKIP32 || !SKIP64)) {
            reject("Both installers were not successfully created");
         } else {
            if (!SKIP32 && !SKIP64) {
               resolve("Created installers");
            } else if (SKIP32) {
               resolve("Created x64 installer");
            } else if (SKIP64) {
               resolve("Created x32 installer");
            }
         }
      })
   })
}

if (args.includes("t")) {
   deleteOldTestDir().then(result => {
      console.log(result);
      copyToTestDir().then(result => {
         console.log(result);
         exec(`cd ${TESTDIR} && "${path.join(SOURCEDIR, "node_modules\\.bin\\electron")}" ."`, (error, stdout, stderr) => {
            if (error || stderr) {
               console.error(`Exec error: ${error||stderr}`);
            }
         })
      })
   }).catch(err => console.log(err));
} else if (args.includes("b")) {
   makeProdVersion().then(result => {
      console.log(result);
      compileVersion().then(result => {
         console.log(result);
         compileInstallers().then(result => {
            console.log(result);
         })
      })
   }).catch(err => console.log(err));
} else {
   console.log("No arguments specified!\n\nPossible usages:\n\nnode build.js -t  ->  Copy to testing folder and launch GUI\nnode build.js -b  ->  Copy to production folder, minify files, bundle into electron app, then compile into installer\n(Optional) -q  ->  quiet mode(no logs except step progress)\n(Optional) -32  ->  Create only 32-bit installer\n(Optional) -64 -> Create only 64-bit installer")
}