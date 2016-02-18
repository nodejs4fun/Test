// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
	"use strict";
	var Capture = Windows.Media.Capture;
	var DeviceInformation = Windows.Devices.Enumeration.DeviceInformation;
	var DeviceClass = Windows.Devices.Enumeration.DeviceClass;
	var DisplayOrientations = Windows.Graphics.Display.DisplayOrientations;
	var Imaging = Windows.Graphics.Imaging;
	var Media = Windows.Media;

    // Receive notifications about rotation of the device and UI and apply any necessary rotation to the preview stream and UI controls
	var oDisplayInformation = Windows.Graphics.Display.DisplayInformation.getForCurrentView(),
        oDisplayOrientation = DisplayOrientations.portrait;

    // Prevent the screen from sleeping while the camera is running
	var oDisplayRequest = new Windows.System.Display.DisplayRequest();

    // For listening to media property changes
	var oSystemMediaControls = Media.SystemMediaTransportControls.getForCurrentView();

    // MediaCapture and its state variables
	var oMediaCapture = null,
        isInitialized = false,
        isPreviewing = false;

    // Information about the camera device
	var externalCamera = false,
        mirroringPreview = false;

    // Rotation metadata to apply to the preview stream and recorded videos (MF_MT_VIDEO_ROTATION)
    // Reference: http://msdn.microsoft.com/en-us/library/windows/apps/xaml/hh868174.aspx
	var RotationKey = "C380465D-2271-428C-9B83-ECEA3B4A85C1";

	var app = WinJS.Application;
	var activation = Windows.ApplicationModel.Activation;

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
			initButton.addEventListener("click", initButtonClickHandler, false);

			var startButton = document.getElementById("startButton");
			startButton.addEventListener("click", startButtonClickHandler, false);

			var stopButton = document.getElementById("stopButton");
			stopButton.addEventListener("click", stopButtonClickHandler, false);
        }
	};

	app.oncheckpoint = function (args) {
		// TODO: This application is about to be suspended. Save any state that needs to persist across suspensions here.
		// You might use the WinJS.Application.sessionState object, which is automatically saved and restored across suspension.
		// If you need to complete an asynchronous operation before your application is suspended, call args.setPromise().
	};

	function initButtonClickHandler(eventInfo) {
	    // check https://msdn.microsoft.com/en-us/library/windows/apps/xaml/mt203788.aspx
	    var outString = "Initialization button has been clicked";
	    document.getElementById("Output").innerText = outString;
	    initializeCameraAsync();
	}

    /// <summary>
    /// Initializes the MediaCapture, registers events, gets camera device information for mirroring and rotating, starts preview and unlocks the UI
    /// </summary>
    /// <returns></returns>
	function initializeCameraAsync() {
	    console.log("InitializeCameraAsync");

	    // Get available devices for capturing pictures
	    return findCameraDeviceByPanelAsync(Windows.Devices.Enumeration.Panel.back)
        .then(function (camera) {
            if (!camera) {
                console.log("No camera device found!");
                return;
            }
            else
            {
                var outString = "Found camera device";
                document.getElementById("Output").innerText = outString;
            }

            // Figure out where the camera is located
            if (!camera.enclosureLocation || camera.enclosureLocation.panel === Windows.Devices.Enumeration.Panel.unknown) {
                // No information on the location of the camera, assume it's an external camera, not integrated on the device
                externalCamera = true;
            }
            else {
                // Camera is fixed on the device
                externalCamera = false;

                // Only mirror the preview if the camera is on the front panel
                mirroringPreview = (camera.enclosureLocation.panel === Windows.Devices.Enumeration.Panel.front);
            }

            oMediaCapture = new Capture.MediaCapture();

            // Register for a notification when something goes wrong
            oMediaCapture.addEventListener("failed", mediaCapture_failed);

            var settings = new Capture.MediaCaptureInitializationSettings();
            settings.videoDeviceId = camera.id;

            // Initialize media capture and start the preview
            return oMediaCapture.initializeAsync(settings);
        }, function (error) {
            console.log(error.message);
        }).then(function () {
            isInitialized = true;
            return startPreviewAsync();
        }).done();
	}

    /// <summary>
    /// Attempts to find and return a device mounted on the panel specified, and on failure to find one it will return the first device listed
    /// </summary>
    /// <param name="panel">The desired panel on which the returned device should be mounted, if available</param>
    /// <returns></returns>
	function findCameraDeviceByPanelAsync(panel) {
	    var deviceInfo = null;
	    // Get available devices for capturing pictures
	    return DeviceInformation.findAllAsync(DeviceClass.videoCapture)
        .then(function (devices) {
            devices.forEach(function (cameraDeviceInfo) {
                if (cameraDeviceInfo.enclosureLocation != null && cameraDeviceInfo.enclosureLocation.panel === panel) {
                    deviceInfo = cameraDeviceInfo;
                    return;
                }
            });

            // Nothing matched, just return the first
            if (!deviceInfo && devices.length > 0) {
                deviceInfo = devices.getAt(0);
            }

            return deviceInfo;
        });
	}

	function mediaCapture_failed(errorEventArgs) {
	    console.log("MediaCapture_Failed: 0x" + errorEventArgs.code + ": " + errorEventArgs.message);

	    //cleanupCameraAsync().done();
	}

    /// <summary>
    /// Starts the preview and adjusts it for for rotation and mirroring after making a request to keep the screen on
    /// </summary>
	function startPreviewAsync() {
	    // Prevent the device from sleeping while the preview is running
	    oDisplayRequest.requestActive();

	    // Register to listen for media property changes
	    oSystemMediaControls.addEventListener("propertychanged", systemMediaControls_PropertyChanged);

	    // Set the preview source in the UI and mirror it if necessary
	    var previewVidTag = document.getElementById("cameraPreview");
	    if (mirroringPreview) {
	        cameraPreview.style.transform = "scale(-1, 1)";
	    }

	    var previewUrl = URL.createObjectURL(oMediaCapture);
	    previewVidTag.src = previewUrl;
	    previewVidTag.play();

	    previewVidTag.addEventListener("playing", function () {
	        isPreviewing = true;
	        var outString = "Found camera device";
	        document.getElementById("Output").innerText = outString;
	        //setPreviewRotationAsync();
	    });
	}

    /// <summary>
    /// In the event of the app being minimized this method handles media property change events. If the app receives a mute
    /// notification, it is no longer in the foregroud.
    /// </summary>
    /// <param name="args"></param>
	function systemMediaControls_PropertyChanged(args) {
	    // Check to see if the app is being muted. If so, it is being minimized.
	    // Otherwise if it is not initialized, it is being brought into focus.
	    if (args.target.soundLevel === Media.SoundLevel.muted) {
	        //cleanupCameraAsync();
	    }
	    else if (!isInitialized) {
	        initializeCameraAsync();
	    }
	}

    /// <summary>
    /// Gets the current orientation of the UI in relation to the device (when AutoRotationPreferences cannot be honored) and applies a corrective rotation to the preview
    /// </summary>
    /// <returns></returns>
	function setPreviewRotationAsync() {
	    // Only need to update the orientation if the camera is mounted on the device
	    if (externalCamera) {
	        return WinJS.Promise.as();
	    }

	    // Calculate which way and how far to rotate the preview
	    var rotationDegrees = convertDisplayOrientationToDegrees(oDisplayOrientation);

	    // The rotation direction needs to be inverted if the preview is being mirrored
	    if (mirroringPreview) {
	        rotationDegrees = (360 - rotationDegrees) % 360;
	    }

	    // Add rotation metadata to the preview stream to make sure the aspect ratio / dimensions match when rendering and getting preview frames
	    var props = oMediaCapture.videoDeviceController.getMediaStreamProperties(Capture.MediaStreamType.videoPreview);
	    props.properties.insert(RotationKey, rotationDegrees);
	    return oMediaCapture.setEncodingPropertiesAsync(Capture.MediaStreamType.videoPreview, props, null);
	}

    /// <summary>
    /// Cleans up the camera resources (after stopping any video recording and/or preview if necessary) and unregisters from MediaCapture events
    /// </summary>
    /// <returns></returns>
	function cleanupCameraAsync() {
	    console.log("cleanupCameraAsync");

	    var promiseList = {};

	    if (isInitialized) {
	        if (isPreviewing) {
	            // The call to stop the preview is included here for completeness, but can be
	            // safely removed if a call to MediaCapture.close() is being made later,
	            // as the preview will be automatically stopped at that point
	            stopPreview();
	        }

	        isInitialized = false;
	    }

	    // When all our tasks complete, clean up MediaCapture
	    return WinJS.Promise.join(promiseList)
        .then(function () {
            if (oMediaCapture != null) {
                oMediaCapture.removeEventListener("failed", mediaCapture_failed);
                oMediaCapture.close();
                oMediaCapture = null;
            }
        });
	}

	function startButtonClickHandler(eventInfo) {
	    var outString = "start media capture button has been clicked";
	    document.getElementById("Output").innerText = outString;
	}

	function stopButtonClickHandler(eventInfo) {
	    var outString = "stop media capture button has been clicked";
	    document.getElementById("Output").innerText = outString;
	}

	app.start();
})();
