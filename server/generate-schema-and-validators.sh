#!/bin/bash
set -x #echo on

echo "Generating schema..."

#npx typescript-json-schema ./tsconfig.json CharDoc -o schema/CharDoc.json --include src/types/characterTypes.ts --required
# TODO: check if I need --strictNullChecks
npx typescript-json-schema ./tsconfig.json ChangeDocServer -o schema/ChangeDocServer.json --include shared/types/characterTypes.ts --required --noExtraProps
npx typescript-json-schema ./tsconfig.json ConfigDoc -o schema/ConfigDoc.json --include shared/types/characterTypes.ts --required --noExtraProps
npx typescript-json-schema ./tsconfig.json SecObj -o schema/SecObj.json --include shared/services/security.ts --required --noExtraProps

# when an optional property has never as its type, schema generator chokes and says its type is undefined, which ajv rejects.
# Instead set that property to false in the schema using json editor.
echo "Fixing optional never types in schema..."
tmp=$(mktemp /tmp/tmp.XXXXXXX)
jq '(.. | select(.type == "undefined")?) |= false' schema/ChangeDocServer.json > "$tmp" && mv "$tmp" schema/ChangeDocServer.json
# cat <<< $( jq '(.. | select(.type == "undefined")?) |= false' schema/ChangeDocServer.json ) > schema/ChangeDocServer.json

# setting --remove-additional=true will strip extra props instead of throwing errors, but it's mistakenly stripping extra stuff
echo "Generating validators..."
npx ajv compile -s schema/ChangeDocServer.json -o schema/ChangeDocServer-validator.js --allowUnionTypes --all-errors
npx ajv compile -s schema/ConfigDoc.json -o schema/ConfigDoc-validator.js --allowUnionTypes --all-errors
npx ajv compile -s schema/SecObj.json -o schema/SecObj-validator.js --allowUnionTypes --all-errors

#npx ajv compile -s schema/CharDoc.json -o schema/CharDoc-validator.js
#npx ajv compile -s schema/ChangeDocServer.json -o ../couchdb/game-template/_design/validate/lib/ChangeDocServer-validator.js --allowUnionTypes

#echo "Copying schema stuff to src/ folder for temporary testing"
#cp -r schema/ src/
