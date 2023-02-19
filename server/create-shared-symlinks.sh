#!/bin/bash
set -x #echo on

mkdir ./shared
mkdir ./shared/constants
cd ./shared/constants
ln -s ../../../app/src/constants/CompileConstants.ts
ln -s ../../../app/src/constants/internalColumns.ts
ln -s ../../../app/src/constants/metaDefs.ts

cd ..
mkdir services
cd services
ln -s ../../../app/src/services/columnUtil.ts
ln -s ../../../app/src/services/merging.ts
ln -s ../../../app/src/services/util.ts

cd ..
mkdir types
cd types
ln -s ../../../app/src/types/characterTypes.ts
ln -s ../../../app/src/types/utilTypes.ts

