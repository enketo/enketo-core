import Widget from '../../js/widget';
import dialog from 'enketo/dialog';
import fileManager from 'enketo/file-manager';

// TODO: Fallback to Filepicker widget when APIs are missing.

/**
 * AudioRecorder widget that uses the MediaStream and MediaStreamRecorder APIs to capture audio from the browser.
 * If any of these APIs are absent, it shows an error message to the user.
 *
 * @extends Widget
 */
class AudioRecorder extends Widget {

    static get selector() {
        return '.question input[data-type-xml="binary"][accept^="audio"]';
    }

    _init() {
        this._currentState = AudioRecorder._STATES.PENDING;

        this._handlePlayackStartedBound = () => this._handleEvent(AudioRecorder._EVENTS.PLAYBACK_STARTED);
        this._handlePlayackPausedBound = () => this._handleEvent(AudioRecorder._EVENTS.PLAYBACK_FINISHED);

        const existingFilename = this.element.dataset.loadedFileName;

        this.element.classList.add( 'hidden' );
        this.element.type = 'text';
        this.element.dataset.audioRecording = true;

        const fragment = document.createRange().createContextualFragment(AudioRecorder._WIDGET_TEMPLATE);
        const resetButton = this.resetButtonHtml;
        resetButton.querySelector('.btn-reset').classList.add(AudioRecorder._CLASSES.RESET_BUTTON);
        fragment.appendChild(resetButton);
        const downloadButton = this.downloadButtonHtml;
        downloadButton.querySelector('.btn-download').classList.add(AudioRecorder._CLASSES.DOWNLOAD_BUTTON);
        fragment.prepend(downloadButton);
        this._audioInstanceEl = fragment.querySelector(`.${AudioRecorder._CLASSES.AUDIO}`);
        this._mainButtonEl = fragment.querySelector(`.${AudioRecorder._CLASSES.MAIN_BUTTON}`);
        this._resetButtonEl = fragment.querySelector(`.${AudioRecorder._CLASSES.RESET_BUTTON}`);
        this.element.after( fragment );
        this._resetMessageAndVariables();

        if (
            AudioRecorder._getMediaDevicesSupported()
            && AudioRecorder._getMediaRecorderSupported()
        ) {
            fileManager.init()
                .then(() => {
                    this.enable();
                    this._mainButtonEl.addEventListener('click', () => this._handleEvent(AudioRecorder._EVENTS.WIDGET_BODY_CLICKED));
                    this._resetButtonEl.addEventListener('click', () => {
                        dialog.confirm('Are you sure you want to remove this recording?').then((confirmed) => {
                            if (confirmed) {
                                this._handleEvent(AudioRecorder._EVENTS.RESET_WIDGET);
                            }
                        }).catch(console.error.bind(console));
                    });
                    if (existingFilename) {
                        this._handleEvent(AudioRecorder._EVENTS.FILE_EXISTING, existingFilename);
                    }
                })
                .catch((error) => {
                    console.error(error.message);
                    this._handleEvent(AudioRecorder._EVENTS.ENCOUNTER_ERROR, error.message);
                });
        } else {
            !AudioRecorder._getMediaDevicesSupported() && console.log( 'This browser does not support \'navigator.mediaDevices.getUserMedia\'.' );
            !AudioRecorder._getMediaRecorderSupported() && console.log( 'This browser does not support the \'MediaRecorder\' API.' );
            this._handleEvent(AudioRecorder._EVENTS.ERRORED, 'Browser does not support AudioRecorder widget. Please select an audio file instead.');
        }
    }

    _resetMessageAndVariables() {
        this._audioInstanceEl.src = '';
        this._audioInstanceEl.removeEventListener('playing', this._handlePlayackStartedBound);
        this._audioInstanceEl.removeEventListener('pause', this._handlePlayackPausedBound);
        this._mediaRecorderInstance = null;
        this._setMessage(AudioRecorder._stateToMessage(this._currentState));
        this._setResetButtonVisibility(false);
    }

    _setResetButtonVisibility(visible) {
        visible ? this._resetButtonEl.classList.remove('hidden') : this._resetButtonEl.classList.add('hidden');
    }

    _initializeAndStartMediaRecorderInstance(stream) {
        const chunks = [];
        this._mediaRecorderInstance = new MediaRecorder(stream, {type: 'audio/mp4'});
        this._mediaRecorderInstance.onerror = (e) => {
            console.error(e.error.name, e.error.message);
            this._handleEvent(AudioRecorder._EVENTS.ENCOUNTER_ERROR, e.error.message);
        };
        this._mediaRecorderInstance.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            const mimeType = this._mediaRecorderInstance.mimeType;
            const filename = AudioRecorder._generateFileName(mimeType);
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
                this._handleEvent(AudioRecorder._EVENTS.RECORDING_DATA_RECEIVED, {dataUri: event.target.result, filename});
            };
            fileReader.readAsDataURL(new Blob(chunks, {type: mimeType}));
        };
        this._mediaRecorderInstance.ondataavailable = (e) => chunks.push(e.data);

        this._mediaRecorderInstance.start();
    }

    // eslint-disable-next-line no-unused-vars
    _visualizeStream(stream) {
        // TODO: visualize the stream by creating a canvas element, painting a bar graph, and updating with requestAnimationFrame
        // https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
    }

    /**
     * Changes the state of the audio recorder.
     *
     * @param {string} event - A value defined in AudioRecorder._EVENTS
     * @param {*} data - value to be passed to event handler
     */
    _handleEvent(event, data) {
        console.info(event, data);
        if (event === AudioRecorder._EVENTS.ENCOUNTER_ERROR) {
            this._currentState = AudioRecorder._STATES.ERRORED;
            this._onErrorEncountered(data);
            return;
        }
        switch (this._currentState) {
            case AudioRecorder._STATES.PENDING:
                if (event === AudioRecorder._EVENTS.WIDGET_BODY_CLICKED) {
                    this._currentState = AudioRecorder._STATES.REQUSTING_STREAM;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._requestStream();
                    return;
                }
                if (event === AudioRecorder._EVENTS.FILE_EXISTING) {
                    this._currentState = AudioRecorder._STATES.FINISHED_RECORDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._onDataReceived(data);
                }
                break;
            case AudioRecorder._STATES.REQUSTING_STREAM:
                if (event === AudioRecorder._EVENTS.STREAM_RECEIVED) {
                    this._currentState = AudioRecorder._STATES.RECORDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._startRecording(data);
                    return;
                }
                break;
            case AudioRecorder._STATES.RECORDING:
                if (event === AudioRecorder._EVENTS.WIDGET_BODY_CLICKED) {
                    this._currentState = AudioRecorder._STATES.WAITING_FOR_DATA;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._finishRecording();
                    return;
                }
                break;
            case AudioRecorder._STATES.WAITING_FOR_DATA:
                if (event === AudioRecorder._EVENTS.RECORDING_DATA_RECEIVED) {
                    this._currentState = AudioRecorder._STATES.FINISHED_RECORDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._onDataReceived(data);
                    return;
                }
                break;
            case AudioRecorder._STATES.FINISHED_RECORDING:
                if (event === AudioRecorder._EVENTS.RESET_WIDGET) {
                    this._currentState = AudioRecorder._STATES.PENDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._onReset();
                    return;
                }
                if (event === AudioRecorder._EVENTS.PLAYBACK_STARTED) {
                    this._currentState = AudioRecorder._STATES.PLAYING_BACK_RECORDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    return;
                }
                if (event === AudioRecorder._EVENTS.WIDGET_BODY_CLICKED) {
                    this._togglePlayback();
                    return;
                }
                break;
            case AudioRecorder._STATES.PLAYING_BACK_RECORDING:
                if (event === AudioRecorder._EVENTS.WIDGET_BODY_CLICKED) {
                    this._togglePlayback();
                    return;
                }
                if (event === AudioRecorder._EVENTS.PLAYBACK_FINISHED || event === AudioRecorder._EVENTS.PL) {
                    this._currentState = AudioRecorder._STATES.FINISHED_RECORDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    return;
                }
                break;
            case AudioRecorder._STATES.ERRORED:
                if (event === AudioRecorder._EVENTS.WIDGET_BODY_CLICKED) {
                    this._currentState = AudioRecorder._STATES.PENDING;
                    this._setMessage(AudioRecorder._stateToMessage(this._currentState));
                    this._onReset();
                    return;
                }
                break;
            default:
                // left empty on purpose
        }
        console.error(`Event '${event}' is not expected from state '${this._currentState}'`);
    }

    get value() {
        return this.filename;
    }

    set value(value) {
        this.filename = value;
    }

    _onErrorEncountered(message) {
        if (!message) {
            message = 'An error was encountered. \nClick to try again.';
        }
        this._setMessage(message, 'error');
    }

    _requestStream() {
        if (this._mediaRecorderInstance !== null) {
            console.error('Expected mediaRecorderInstance to be null here.');
            return;
        }
        navigator.mediaDevices.getUserMedia(AudioRecorder._MEDIA_DEVICE_CONSTRAINT).then((stream) => {
            this._handleEvent(AudioRecorder._EVENTS.STREAM_RECEIVED, stream);
        }).catch((err) => {
            console.error(err.name, err.message);
            switch (err.name) {
                case 'NotAllowedError':
                    this._handleEvent(AudioRecorder._EVENTS.ENCOUNTER_ERROR, 'You must grant access to your microphone for this widget to work. \nClick to try again.' );
                    break;
                case 'NotFoundError':
                    console.log('Falling back to using the FilePicker widget.');
                    this._handleEvent(AudioRecorder._EVENTS.ENCOUNTER_ERROR, 'No microphone was discovered on this device. \nClick to try again, or select a file to upload.');
                    break;
                default:
                    console.log('Falling back to using the FilePicker widget.');
                    this._handleEvent(AudioRecorder._EVENTS.ENCOUNTER_ERROR, 'Something went wrong when attempting to access the microphone. \nClick to try again, or select a file to upload.' );
                    break;
            }
        });
    }

    _startRecording(stream) {
        this._initializeAndStartMediaRecorderInstance(stream);
        this._visualizeStream(stream);
    }

    _finishRecording() {
        if (this._mediaRecorderInstance !== null) {
            this._mediaRecorderInstance.stop();
        } else {
            console.error('Expected mediaRecorderInstance to be defined here.');
        }
    }

    _onDataReceived({dataUri, filename}) {
        this._setResetButtonVisibility(true);
        this.value = filename;
        this.originalInputValue = filename;
        this._audioInstanceEl.src = dataUri;
        this._audioInstanceEl.addEventListener('playing', this._handlePlayackStartedBound);
        this._audioInstanceEl.addEventListener('pause', this._handlePlayackPausedBound);

        this._mediaRecorderInstance = null;
    }

    _togglePlayback() {
        if (this._audioInstanceEl.src === undefined) {
            console.error('Expected audio element src to be defined!');
        }
        if (this._audioInstanceEl.paused) {
            this._audioInstanceEl.play();
        } else {
            this._audioInstanceEl.pause();
            this._audioInstanceEl.currentTime = 0;
        }
    }

    _onReset() {
        this._resetMessageAndVariables();
    }

    /**
     * Display a message in the widget body
     *
     * @param {string} message - message to be displayed
     * @param {string} severity - one of 'info'|'warning'|'error'. Informs how the message is formatted and styles.
     */
    _setMessage(message, severity) {
        let messageTemplate;
        switch (severity) {
            case 'warning':
                messageTemplate = AudioRecorder._buildWarningTemplate(message);
                break;
            case 'error':
                messageTemplate = AudioRecorder._buildErrorTemplate(message);
                break;
            case 'info':
                // fall through to default
            default:
                messageTemplate = AudioRecorder._buildInfoTemplate(message);
                break;
        }
        this._mainButtonEl.innerHTML = messageTemplate;
    }

    disable() {
        this._mainButtonEl.disabled = true;
        this._mainButtonEl.classList.add('disabled');
        this._resetButtonEl.disabled = true;
        this._resetButtonEl.classList.add('disabled');
    }

    enable() {
        this._mainButtonEl.disabled = false;
        this._mainButtonEl.classList.remove('disabled');
        this._resetButtonEl.disabled = false;
        this._resetButtonEl.classList.remove('disabled');

    }

    static _buildInfoTemplate(message) {
        return `<span class="audio-recorder__info-message">${message}</span>`;
    }

    static _buildWarningTemplate(message) {
        return `<span class="audio-recorder__warning-message">${message}</span>`;
    }

    static _buildErrorTemplate(message) {
        return `<span class="audio-recorder__error-message">${message}</span>`;
    }

    /**
     * Returns a message for any state defined in AudioRecorder._STATES, except for ERROR
     *
     * @param {string} state - state to be mapped to a message
     */
    static _stateToMessage(state) {
        return AudioRecorder._MESSAGES[state];
    }

    /**
     * Returns true if the browser supports mediaDevices.getUserMedia, false otherwise
     */
    static _getMediaDevicesSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Returns true if the browser supports the MediaRecorder API, false otherwise
     */
    static _getMediaRecorderSupported() {
        return typeof MediaRecorder !== 'undefined';
    }

    /**
     * Returns a file extension based on the given mimeType
     */
    static _generateFileName(mimeType) {
        const now = new Date();
        let filename = `audio-recording-${now.toISOString().split('.')[0].replace(/:/g, '-')}`;
        if (mimeType) {
            if (mimeType.startsWith('audio/mpeg;')) {
                filename += '.mp3';
            } else if (mimeType.startsWith('audio/webm;')) {
                filename += '.webm';
            } else if (mimeType.startsWith('audio/ogg;')) {
                filename += '.ogg';
            }
        }
        return filename;
    }
}

AudioRecorder._CLASSES = Object.freeze({
    WIDGET: 'audio-recorder',
    MAIN_BUTTON: 'audio-recorder__main-button',
    DOWNLOAD_BUTTON: 'audio-recorder__download-button',
    RESET_BUTTON: 'audio-recorder__reset-button',
    AUDIO: 'audio-recorder__audio'
});

AudioRecorder._WIDGET_TEMPLATE = `
    <div class="widget ${AudioRecorder._CLASSES.WIDGET}">
        <button
            disabled
            type="button"
            class="${AudioRecorder._CLASSES.MAIN_BUTTON} btn">
        </button>
        <audio
            class="${AudioRecorder._CLASSES.AUDIO}"
        </audio>
    </div>
`;

AudioRecorder._MEDIA_DEVICE_CONSTRAINT = Object.freeze({
    audio: true
});

AudioRecorder._STATES = Object.freeze({
    PENDING: 'PENDING',
    REQUSTING_STREAM: 'REQUSTING_STREAM',
    RECORDING: 'RECORDING',
    WAITING_FOR_DATA: 'WAITING_FOR_DATA',
    FINISHED_RECORDING: 'FINISHED_RECORDING',
    PLAYING_BACK_RECORDING: 'PLAYING_BACK_RECORDING',
    ERRORED: 'ERRORED'
});

AudioRecorder._EVENTS = Object.freeze({
    ENCOUNTER_ERROR: 'ENCOUNTER_ERROR',
    STREAM_RECEIVED: 'STREAM_RECEIVED',
    RECORDING_DATA_RECEIVED: 'RECORDING_DATA_RECEIVED',
    WIDGET_BODY_CLICKED: 'WIDGET_BODY_CLICKED',
    RESET_WIDGET: 'RESET_WIDGET',
    PLAYBACK_STARTED: 'PLAYBACK_STARTED',
    PLAYBACK_FINISHED: 'PLAYBACK_FINISHED',
    FILE_EXISTING: 'FILE_EXISTING'
});

AudioRecorder._MESSAGES = Object.freeze({
    [AudioRecorder._STATES.PENDING]: 'Click to start recording...',
    [AudioRecorder._STATES.REQUSTING_STREAM]: 'Looking for microphone...',
    [AudioRecorder._STATES.RECORDING]: 'Recording...',
    [AudioRecorder._STATES.WAITING_FOR_DATA]: 'Saving recording...',
    [AudioRecorder._STATES.FINISHED_RECORDING]: 'Recording saved. Click to play it back.',
    [AudioRecorder._STATES.PLAYING_BACK_RECORDING]: 'Playing back recording...'
});

export default AudioRecorder;
