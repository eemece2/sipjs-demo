// sipjs_demos.js
//
// Even though both "Alice" and "Bob" are running on the same computer,
// this demo behaves as if the dialog was an SIP call over a network.

var URL = window.URL || window.webkitURL;

function getCookie(key) {
    var re = new RegExp("(?:(?:^|.*;\s*) ?" + key + "\s*\=\s*([^;]*).*$)|^.*$");
    return document.cookie.replace(re, "$1");

}

// This demo uses unauthenticated users on the "sipjs.onsip.com" demo domain.
// To allow multiple users to run the demo without playing a game of
// chatroulette, we give both callers in the demo a random token and then only
// make calls between users with these token suffixes.
// So, you still might run into a user besides yourself.
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i)
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}
// Each session gets a token that expires 1 day later. This is so we minimize
// the number of users we register for the SIP domain, because SIP hosts
// generally have limits on the number of registered users you may have in total
// or over a period of time.
var token = getCookie('onsipToken');
if (token === '') {
    token = randomString(32, ['0123456789',
                              'abcdefghijklmnopqrstuvwxyz',
                              'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].join(''));
    var d = new Date();
    d.setTime(d.getTime() + 1000*60*60*24); // expires in 1 day
    document.cookie = ('onsipToken=' + token + ';'
                       + 'expires=' + d.toUTCString() + ';');
}
var domain = 'sipjs.onsip.com';
var aliceURI      = 'alice.' + window.token + '@' + domain;
var aliceName     = 'Alice';

var bobURI        = 'bob.' + window.token + '@' + domain;
var bobName       = 'Bob';

// Function: mediaOptions
//   A shortcut function to construct the media options for an SIP session.
//
// Arguments:
//   audio: whether or not to send audio in a SIP WebRTC session
//   audio: whether or not to send audio in a SIP WebRTC session
//   remoteRender: the video tag to render the callee's remote video in. Can be null
//   localRender: the video tag to render the caller's local video in. Can be null
function mediaOptions(audio, video, remoteRender, localRender) {
    return {
        media: {
            constraints: {
                audio: audio,
                video: video
            },
            render: {
                remote: remoteRender,
                local: localRender
            }
        }
    };
}

// Function: createUA
//   creates a user agent with the given arguments plugged into the UA
//   configuration. This is a standard user agent for WebRTC calls.
//   For a user agent for data transfer, see createDataUA
//
// Arguments:
//   callerURI: the URI of the caller, aka, the URI that belongs to this user.
//   displayName: what name we should display the user as
function createUA(callerURI, displayName) {
    var configuration = {
        traceSip: true,
        uri: callerURI,
        displayName: displayName
    };
    var userAgent = new SIP.UA(configuration);
    return userAgent;
}

// Function: makeCall
//   Makes a call from a user agent to a target URI
//
// Arguments:
//   userAgent: the user agent to make the call from
//   target: the URI to call
//   audio: whether or not to send audio in a SIP WebRTC session
//   audio: whether or not to send audio in a SIP WebRTC session
//   remoteRender: the video tag to render the callee's remote video in. Can be null
//   localRender: the video tag to render the caller's local video in. Can be null
function makeCall(userAgent, target, audio, video, remoteRender, localRender) {
    var options = mediaOptions(audio, video, remoteRender, localRender);
    // makes the call
    var session = userAgent.invite('sip:' + target, options);
    return session;
}

// Function: setUpVideoInterface
//   Sets up the button for a user to manage calling and hanging up
//
// Arguments:
//   userAgent: the user agent the button is associated with
//   target: the target URI that the button calls and hangs up on
//   remoteRenderId: the video tag to render the callee's remote video in.
//                   Can be null
//   buttonId: the id of the button to set up
function setUpVideoInterface(userAgent, target, remoteRenderId, buttonId) {
    // true if the button should initiate a call,
    // false if the button should end a call
    var onCall = false;
    var session;
    var remoteRender = document.getElementById(remoteRenderId);
    var button = document.getElementById(buttonId);

    // Handling invitations to calls.
    // We automatically accept invitations and toggle the button state based on
    // whether we are in a call our not.
    // Also, for each new call session, we need to add an event handler to set
    // the correct button state when we receive a "bye" request.
    userAgent.on('invite', function (incomingSession) {
        onCall = true;
        session = incomingSession;
        var options = mediaOptions(false, true, remoteRender, null);
        button.firstChild.nodeValue = 'hang up';
        remoteRender.style.visibility = 'visible';
        session.accept(options);
        session.on('bye', function () {
            onCall = false;
            button.firstChild.nodeValue = 'video';
            remoteRender.style.visibility = 'hidden';
            session = null;
        });
    });
    // The button either makes a call, creating a session and binding a listener
    // for the "bye" request, or it hangs up a current call.
    button.addEventListener('click', function () {
        // Was on a call, so the button press means we are hanging up
        if (onCall) {
            onCall = false;
            button.firstChild.nodeValue = 'video';
            remoteRender.style.visibility = 'hidden';
            session.bye();
            session = null;
        }
        // Was not on a call, so the button press means we are ringing someone
        else {
            onCall = true;
            button.firstChild.nodeValue = 'hang up';
            remoteRender.style.visibility = 'visible';
            session = makeCall(userAgent, target,
                               false, true,
                               remoteRender, null);
            session.on('bye', function () {
                onCall = false;
                button.firstChild.nodeValue = 'video';
                remoteRender.style.visibility = 'hidden';
                session = null;
            });
        }
    });
}


// Function: createMsgTag
//   creates the HTML tag and its children for a given message.
//
// Arguments:
//   from: the display name of who the message came from
//   msgBody: the actual body content of the message
function createMsgTag(from, msgBody) {
    var msgTag = document.createElement('p');
    msgTag.className = 'message';
    // Create the "from" section
    var fromTag = document.createElement('span');
    fromTag.className = 'message-from';
    fromTag.appendChild(document.createTextNode(from + ':'));
    // Create the message body
    var msgBodyTag = document.createElement('span');
    msgBodyTag.className = 'message-body';
    msgBodyTag.appendChild(document.createTextNode(' ' + msgBody));
    // Put everything in the message tag
    msgTag.appendChild(fromTag);
    msgTag.appendChild(msgBodyTag);
    return msgTag;
}


// Function: createDataUA
//   Creates a user agent with the given parameters. This user agent is only for
//   sending data, so it has a special media handler factory for the
//   RTCDataChannel.
//
// Arguments:
//   callerURI: the URI of the caller, aka, the URI that belongs to this user.
//   displayName: what name we should display the user as
function createDataUA(callerURI, displayName) {
    var dataURI = 'data.' + callerURI;
    var configuration = {
        traceSip: true,
        uri: dataURI,
        displayName: displayName,
        /*
         * Custom media handler factories don't have great compatibility with
         * our WebRTC function caching (like SIP.WebRTC.RTCPeerConnection)
         */
        mediaHandlerFactory: function mediaHandlerFactory(session, options) {
            // Call this so that we define
            // - WebRTC.MediaStream
            // - WebRTC.getUserMedia
            // - WebRTC.RTCPeerConnection
            // - WebRTC.RTCSessionDescription.
            SIP.WebRTC.isSupported();
            /* Like a default mediaHandler, but no streams to manage */
            var self = new SIP.WebRTC.MediaHandler(session, {
                mediaStreamManager: {
                    acquire: function (mediaHint) {
                        return SIP.Utils.Promise.resolve([]);
                    },
                    release: function (stream) {
                        // no-op
                    }
                }
            });

            return self;
        }
    };

    return new SIP.UA(configuration);
}



(function () {
if (SIP.WebRTC.isSupported()) {
    // Now we do SIP.js stuff
    window.aliceUA = createUA(aliceURI, aliceName);
    window.bobUA   = createUA(bobURI, bobName);
    window.aliceDataUA = createDataUA(aliceURI, aliceName);
    window.bobDataUA = createDataUA(bobURI, bobName);

    // We want to only run the demo if all users for the demo can register
    var numToRegister = 4;
    var numRegistered = 0;
    var registrationFailed = false;
    var markAsRegistered = function () {
        numRegistered += 1;
        if (numRegistered >= numToRegister && !registrationFailed) {
            setupInterfaces();
        }
    };
    var failRegistration = function () {
        registrationFailed = true;
        failInterfaceSetup();
    };
    // We don't want to proceed until we've registered all users.
    // For each registered user, increase the counter.
    aliceUA.on('registered', markAsRegistered);
    bobUA.on('registered', markAsRegistered);
    aliceDataUA.on('registered', markAsRegistered);
    bobDataUA.on('registered', markAsRegistered);
    // If any registration fails, then we need to disable the app and tell the
    // user that we could not register them.
    aliceUA.on('registrationFailed', failRegistration);
    bobUA.on('registrationFailed', failRegistration);

    // Unregister the user agents and terminate all active sessions when the
    // window closes or when we navigate away from the page
    window.onunload = function () {
        aliceUA.stop();
        bobUA.stop();
    };

    // Only run the demo if we could register every user agent
    function setupInterfaces() {
        setUpVideoInterface(aliceUA, bobURI, 'video-of-bob', 'alice-video-button');
        setUpVideoInterface(bobUA, aliceURI, 'video-of-alice', 'bob-video-button');
    }
    function failInterfaceSetup() {
        alert('Max registration limit hit. Could not register all user agents, so they cannot communicate. The app is disabled.');
    }
}
})();
