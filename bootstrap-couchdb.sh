#!/bin/bash
set -x #echo on

# Check if couchdb-bootstrap is installed
if ! command -v couchdb-bootstrap &> /dev/null; then
    echo "Error: couchdb-bootstrap is not installed. Please install it with npm by running 'npm install -g couchdb-bootstrap'."
    exit 1
fi

# --help command
if [ "$1" == "--help" ]; then
    echo "Usage: $0 [options]"
    echo "  -p, --prod: Use production settings from ./secrets/couch_admin.txt and ./secrets/couch_password.txt"
    echo "  --help: Show this help message and exit"
    exit 0
fi

# If no arguments, use default values
if [ $# -eq 0 ]; then
    PROTOCOL="http"
    ADMIN="admin"
    PASSWORD="password"
    HOST="localhost:5984"
else
    if [ "$1" == "prod" -o "$1" == "-p" ]; then
        PROTOCOL="https"
        ADMIN=$(cat ./secrets/couch_admin.txt)
        PASSWORD=$(cat ./secrets/couch_password.txt)
        HOST="dedede.fightingframes.com"
    else
        echo "Invalid argument. Use 'prod' or '-p' to switch to production mode."
        exit 1
    fi
fi

# Execute the command
couchdb-bootstrap ${PROTOCOL}://${ADMIN}:${PASSWORD}@${HOST} couchdb/

# for initial run, remember to run couchdb's setup, enable CORS, and create replication admin

