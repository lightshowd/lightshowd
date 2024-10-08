if [ ! -d config ]; then
   cp -r config.sample config
   echo "Copied ./config.sample ./config"
fi

echo "Building core..."
yarn workspace @lightshowd/core build
echo "Building gpio-client..."
yarn workspace @lightshowd/gpio-client build
echo "Building server..."
yarn workspace @lightshowd/server build
echo "Building player..."
yarn workspace @lightshowd/player build
