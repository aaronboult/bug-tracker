const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const request = require("request");

// const BACKEND_URL = ""; // Place your backend IP or URL here and uncomment this line

let window, userToken;

app.whenReady().then(function(){

    try{

        InitializeBackend();
    
        window = new BrowserWindow({
            title: "Bug Tracker",
            icon: "build/icon.png",
            width: 1200,
            height: 700,
            minWidth: 550,
            minHeight: 575,
            webPreferences: {
                nodeIntegration: true
        }});
    
        window.loadFile(__dirname + '/login.html');

        window.setMenu(null);

        if (process.argv[2] === "--dev"){
    
            window.webContents.openDevTools();

        }

        window.maximize();

    }
    catch(e){

        app.quit();

    }
    
});

app.on("window-all-closed", () => {
    
    if (process.platform !== 'darwin') {

        if (userToken){
    
            let options = {
                uri: BACKEND_URL + "/logout",
                formData: { "token": userToken }
            };
        
            request.post(options, function(err, httpResponse, body){
    
                app.quit();
        
            });

        }
        else{
        
            app.quit();
    
        }
    
    }

});

function InitializeBackend(){

    ipcMain.on("login", TryLogin);

    ipcMain.on("sidebar-sync", LoadBugData);

    ipcMain.on("tracker-updated", SaveBugData);

    ipcMain.on("select-file", SelectFile);

    ipcMain.on("open-file-code", OpenFileInCode);

    ipcMain.on("logout", function(){
    
        let options = {
            uri: BACKEND_URL + "/logout",
            formData: { "token": userToken }
        };
    
        request.post(options, function(err, httpResponse, body){

            userToken = null;

            window.loadFile("login.html");
    
        });

    })

}

function TryLogin(event, args){

    args["getToken"] = "true";

    let options = {
        uri: BACKEND_URL + "/login",
        headers: {
            "Content-Type": "application/json"
        },
        formData: args
    };
    
    request.post(options, function(err, httpResponse, body){

        try{
            
            body = JSON.parse(body);

            if (body["result"] === "SUCCESS"){

                userToken = body["token"]
                
                window.loadFile(__dirname + "/index.html");

                return;

            }

            event.reply("login", body);

        }
        catch(e){

            event.reply("login", "__ERROR__")

        }

    });

}

function LoadBugData(event, args){
    
    let options = {
        uri: BACKEND_URL + "/sidebar-sync",
        formData: { "token": userToken }
    };

    request.post(options, function(err, httpResponse, body){
        
        if (body === "403"){

            window.loadFile(__dirname + "/login.html");

            return;

        }
        
        event.reply("sidebar-sync", JSON.parse(body));

    });

}

function SaveBugData(event, args){
    
    let options = {
        uri: BACKEND_URL + "/tracker-updated",
        formData: { 
            "token": userToken,
            "bugdata": JSON.stringify(args)
        }
    };

    request.post(options, function(err, httpResponse, body){

        if (body === "403"){

            window.loadFile(__dirname + "/login.html");

            return;

        }
        
        event.reply("tracker-updated", body);

    });

}

function SelectFile(event, args){

    let response = dialog.showOpenDialogSync({ properties: ["openDirectory"] });

    if (response !== undefined){
    
        if (args.indexOf(response[0]) === -1){
    
            event.reply("select-file", [true, response[0]]);

            return;
    
        }

    }

    event.reply("select-file", [false]);

}

function OpenFileInCode(event, args){

    let fileStream = require("fs");

    if (fileStream.existsSync(args)){

        let child_process = require('child_process');

        var process = child_process.spawn("code", [`"${args}"`], { encoding: 'utf8', shell: true });

        process.on('error', (error) => {
            dialog.showMessageBox({
                title: 'Global Variable "Code" Not Defined',
                type: 'error',
                message: 'Error occured.\r\n' + error
            });
        });

        event.reply("open-file-code", [true, args]);

    }
    else{

        event.reply("open-file-code", [false, args]);

        dialog.showMessageBox({
            title: 'File Not Found',
            type: 'warning',
            message: `No Such File Or Directory: ${args}` 
        });

    }

}