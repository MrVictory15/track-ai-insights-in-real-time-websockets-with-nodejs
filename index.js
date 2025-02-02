require('dotenv').config()
const { sdk } = require('symbl-node')
const uuid = require('uuid').v4
    // For demo purposes, we're using mic to simply get audio from microphone and pass it on to websocket connection
const mic = require('mic')

const appId = "445653754843376f4a6c4f73664944704e7430776d6467326d506f707a6f354d";
const appSecret = "567336706244574a454b2d736376665561794545455f334b33456e496334426548524a6441384b34434f4a6a473833453858315451677465726a6c5842333364";
const emailAddress = "thangnd@fabbi.io";
const myName = "ThangND2";

const sampleRateHertz = 16000

const micInstance = mic({
    rate: sampleRateHertz,
    channels: '1',
    debug: true,
    exitOnSilence: 6,
});

(async() => {
    try {
        // Initialize the SDK
        await sdk.init({
            appId,
            appSecret,
            basePath: 'https://api.symbl.ai',
        })

        // Need unique Id
        const id = uuid()

        // Start Real-time Request (Uses Realtime WebSocket API behind the scenes)
        const connection = await sdk.startRealtimeRequest({
            id,
            insightTypes: ['action_item', 'question'],
            config: {
                meetingTitle: 'My Test Meeting',
                confidenceThreshold: 0.7,
                timezoneOffset: 480, // Offset in minutes from UTC
                languageCode: 'en-US',
                sampleRateHertz
            },
            speaker: {
                // Optional, if not specified, will simply not send an email in the end.
                userId: emailAddress, // Update with valid email
                name: myName
            },
            handlers: {
                /**
                 * This will return live speech-to-text transcription of the call.
                 */
                onSpeechDetected: (data) => {
                    if (data) {
                        const { punctuated } = data
                        console.log('Live: ', punctuated && punctuated.transcript)
                        console.log('');
                    }
                    console.log('onSpeechDetected ', JSON.stringify(data, null, 2));
                },
                /**
                 * When processed messages are available, this callback will be called.
                 */
                onMessageResponse: (data) => {
                    console.log('onMessageResponse', JSON.stringify(data, null, 2))
                },
                /**
                 * When Symbl detects an insight, this callback will be called.
                 */
                onInsightResponse: (data) => {
                    console.log('onInsightResponse', JSON.stringify(data, null, 2))
                },
                /**
                 * When Symbl detects a topic, this callback will be called.
                 */
                onTopicResponse: (data) => {
                    console.log('onTopicResponse', JSON.stringify(data, null, 2))
                }
            }
        });
        console.log('Successfully connected. Conversation ID: ', connection.conversationId);

        const micInputStream = micInstance.getAudioStream()

        /** Raw audio stream */
        micInputStream.on('data', (data) => {
            // Push audio from Microphone to websocket connection
            connection.sendAudio(data)
        })

        micInputStream.on('error', function(err) {
            cosole.log('Error in Input Stream: ' + err)
        })

        micInputStream.on('startComplete', function() {
            console.log('Started listening to Microphone.')
        })

        micInputStream.on('silence', function() {
            console.log('Got SIGNAL silence')
        })

        micInstance.start()

        setTimeout(async() => {
                // Stop listening to microphone
                micInstance.stop()
                console.log('Stopped listening to Microphone.')
                try {
                    // Stop connection
                    await connection.stop()
                    console.log('Connection Stopped.')
                } catch (e) {
                    console.error('Error while stopping the connection.', e)
                }
            }, 10 * 1000) // Stop connection after 1 minute i.e. 60 secs
    } catch (e) {
        console.error('Error: ', e)
    }
})()