#!/bin/bash
set -x #echo on

echo "Generating schema..."

#npx typescript-json-schema ./tsconfig.json CharDoc -o schema/CharDoc.json --include src/types/characterTypes.ts --required
# TODO: check if I need --strictNullChecks
npx typescript-json-schema ./tsconfig.json ChangeDocServer -o schema/ChangeDocServer.json --include shared/types/characterTypes.ts --required
npx typescript-json-schema ./tsconfig.json DesignDoc -o schema/DesignDoc.json --include shared/types/characterTypes.ts --required

# when an optional property has never as its type, schema generator chokes and says its type is undefined, which ajv rejects.
# Instead set that property to false in the schema using json editor.
# TODO: would be nice to be able to exclude Conflict types
echo "Fixing optional never types in schema..."
tmp=$(mktemp /tmp/tmp.XXXXXXX)
jq '(.. | select(.type == "undefined")?) |= false' schema/ChangeDocServer.json > "$tmp" && mv "$tmp" schema/ChangeDocServer.json
# cat <<< $( jq '(.. | select(.type == "undefined")?) |= false' schema/ChangeDocServer.json ) > schema/ChangeDocServer.json

echo "Generating validators..."
npx ajv compile -s schema/ChangeDocServer.json -o schema/ChangeDocServer-validator.js --allowUnionTypes
npx ajv compile -s schema/DesignDoc.json -o schema/DesignDoc-validator.js --allowUnionTypes
#npx ajv compile -s schema/CharDoc.json -o schema/CharDoc-validator.js
#npx ajv compile -s schema/ChangeDocServer.json -o ../couchdb/game-template/_design/validate/lib/ChangeDocServer-validator.js --allowUnionTypes

#echo "Copying schema stuff to src/ folder for temporary testing"
#cp -r schema/ src/
