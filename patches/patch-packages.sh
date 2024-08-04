rm ./node_modules/midi-player-js/browser/midiplayer.js
rm ./node_modules/midi-player-js/build/index.browser.js
rm ./node_modules/midi-player-js/build/index.js

cp ./patches/midi-player-js/browser/midiplayer.js ./node_modules/midi-player-js/browser/midiplayer.js
cp ./patches/midi-player-js/build/index.browser.js ./node_modules/midi-player-js/build/index.browser.js
cp ./patches/midi-player-js/build/index.js ./node_modules/midi-player-js/build/index.js


if [  -d ./node_modules/midi-writer-js ]; then
    rm ./node_modules/midi-writer-js/browser/midiwriter.js
    rm ./node_modules/midi-writer-js/build/index.browser.js
    rm ./node_modules/midi-writer-js/build/index.js

    cp ./patches/midi-writer-js/browser/midiwriter.js ./node_modules/midi-writer-js/browser/midiwriter.js
    cp ./patches/midi-writer-js/build/index.browser.js ./node_modules/midi-writer-js/build/index.browser.js
    cp ./patches/midi-writer-js/build/index.js ./node_modules/midi-writer-js/build/index.js
fi

