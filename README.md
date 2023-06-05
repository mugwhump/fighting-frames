# fighting-frames
Ionic-react app for community-driven fighting game frame data

- Browse frame data for fighting games uploaded by users, with user-defined per-game data structures
- Download frame data locally to use without an internet connection
- Submit frame data with in-app conflict resolution (may require editor review+approval based on game administrator's settings)
- Show/hide columns, sort or filter by columns, search for punishers between characters
- Locally save personalized notes on characters
- Compile for Android, iOS, web, or PWA

## Building
This project requires docker and a linux environment. If you want to run it in a windows environment, install Docker Desktop and Windows Subsystem for Linux 2 (Ubuntu).
```
git clone https://github.com/mugwhump/fighting-frames.git
cd fighting-frames
npm install
chmod +x ./run-dev.sh
./run-dev.sh
ionic serve --browser chrome
```
