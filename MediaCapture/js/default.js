// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
	"use strict";

	var app = WinJS.Application;
	var activation = Windows.ApplicationModel.Activation;

	var oMediaCapture;
	var profile;
	var captureInitSettings;
	var deviceList = new Array();
	var recordState = false;
	var storageFile;



	function errorHandler(e) {
	    sdkSample.displayStatus(e.message + ", Error Code: " + e.code.toString(16));
	}



    // Begin initialization.
	function initialization(eventInfo) {
	    document.getElementById("message").innerHTML = "Initialization started.";
	    enumerateCameras();
	}


    // Identify available cameras.
	function enumerateCameras() {
	    var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
	    deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture).then(function (devices) {
	        // Add the devices to deviceList
	        if (devices.length > 0) {

	            for (var i = 0; i < devices.length; i++) {
	                deviceList.push(devices[i]);
	            }

	            initCaptureSettings();
	            initMediaCapture();
	            document.getElementById("message").innerHTML = "Initialization complete.";

	        } else {
	            sdkSample.displayError("No camera device is found ");
	        }
	    }, errorHandler);
	}


    // Initialize the MediaCaptureInitialzationSettings.
	function initCaptureSettings() {
	    captureInitSettings = null;
	    captureInitSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
	    captureInitSettings.audioDeviceId = "";
	    captureInitSettings.videoDeviceId = "";
	    captureInitSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audioAndVideo;
	    captureInitSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;
	    if (deviceList.length > 0)
	        captureInitSettings.videoDeviceId = deviceList[0].id;
	}


    // Create a profile.
	function createProfile() {
	    profile = Windows.Media.MediaProperties.MediaEncodingProfile.createMp4(
            Windows.Media.MediaProperties.VideoEncodingQuality.hd720p);
	}

    // Create and initialze the MediaCapture object.
	function initMediaCapture() {
	    oMediaCapture = null;
	    oMediaCapture = new Windows.Media.Capture.MediaCapture();
	    oMediaCapture.initializeAsync(captureInitSettings).then(function (result) {
	        createProfile();
	    }, errorHandler);
	}

    //////////////////////////
    // Start the video capture.
	function startMediaCaptureSession() {
	    Windows.Storage.KnownFolders.videosLibrary.createFileAsync("cameraCapture.mp4", Windows.Storage.CreationCollisionOption.generateUniqueName).then(function (newFile) {
	        storageFile = newFile;
	        oMediaCapture.startRecordToStorageFileAsync(profile, storageFile).then(function (result) {

	        }, errorHandler);
	    });
	}

    // Stop the video capture.
	function stopMediaCaptureSession() {
	    oMediaCapture.stopRecordAsync().then(function (result) {

	    }, errorHandler);
	}


	app.onactivated = function (args) {
		if (args.detail.kind === activation.ActivationKind.launch) {
			if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
				// TODO: This application has been newly launched. Initialize your application here.
			} else {
				// TODO: This application was suspended and then terminated.
				// To create a smooth user experience, restore application state here so that it looks like the app never stopped running.
			}
			args.setPromise(WinJS.UI.processAll());

			var initButton = document.getElementById("initButton");
			initButton.addEventListener("click", initialization, false);

		}
	};

	function cleanupCaptureResources() {
	    var promises = [];

	    if (oMediaCapture) {
	        if (isRecording) {
	            promises.push(oMediaCapture.stopRecordAsync().then(function () {
	                isRecording = false;
	            }));
	        }

	        promises.push(new WinJS.Promise(function (complete) {
	            oMediaCapture.close();
	            oMediaCapture = null;
	            complete();
	        }));
	    }

	    return WinJS.Promise.join(promises).done(null, errorHandler);
	}

	app.oncheckpoint = function (args) {
		// TODO: This application is about to be suspended. Save any state that needs to persist across suspensions here.
		// You might use the WinJS.Application.sessionState object, which is automatically saved and restored across suspension.
	    // If you need to complete an asynchronous operation before your application is suspended, call args.setPromise().
	    args.setPromise(
        cleanupCaptureResources()
        );
	};

	app.start();
})();
