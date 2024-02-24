#!/bin/bash
#set -x #echo on
set -e #exit on error

#set cwd to script's dir
dir="$(cd -P -- "$(dirname -- "$0")" && pwd -P)"

#check for remote docker context "ff'
if docker context ls | grep -q ff; then
    if [[ "$#" -eq 1 && "$1" == "builderino" ]]; then
        echo "Rebuilding backend images based on local code and recreating services"
        docker --context ff compose -f docker-compose.yml -f docker-compose.production.yml up --build --force-recreate -d
    else
        echo "Executing compose in remote context with args $*"
        docker --context ff compose -f docker-compose.yml -f docker-compose.production.yml $*
    fi
else
    >&2 echo "Error: You must create a docker context named 'ff' for your production server."
fi
