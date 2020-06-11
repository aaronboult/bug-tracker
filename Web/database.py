import sqlite3

def InitDatabase():

    print("Initializing database...")

    conn = sqlite3.connect("database.db")
    
    database = conn.cursor()

    database.execute("DROP TABLE IF EXISTS tokens")

    database.execute("CREATE TABLE tokens (token text, timestamp text)")

    database.close()

    conn.commit()

    print("Initialization complete.")

if __name__ == "__main__":

    InitDatabase()