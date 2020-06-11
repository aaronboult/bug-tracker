# bug-tracker
Track bugs, tasks and important information across projects.

### Desktop Setup
1. Clone the repository to the desired directory and run `npm install` within the `Desktop` folder
2. Assign the URL/IP Address to `BACKEND_URL ` in the `Desktop/main.js` file that points to your backend server and uncomment that line
3. Install the _electron-packager_: https://github.com/electron/electron-packager
4. Build the application with the following command for a 64 bit Windows system (I have not testeed building on MacOS or Linux), assuming you are in the `Desktop` folder `electron-packager . "Bug Tracker" --arch=x64 --platform=win32 --asar`
5. Replace every occurrence of `Bug Tracker-win32-x64` with the name of the folder that was made during the build process
6. Run `npm run apply-build-config` to apply metadata and set the application icon

### Backend + Web Setup
1. Set up a webserver that can forward requests on to a Flask production server (e.g Nginx)
2. Install the necessary programs to deploy a FLask server to production (e.g uWSGI)
3. Configure the web server to forward requests over HTTPS on port 443 to the Flask server (_Web/backend.py_)
4. Open the Web/backend.py file and provide a `LOGIN_USERNAME` and a `LOGIN_PASSWORD_HASH`
