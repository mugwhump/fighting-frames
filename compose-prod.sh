#!/bin/bash
#set -x #echo on
set -e #exit on error

#set cwd to script's dir
dir="$(cd -P -- "$(dirname -- "$0")" && pwd -P)"

#check for remote docker context "ff'
if docker context ls | grep -q ff; then
    echo "Executing compose in remote context with args $*"
    docker --context ff compose -f docker-compose.yml -f docker-compose.production.yml $*
else
    >&2 echo "Error: You must create a docker context named 'ff' for your production server."
fi
