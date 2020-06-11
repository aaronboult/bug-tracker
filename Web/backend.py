#!/usr/bin/python3

from flask import Flask, request, redirect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from passlib.context import CryptContext
from apscheduler.schedulers.background import BackgroundScheduler

import json, secrets, sqlite3, datetime, atexit



server = Flask("bugtracker")

serverLimiter = Limiter(server, key_func=get_remote_address, default_limits=["12 per minute"])

# LOGIN_USERNAME = "" # Set a username and password here in order to allow logins and uncomment this line
# LOGIN_PASSWORD_HASH = '' # Must be hashed with same algorithm as 'HASHER' (default: argon2) and uncomment this line



HASHER = CryptContext(schemes=["argon2"], deprecated="auto") # Create the object to hash and check passwords; replace argon2 with any secure algorithm if yoy wish



def RemoveExpiredTokens():
    
    conn = sqlite3.connect("database.db")

    database = conn.cursor()

    tokens = database.execute("SELECT * from tokens")

    for tokenRow in tokens:

        deltaDate = datetime.datetime.utcnow() - datetime.datetime.strptime(tokenRow[1], "%Y-%m-%d %H:%M:%S.%f")

        if not (deltaDate.days == 0 and deltaDate.seconds < 1800): # If the token has expired

            database.execute("DELETE FROM tokens WHERE token=?", (tokenRow[0],))

    conn.commit()

scheduler = BackgroundScheduler()
scheduler.add_job(func=RemoveExpiredTokens, trigger="interval", hours=1)
scheduler.start()

atexit.register(scheduler.shutdown)



def CheckToken(token):

    conn = sqlite3.connect("database.db")

    database = conn.cursor()

    tokenRow = database.execute("SELECT timestamp FROM tokens WHERE token=?", (token,)).fetchall()

    valid = False

    if len(tokenRow) == 1:

        deltaDate = datetime.datetime.utcnow() - datetime.datetime.strptime(tokenRow[0][0], "%Y-%m-%d %H:%M:%S.%f")

        if deltaDate.days == 0 and deltaDate.seconds < 1800:

            valid = True

    if not valid or len(tokenRow) > 1:

        database.execute("DELETE FROM tokens WHERE token=?", (token,))

        conn.commit()

    database.close()

    return valid


# Retrieve a URL safe, unique, 64 byte random token and append it to the database
def GetToken():
    
    token = secrets.token_urlsafe(64)

    while CheckToken(token):

        token = secrets.token_urlsafe(64)

    conn = sqlite3.connect("database.db")

    database = conn.cursor()

    database.execute("INSERT INTO tokens VALUES (?,?)", (token, str(datetime.datetime.utcnow())))
    
    database.close()

    conn.commit()

    return token


# Load the JSON data from the tracker.json file and parse it
def ReadBugData():

    open("tracker.json", "a").close()

    with open("tracker.json", "r+") as file:

        data = file.read()
        
        if len(data) == 0:

            file.write("[{}]")

            data = "[{}]"
            
        return json.loads(data)[0]


# Add new changes to the tracker.json file
def StoreBugData(bugdata):

    with open("tracker.json", "r+") as file:

        data = file.read() # Save a temporary backup of the file's contents

        file.seek(0) # Move the 'cursor' to the beginning of the file (currently at the end due to file.read())
        file.truncate(0) # Clear the contents of the file ready to be updated

        try:
            
            file.write("[{0}]".format(bugdata))

            return "SUCCESS"
        
        except:
            
            file.write(data) # If writing throws an error, revert the file to it's state prior to this update call

    return "ERROR"



@server.route("/")
def index():
    
    token = request.args.get("token")

    if token != None:
        
        if CheckToken(request.args["token"]):
            
            with open("index.html", "r") as file:

                return file.read()
    
    return redirect("/login")



@server.route("/login")
def LoginPage():

    with open("login.html", "r") as file:

        return file.read()



@server.route("/login", methods=["POST"])
def Login():
    
    if request.form["username"] == LOGIN_USERNAME and HASHER.verify(request.form["password"], LOGIN_PASSWORD_HASH):

        return json.dumps({"result": "SUCCESS", "token": GetToken()})

    return json.dumps({"result": "FAILED"})



@server.route("/logout", methods=["POST"])
def Logout():

    if CheckToken(request.form["token"]):

        conn = sqlite3.connect("database.db")

        database = conn.cursor()

        database.execute("DELETE FROM tokens WHERE token=?", (request.form["token"],))

        database.close()

        conn.commit()
        
    return redirect("/login")



@server.route("/sidebar-sync", methods=["POST"])
def LoadBugData():

    if CheckToken(request.form["token"]):

        return ReadBugData()
    
    else:

        return "403"



@server.route("/tracker-updated", methods=["POST"])
@serverLimiter.limit("1/second")
def SaveBugData():

    if CheckToken(request.form.get("token")):

        return StoreBugData(request.form["bugdata"])
    
    else:

        return "403"



if __name__ == "__main__":

    server.run(debug=True, host="0.0.0.0", port=443, use_reloader=False)