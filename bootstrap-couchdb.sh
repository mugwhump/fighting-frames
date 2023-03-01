#!/bin/bash
set -x #echo on

echo "deploying couchdb files to local installation..."
couchdb-bootstrap http://admin:password@localhost:5984 couchdb/
