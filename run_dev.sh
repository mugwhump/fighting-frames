#!/bin/bash
#set -x #echo on
set -e #exit on error

# Tell user to install inotify-tools if missing. Rsync comes with most distros.
status="$(dpkg-query -W --showformat='${db:Status-Status}' "inotify-tools" 2>&1)"
if [ ! $? = 0 ] || [ ! "$status" = installed ]; then
    echo "Error: Please install inotify-tools"
    exit
fi

# TODO: tell users about every package they need to install
#pkgs='inotify-tools node ionic etc'
#install=false
#for pkg in $pkgs; do
  #status="$(dpkg-query -W --showformat='${db:Status-Status}' "$pkg" 2>&1)"
  #if [ ! $? = 0 ] || [ ! "$status" = installed ]; then
    #install=true
    #break
  #fi
#done
#if "$install"; then
  #sudo apt install $pkgs
#fi

# Perform initial copy, skips if files are same
rsync -av --files-from=./shared_files_to_copy.txt app/src/ server/shared/

echo "Watching shared frontend files for changes to sync to server codebase..."
#use sed to strip comment lines, then empty lines, then prepend app/src/ to each line
WATCHED=$(sed 's/\s*#.*$//;
                /^$/d;
                s/^/app\/src\//' shared_files_to_copy.txt)
                #| paste -sd ' ' - ) #lastly join every line with a space
WATCHED=$(echo $WATCHED | paste -sd ' ' -)

inotifywait -md -o /dev/null -e close_write --format '%w' $WATCHED | while read FILE
do
    echo "Changed $FILE"
    rsync -av --files-from=./shared_files_to_copy.txt app/src/ server/shared/
    #TODO: if file changed was characterTypes, also regenerate schema
done

echo "Running docker backend services..."
docker compose up

#TODO: also run ionic serve, might need concurrently?
